import base64
import io
import os
import sys
import time
from typing import Optional, List

import cv2
import numpy as np
import urllib.request
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rapidocr_onnxruntime import RapidOCR
from PIL import Image

app = FastAPI(
    title="LabelGuard AI - PaddleOCR Service",
    description="High-Accuracy Deep Learning OCR Engine (PP-OCRv4 DBNet + SVTR)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("[*] Initializing PaddleOCR (PP-OCRv4 ONNX Engine)...")
t0 = time.time()
ocr_engine = RapidOCR()
print(f"[+] PaddleOCR Engine ready in {time.time() - t0:.2f}s")


class ImagePayload(BaseModel):
    image: Optional[str] = None  # Base64 string or data URI
    image_path: Optional[str] = None  # Direct file path on disk
    url: Optional[str] = None  # Remote or public HTTP/HTTPS URL


class BoundingBox(BaseModel):
    x0: int
    y0: int
    x1: int
    y1: int


class OcrWord(BaseModel):
    text: str
    confidence: float
    bbox: BoundingBox


class OcrResponse(BaseModel):
    text: str
    confidence: float
    words: List[OcrWord]
    engine: str = "PaddleOCR PP-OCRv4 (Deep Learning)"
    elapsed_ms: float


def decode_image_bytes(data: bytes) -> np.ndarray:
    img_array = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    if img is None:
        pil_img = Image.open(io.BytesIO(data)).convert("RGB")
        img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    return img


def transform_point(x: float, y: float, deg: int, H: int, W: int):
    if deg == 0:
        return int(x), int(y)
    elif deg == 90:
        return int(y), int(H - 1 - x)
    elif deg == 180:
        return int(W - 1 - x), int(H - 1 - y)
    elif deg == 270:
        return int(W - 1 - y), int(x)
    return int(x), int(y)


def run_smart_multi_orientation_ocr(img: np.ndarray):
    H, W = img.shape[:2]
    rotations = [
        (0, None),
        (270, cv2.ROTATE_90_COUNTERCLOCKWISE),
        (90, cv2.ROTATE_90_CLOCKWISE),
        (180, cv2.ROTATE_180),
    ]

    candidates = []
    for deg, flag in rotations:
        r_img = img if flag is None else cv2.rotate(img, flag)
        res, _ = ocr_engine(r_img)
        if not res:
            continue
        total_len = sum(len(str(x[1]).strip()) for x in res)
        candidates.append((total_len, deg, res))

    if not candidates:
        return []

    # Sort so that orientation with highest total text length/density is primary
    candidates.sort(key=lambda c: c[0], reverse=True)

    seen_clean = set()
    merged_items = []

    for _, deg, res in candidates:
        for box, text, score in res:
            text = str(text).strip()
            if not text:
                continue
            clean = "".join(c for c in text if c.isalnum()).lower()
            if len(clean) < 2:
                continue

            if any(clean in sc for sc in seen_clean):
                continue
            seen_clean.add(clean)

            orig_box = [transform_point(pt[0], pt[1], deg, H, W) for pt in box]
            merged_items.append((orig_box, text, score))

    return merged_items


def process_ocr_result(raw_result, elapsed_ms: float) -> OcrResponse:
    if not raw_result:
        return OcrResponse(text="", confidence=0.0, words=[], elapsed_ms=elapsed_ms)

    lines: List[str] = []
    words: List[OcrWord] = []
    conf_scores: List[float] = []

    for item in raw_result:
        box, text, score = item
        text = str(text).strip()
        if not text:
            continue

        conf_100 = round(float(score) * 100, 1)
        conf_scores.append(conf_100)
        lines.append(text)

        xs = [int(pt[0]) for pt in box]
        ys = [int(pt[1]) for pt in box]
        x0, x1 = min(xs), max(xs)
        y0, y1 = min(ys), max(ys)

        token_list = text.split()
        if not token_list:
            continue
        token_width = max(1, (x1 - x0) // len(token_list))
        for idx, tok in enumerate(token_list):
            wx0 = x0 + idx * token_width
            wx1 = min(x1, wx0 + token_width)
            words.append(
                OcrWord(
                    text=tok,
                    confidence=conf_100,
                    bbox=BoundingBox(x0=wx0, y0=y0, x1=wx1, y1=y1)
                )
            )

    full_text = "\n".join(lines)
    avg_conf = round(sum(conf_scores) / len(conf_scores), 1) if conf_scores else 0.0

    return OcrResponse(
        text=full_text,
        confidence=avg_conf,
        words=words,
        elapsed_ms=round(elapsed_ms, 1)
    )


@app.get("/health")
def health():
    return {
        "status": "ok",
        "ready": True,
        "engine": "PaddleOCR PP-OCRv4 (DBNet + SVTR)",
        "backend": "ONNX Runtime",
        "device": "CPU"
    }


@app.post("/api/ocr", response_model=OcrResponse)
async def recognize_upload(file: UploadFile = File(...)):
    t0 = time.time()
    try:
        content = await file.read()
        img = decode_image_bytes(content)
        result = run_smart_multi_orientation_ocr(img)
        elapsed = (time.time() - t0) * 1000
        return process_ocr_result(result, elapsed)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")


@app.post("/api/ocr/base64", response_model=OcrResponse)
def recognize_base64(payload: ImagePayload):
    t0 = time.time()
    try:
        # 1. Direct local file path
        if payload.image_path:
            if not os.path.exists(payload.image_path):
                raise HTTPException(status_code=404, detail=f"File not found: {payload.image_path}")
            img = cv2.imread(payload.image_path)
            if img is None:
                raise HTTPException(status_code=400, detail=f"Could not read image file: {payload.image_path}")
            result = run_smart_multi_orientation_ocr(img)
            elapsed = (time.time() - t0) * 1000
            return process_ocr_result(result, elapsed)

        # 2. Remote HTTP/HTTPS URL or direct image string starting with http
        target_url = payload.url or (payload.image if payload.image and payload.image.startswith(('http://', 'https://')) else None)
        if target_url:
            req = urllib.request.Request(
                target_url,
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            )
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = resp.read()
            img = decode_image_bytes(data)
            result = run_smart_multi_orientation_ocr(img)
            elapsed = (time.time() - t0) * 1000
            return process_ocr_result(result, elapsed)

        # 3. Base64 encoded string or Data URI
        if payload.image:
            raw_b64 = payload.image
            if "," in raw_b64:
                raw_b64 = raw_b64.split(",", 1)[1]
            img_bytes = base64.b64decode(raw_b64)
            img = decode_image_bytes(img_bytes)
            result = run_smart_multi_orientation_ocr(img)
            elapsed = (time.time() - t0) * 1000
            return process_ocr_result(result, elapsed)

        raise HTTPException(status_code=400, detail="Either 'image', 'url', or 'image_path' required.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    print("[+] Starting LabelGuard PaddleOCR Service on http://127.0.0.1:8000 ...")
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
