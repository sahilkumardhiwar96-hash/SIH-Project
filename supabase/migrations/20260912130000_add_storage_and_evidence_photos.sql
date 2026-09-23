/*
# Image Upload & Evidence Photo Storage

## Overview
Adds real file-upload support (required by the brief's "Image upload and product
scanning functionality" and "Attachment of photographs and supporting evidence"
requirements), which the previous version only implemented as a paste-a-URL field.

## Changes
1. Two public storage buckets:
   - `label-images`   - product/label photos used to run an inspection
   - `evidence-photos` - supporting photographs an inspector attaches to an
     existing inspection (e.g. close-ups of a violation)
2. Storage RLS policies allowing authenticated users to upload/read/delete their
   own uploads (read is public so report links work outside the app).
3. `evidence_artifacts.artifact_type` now also allows `'user_photo'`, so manually
   attached evidence photographs can be stored alongside OCR/font-analysis
   artifacts.
*/

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('label-images', 'label-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence-photos', 'evidence-photos', true)
ON CONFLICT (id) DO NOTHING;

-- ============ STORAGE POLICIES ============
DROP POLICY IF EXISTS "public_read_label_images" ON storage.objects;
CREATE POLICY "public_read_label_images" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'label-images');

DROP POLICY IF EXISTS "auth_upload_label_images" ON storage.objects;
CREATE POLICY "auth_upload_label_images" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'label-images');

DROP POLICY IF EXISTS "auth_delete_label_images" ON storage.objects;
CREATE POLICY "auth_delete_label_images" ON storage.objects FOR DELETE
  TO anon, authenticated USING (bucket_id = 'label-images');

DROP POLICY IF EXISTS "public_read_evidence_photos" ON storage.objects;
CREATE POLICY "public_read_evidence_photos" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'evidence-photos');

DROP POLICY IF EXISTS "auth_upload_evidence_photos" ON storage.objects;
CREATE POLICY "auth_upload_evidence_photos" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'evidence-photos');

DROP POLICY IF EXISTS "auth_delete_evidence_photos" ON storage.objects;
CREATE POLICY "auth_delete_evidence_photos" ON storage.objects FOR DELETE
  TO anon, authenticated USING (bucket_id = 'evidence-photos');

-- ============ EVIDENCE ARTIFACT TYPE ============
ALTER TABLE evidence_artifacts DROP CONSTRAINT IF EXISTS evidence_artifacts_artifact_type_check;
ALTER TABLE evidence_artifacts ADD CONSTRAINT evidence_artifacts_artifact_type_check
  CHECK (artifact_type IN ('ocr_text', 'bounding_box', 'font_analysis', 'image_region', 'color_analysis', 'user_photo'));
