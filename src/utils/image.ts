/**
 * Redimensionne et compresse une image côté client :
 * - Orientation respectée via createImageBitmap(file, { imageOrientation: 'from-image' })
 * - Dimension max : 1280 px
 * - Format cible : WebP (qualité 0.8) avec repli automatique JPEG si non supporté
 * - Cible de taille : ≈150 Ko
 */
export async function compressImage(file: File): Promise<{ blob: Blob; dataUrl: string }> {
  let bitmap: ImageBitmap;

  try {
    // Respect de l'orientation EXIF via createImageBitmap
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Repli de secours si options non supportées
    bitmap = await createImageBitmap(file);
  }

  const { width, height } = bitmap;
  const maxDim = 1280;
  let targetWidth = width;
  let targetHeight = height;

  if (width > maxDim || height > maxDim) {
    if (width > height) {
      targetWidth = maxDim;
      targetHeight = Math.round((height * maxDim) / width);
    } else {
      targetHeight = maxDim;
      targetWidth = Math.round((width * maxDim) / height);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Impossible d’initialiser le contexte Canvas 2D.');
  }

  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  // Test de conversion WebP (qualité 0.8)
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) {
          reject(new Error('Échec de la compression de l’image.'));
          return;
        }

        // Si le navigateur ne produit pas de WebP, conversion repli JPEG
        if (b.type !== 'image/webp') {
          canvas.toBlob(
            (jpegBlob) => {
              if (jpegBlob) resolve(jpegBlob);
              else resolve(b);
            },
            'image/jpeg',
            0.8
          );
        } else {
          resolve(b);
        }
      },
      'image/webp',
      0.8
    );
  });

  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  return { blob, dataUrl };
}
