import { supabase, isLocalMode } from '@/lib/supabase';

export type UploadResult = {
  url: string;
  path: string;
};

/**
 * Uploads a file to a public Supabase Storage bucket and returns its public URL.
 * When running in local/demo mode without Supabase credentials, converts the file
 * to a base64 Data URL so it can be previewed, scanned with PaddleOCR, and
 * saved in localStorage evidence artifacts without any external server.
 */
export async function uploadFile(bucket: 'label-images' | 'evidence-photos', file: File): Promise<UploadResult> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;

  if (isLocalMode) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({ url: reader.result as string, path });
      };
      reader.onerror = () => {
        resolve({ url: URL.createObjectURL(file), path });
      };
      reader.readAsDataURL(file);
    });
  }

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'image/jpeg',
  });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}
