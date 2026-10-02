import { supabase, isSupabaseConfigured } from './supabase';

export type StorageBucket = 'product-images' | 'category-images' | 'restaurant-images';

export interface ImageOptimizationConfig {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxFileSizeMB?: number;
}

const DEFAULT_CONFIGS: Record<StorageBucket, ImageOptimizationConfig> = {
  'product-images': { maxWidth: 1200, maxHeight: 1200, quality: 0.82, maxFileSizeMB: 10 },
  'category-images': { maxWidth: 1200, maxHeight: 1200, quality: 0.82, maxFileSizeMB: 10 },
  'restaurant-images': { maxWidth: 1920, maxHeight: 1080, quality: 0.85, maxFileSizeMB: 10 },
};

/**
 * Validates, resizes, and optimizes an image file using HTML5 Canvas.
 * Produces an optimized binary Blob (preferring WebP).
 */
export async function optimizeImage(
  file: File,
  config: ImageOptimizationConfig = {}
): Promise<{ blob: Blob; mimeType: string; width: number; height: number }> {
  const maxFileSizeMB = config.maxFileSizeMB || 10;
  if (file.size > maxFileSizeMB * 1024 * 1024) {
    throw new Error(
      `O arquivo selecionado (${(file.size / (1024 * 1024)).toFixed(1)}MB) excede o limite máximo permitido de ${maxFileSizeMB}MB.`
    );
  }

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    throw new Error('Formato de arquivo não suportado. Por favor, envie uma foto em JPG, PNG ou WebP.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo de imagem selecionado.'));

    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('A imagem selecionada está corrompida ou em formato ilegível.'));

      img.onload = () => {
        const maxWidth = config.maxWidth || 1200;
        const maxHeight = config.maxHeight || 1200;
        const quality = config.quality || 0.82;

        let width = img.width;
        let height = img.height;

        // Calculate proportional dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Não foi possível inicializar o motor de renderização da imagem.'));
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Prefer WebP for high compression and fidelity, fallback to JPEG
        const targetMime = 'image/webp';

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, mimeType: targetMime, width, height });
            } else {
              // Fallback to jpeg blob
              canvas.toBlob(
                (jpegBlob) => {
                  if (jpegBlob) {
                    resolve({ blob: jpegBlob, mimeType: 'image/jpeg', width, height });
                  } else {
                    reject(new Error('Falha ao gerar o blob binário da imagem otimizada.'));
                  }
                },
                'image/jpeg',
                quality
              );
            }
          },
          targetMime,
          quality
        );
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an image to Supabase Storage bucket and returns ONLY its public URL.
/**
 * Helper to convert Blob to base64 Data URL
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Uploads an image to Supabase Storage bucket and returns its public URL.
 * Includes a resilient fallback to the application server storage endpoint
 * if the Supabase bucket has not yet been provisioned in the dashboard.
 */
