import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, X, RefreshCw, Check, AlertCircle, FlipHorizontal } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string, file: File) => void;
  title?: string;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Capture Packaging Label Photo',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Stop camera tracks
  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Check available camera devices
  useEffect(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoDevices = devices.filter((d) => d.kind === 'videoinput');
          setHasMultipleCameras(videoDevices.length > 1);
        })
        .catch(() => {});
    }
  }, []);

  // Initialize camera stream
  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setCameraError(null);
    stopTracks();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API (getUserMedia) is not supported in this browser or environment.');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsLoading(false);
    } catch (err) {
      console.warn('Camera stream error:', err);
      // Try fallback to any available camera constraint
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play();
        }
        setIsLoading(false);
      } catch (fallbackErr: any) {
        setIsLoading(false);
        setCameraError(
          fallbackErr?.message ||
            'Could not access camera. Please check your browser permissions or use the file upload option.'
        );
      }
    }
  }, [facingMode, stopTracks]);

  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    }
    return () => {
      stopTracks();
    };
  }, [isOpen, capturedImage, startCamera, stopTracks]);

  // Handle shutter snap
  const handleSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(dataUrl);
    stopTracks();
  };

  // Convert base64 data URL to File object
  const handleConfirm = () => {
    if (!capturedImage) return;

    // Convert dataURL to Blob and File
    const arr = capturedImage.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    const filename = 'camera_scan_' + Date.now() + '.jpg';
    const file = new File([blob], filename, { type: mime });

    onCapture(capturedImage, file);
    handleClose();
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleClose = () => {
    stopTracks();
    setCapturedImage(null);
    setCameraError(null);
    onClose();
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-ink-900 border border-ink-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-800 bg-ink-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary-500/20 text-primary-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">{title}</h3>
              <p className="text-[11px] text-ink-400">Align statutory label text clearly inside frame</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-ink-400 hover:text-white hover:bg-ink-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Preview Body */}
        <div className="relative flex-1 bg-black min-h-[340px] sm:min-h-[420px] flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center max-w-md space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">Camera Access Error</h4>
              <p className="text-xs text-ink-400 leading-relaxed">{cameraError}</p>
              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  onClick={startCamera}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-ink-800 text-white hover:bg-ink-700 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Try Again
                </button>
                <button
                  onClick={handleClose}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 text-white hover:bg-primary-500 transition-colors"
                >
                  Use File Upload Instead
                </button>
              </div>
            </div>
          ) : capturedImage ? (
            /* Frozen Snapshot View */
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedImage}
                alt="Captured packaging label"
                className="max-h-[500px] w-auto max-w-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-emerald-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1">
                <Check className="w-3 h-3" /> Photo Captured
              </div>
            </div>
          ) : (
            /* Live Stream View */
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full max-h-[500px] object-cover sm:object-contain"
              />

              {/* Viewfinder Target Guidelines */}
              <div className="absolute inset-6 sm:inset-10 border-2 border-dashed border-white/40 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-t-3 border-l-3 border-primary-400 rounded-tl-sm" />
                  <div className="w-6 h-6 border-t-3 border-r-3 border-primary-400 rounded-tr-sm" />
                </div>
                <div className="text-center">
                  <span className="text-[11px] font-semibold tracking-wide bg-black/60 text-white/90 px-3 py-1 rounded-full backdrop-blur-xs">
                    Hold label steady & avoid direct flash glare
                  </span>
                </div>
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-b-3 border-l-3 border-primary-400 rounded-bl-sm" />
                  <div className="w-6 h-6 border-b-3 border-r-3 border-primary-400 rounded-br-sm" />
                </div>
              </div>

              {isLoading && (
                <div className="absolute inset-0 bg-ink-950/80 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="w-6 h-6 text-primary-400 animate-spin" />
                    <span className="text-xs text-ink-300">Starting camera preview...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-ink-800 bg-ink-900/95 flex items-center justify-between gap-3">
          {capturedImage ? (
            <>
              <button
                onClick={handleRetake}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-ink-800 text-ink-200 hover:bg-ink-700 hover:text-white transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retake Photo
              </button>
              <button
                onClick={handleConfirm}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-primary-600 text-white hover:bg-primary-500 shadow-md transition-colors"
              >
                <Check className="w-4 h-4" />
                Use Photo for Inspection
              </button>
            </>
          ) : (
            <>
              {hasMultipleCameras ? (
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-ink-800 text-ink-300 hover:text-white hover:bg-ink-700 transition-colors"
                  title="Switch between front and rear camera"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  <span>Switch Camera</span>
                </button>
              ) : (
                <div className="text-[11px] text-ink-500">Live Device Camera</div>
              )}

              <button
                type="button"
                onClick={handleSnap}
                disabled={isLoading || !!cameraError}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold bg-primary-600 hover:bg-primary-500 active:scale-95 text-white shadow-lg shadow-primary-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
              >
                <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                <span>Capture Label</span>
              </button>

              <button
                onClick={handleClose}
                className="px-3 py-2 rounded-xl text-xs font-medium text-ink-400 hover:text-ink-200 transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
export default CameraCaptureModal;
