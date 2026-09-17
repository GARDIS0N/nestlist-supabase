import { supabase } from './supabase';

const BUCKET = 'property-images';

// Compress image before upload
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      let [w, h] = [img.width, img.height];
      if (w > 1200) { h = Math.round(h * 1200 / w); w = 1200; }
      if (h > 900)  { w = Math.round(w * 900 / h);  h = 900;  }
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => resolve(blob!),
        'image/jpeg',
        0.78
      );
    };
    img.src = URL.createObjectURL(file);
  });
}

// Upload a listing photo
export async function uploadListingPhoto(
  file: File,
  propertyId: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  // Validate file
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File too large. Maximum size is 5MB.');
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed.');
  }

  // Compress
  if (onProgress) onProgress(10);
  const compressed = await compressImage(file);
  if (onProgress) onProgress(30);

  // Get active session for landlord_id
  const { data: { session } } = await supabase.auth.getSession();
  const landlordId = session?.user?.id || 'unknown';
  const timestamp = Date.now();
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filename = `${landlordId}/${propertyId}/${timestamp}-${cleanFileName}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, compressed, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) {
    throw new Error('Upload failed: ' + error.message);
  }

  if (onProgress) onProgress(90);

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(data.path);

  if (onProgress) onProgress(100);

  return urlData.publicUrl;
}

// Auto-crop to square (centered) and resize to max 512x512px
export async function cropAndResizeAvatar(file: File): Promise<{ blob: Blob; contentType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not initialize image processing canvas'));
        return;
      }

      // Calculate center square crop
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;

      // Max size: 512x512
      const targetSize = Math.min(512, minDim);
      canvas.width = targetSize;
      canvas.height = targetSize;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw centered cropped square
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

      const mimeType = file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, contentType: mimeType });
          } else {
            reject(new Error('Failed to process avatar image'));
          }
        },
        mimeType,
        0.88
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image file. Please upload a valid image.'));
    };
    img.src = objectUrl;
  });
}

// Upload profile avatar
export async function uploadAvatar(
  file: File,
  userId: string
): Promise<string> {
  // 1. Validate max size 2MB
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Avatar file size exceeds 2MB limit. Please choose a smaller image.');
  }

  // 2. Validate allowed MIME types
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file format. Only JPG, PNG, and WebP images are supported.');
  }

  // 3. Ensure active session or valid auth state
  const { data: sessionData } = await supabase.auth.getSession();
  const effectiveUserId = userId || sessionData?.session?.user?.id;
  if (!effectiveUserId) {
    throw new Error('Authentication session required. Please sign in again to update your avatar.');
  }

  const { blob, contentType } = await cropAndResizeAvatar(file);
  
  // Extension mapping
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const timestamp = Date.now();
  const filename = `${effectiveUserId}/${timestamp}.${ext}`;

  const AVATAR_BUCKET = 'avatars';
  const FALLBACK_BUCKET = 'property-images';

  try {
    // Primary upload attempt to 'avatars' bucket
    const { error: primaryError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(filename, blob, {
        contentType: contentType,
        upsert: true,
      });

    if (!primaryError) {
      const { data: urlData } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(filename);
      return urlData.publicUrl;
    }

    // If primary failed due to missing bucket or network/fetch error, try fallback bucket
    const isBucketOrNetworkError = primaryError.message?.toLowerCase().includes('failed to fetch') ||
      primaryError.message?.toLowerCase().includes('bucket not found') ||
      primaryError.message?.toLowerCase().includes('does not exist');

    if (isBucketOrNetworkError) {
      console.warn(`Primary avatar bucket '${AVATAR_BUCKET}' failed (${primaryError.message}). Attempting fallback to '${FALLBACK_BUCKET}'...`);
      
      const fallbackFilename = `avatars/${effectiveUserId}/${timestamp}.${ext}`;
      const { error: fallbackError } = await supabase.storage
        .from(FALLBACK_BUCKET)
        .upload(fallbackFilename, blob, {
          contentType: contentType,
          upsert: true,
        });

      if (!fallbackError) {
        const { data: fallbackUrlData } = supabase.storage
          .from(FALLBACK_BUCKET)
          .getPublicUrl(fallbackFilename);
        return fallbackUrlData.publicUrl;
      }
    }

    // If both failed or specific error returned
    const errorMsg = primaryError.message || 'Unknown storage error';
    if (errorMsg.toLowerCase().includes('failed to fetch')) {
      throw new Error(
        "Could not connect to Supabase Storage. The 'avatars' bucket may not exist in your Supabase project yet, or storage CORS/policies need to be applied in the Supabase SQL editor."
      );
    }
    throw new Error(`Avatar upload failed: ${errorMsg}`);
  } catch (err: any) {
    if (err.message && err.message.toLowerCase().includes('failed to fetch')) {
      throw new Error(
        "Could not connect to Supabase Storage. The 'avatars' storage bucket may not exist in your Supabase project yet. Please create the 'avatars' bucket in Supabase or run the migration SQL."
      );
    }
    throw err;
  }
}

// Delete a listing photo by URL
export async function deleteListingPhoto(
  photoUrl: string
): Promise<void> {
  // Extract path from URL - handle both potential bucket names
  const bucketName = photoUrl.includes('/property-images/') ? 'property-images' : 'nestlist-images';
  const urlParts = photoUrl.split(`/${bucketName}/`);
  if (urlParts.length < 2) return;
  const path = urlParts[1];

  const { error } = await supabase.storage
    .from(bucketName)
    .remove([path]);

  if (error) {
    console.error('Failed to delete photo:', error.message);
  }
}

// Delete all photos for a listing
export async function deleteAllListingPhotos(
  propertyId: string,
  landlordId?: string
): Promise<void> {
  let lId = landlordId;
  if (!lId) {
    const { data: { session } } = await supabase.auth.getSession();
    lId = session?.user?.id;
  }

  const prefixes: string[] = [];
  if (lId) prefixes.push(`${lId}/${propertyId}`);
  prefixes.push(`listings/${propertyId}`);

  for (const prefix of prefixes) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix);

    if (!error && data && data.length > 0) {
      const paths = data.map(f => `${prefix}/${f.name}`);
      await supabase.storage.from(BUCKET).remove(paths);
    }
  }
}

// Get public URL for a stored path
export function getPublicUrl(path: string): string {
  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}