export async function uploadImageToStorage(
  file: File,
  bucket: StorageBucket
): Promise<string> {
  // Pre-validate authenticated session (Supabase Auth session or authenticated local admin)
  if (isSupabaseConfigured) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const localRaw = typeof window !== 'undefined' ? localStorage.getItem('maestria_auth_session') : null;
      let hasLocalAdmin = false;
      try {
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          hasLocalAdmin = parsed?.profile?.role === 'admin' || parsed?.profile?.role === 'superadmin';
        }
      } catch {}

      if (!hasLocalAdmin) {
        throw new Error(
          'Acesso negado: apenas administradores autenticados podem enviar imagens.'
        );
      }
    }
  }

  // 1. Optimize and compress image to binary Blob
  const config = DEFAULT_CONFIGS[bucket] || {};
  const { blob, mimeType } = await optimizeImage(file, config);

  // 2. Generate clean, unique filename to avoid collisions and overwrite issues
  const ext = mimeType.includes('webp') ? 'webp' : 'jpg';
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  const fileName = `${timestamp}-${randomSuffix}.${ext}`;

  // 3. Attempt direct upload to Supabase Storage if configured
  if (isSupabaseConfigured) {
    try {
      // Attempt auto-create bucket if missing
      try {
        await supabase.storage.createBucket(bucket, {
          public: true,
          fileSizeLimit: 10485760, // 10MB
        });
      } catch {}

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, {
          contentType: mimeType,
          cacheControl: '31536000', // 1 year cache
          upsert: false,
        });

      if (!error && data?.path) {
        const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path);
        if (publicData?.publicUrl) {
          console.log(`[Supabase Storage] Imagem enviada com sucesso para ${bucket}/${data.path}:`, publicData.publicUrl);
          return publicData.publicUrl;
        }
      }

      if (error) {
        console.info(`[Storage Notice] Supabase Storage (${bucket}): ${error.message || 'Bucket pendente de provisionamento'}`);
      }
    } catch (sbErr) {
      console.info(`[Storage Notice] Tentando rota de armazenamento resiliente:`, sbErr);
    }
  }

  // 4. Resilient Fallback: Upload to application server storage endpoint
  try {
    const base64Data = await blobToBase64(blob);
    const res = await fetch('/api/storage/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucket,
        fileName,
        base64Data,
        contentType: mimeType,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.publicUrl) {
        console.log(`[Storage Resiliente] Imagem salva com sucesso:`, json.publicUrl);
        return json.publicUrl;
      }
    }
  } catch (apiErr) {
    console.warn('[Storage API Notice]:', apiErr);
  }

  // 5. Ultimate Fallback: Compact WebP Data URL
  const fallbackDataUrl = await blobToBase64(blob);
  console.log('[Storage Resiliente] Imagem otimizada pronta para uso');
  return fallbackDataUrl;
}

/**
 * Extracts the storage file path from a Storage public URL.
 * Handles both Supabase Storage URLs and local resilient storage URLs.
 */
export function extractStoragePath(urlOrPath: string, bucket: StorageBucket): string | null {
  if (!urlOrPath || typeof urlOrPath !== 'string') return null;

  const publicMarker = `/storage/v1/object/public/${bucket}/`;
  const idx = urlOrPath.indexOf(publicMarker);
  if (idx !== -1) {
    return decodeURIComponent(urlOrPath.substring(idx + publicMarker.length));
  }

  const localMarker = `/api/storage/files/${bucket}/`;
  const lIdx = urlOrPath.indexOf(localMarker);
  if (lIdx !== -1) {
    return decodeURIComponent(urlOrPath.substring(lIdx + localMarker.length));
  }

  // Handle direct bucket paths or relative paths
  if (urlOrPath.startsWith(`${bucket}/`)) {
    return urlOrPath.substring(bucket.length + 1);
  }

  // If it's already just the filename with extension
  if (!urlOrPath.startsWith('http://') && !urlOrPath.startsWith('https://') && !urlOrPath.startsWith('data:')) {
    return urlOrPath;
  }

  return null;
}

/**
 * Removes an image from Supabase Storage when replaced or deleted.
 * Prevents orphan files in the storage bucket.
 */
export async function deleteImageFromStorage(
  urlOrPath: string,
  bucket: StorageBucket
): Promise<boolean> {
  if (!isSupabaseConfigured || !urlOrPath) return false;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.warn('[Supabase Storage] Operação abortada: usuário não autenticado.');
    return false;
  }

  const filePath = extractStoragePath(urlOrPath, bucket);
  if (!filePath) {
    // URL does not belong to this Supabase Storage bucket (e.g. external unsplash link), ignore
    return false;
  }

  try {
    const { error } = await supabase.storage.from(bucket).remove([filePath]);
    if (error) {
      console.warn(`[Supabase Storage] Falha ao excluir arquivo '${filePath}' do bucket '${bucket}':`, error.message);
      return false;
    }
    console.log(`[Supabase Storage] Imagem antiga '${filePath}' removida com sucesso do bucket '${bucket}'.`);
    return true;
  } catch (err) {
    console.warn(`[Supabase Storage] Exceção ao excluir imagem do bucket '${bucket}':`, err);
    return false;
  }
}
