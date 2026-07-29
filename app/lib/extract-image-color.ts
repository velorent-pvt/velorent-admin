/**
 * Extracts the dominant background color and accent color from an image File.
 * Uses the browser Canvas 2D API — no external dependencies required.
 *
 * Returns:
 *   bgColor    – a very light tint of the dominant hue (suitable for card backgrounds)
 *   accentColor – the dominant saturated hue (suitable for text, badges, and CTAs)
 */

interface ExtractedColors {
  bgColor: string;
  accentColor: string;
}

/** Convert RGB → HSL (all values 0–1) */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [h, s, l];
}

/** Format HSL values as a CSS hsl() string */
function hsl(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

/**
 * Load a File into an HTMLImageElement (resolves once the image is ready).
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for color extraction"));
    };
    img.src = url;
  });
}

/**
 * Sample a grid of pixels from the image via canvas and return the
 * average R, G, B values (each 0–255).
 */
function sampleAverageColor(
  img: HTMLImageElement,
  gridSize = 20
): [number, number, number] {
  const canvas = document.createElement("canvas");
  canvas.width = gridSize;
  canvas.height = gridSize;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, gridSize, gridSize);

  const { data } = ctx.getImageData(0, 0, gridSize, gridSize);
  let totalR = 0,
    totalG = 0,
    totalB = 0,
    count = 0;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    // Skip fully transparent pixels
    if (alpha < 10) continue;
    totalR += data[i];
    totalG += data[i + 1];
    totalB += data[i + 2];
    count++;
  }

  if (count === 0) return [128, 128, 128]; // fallback: neutral grey
  return [totalR / count, totalG / count, totalB / count];
}

/**
 * Given a File (image), extract two harmonious colors:
 *  - bgColor:     Very light tint (lightness ~92%, saturation ~40%) — for card background
 *  - accentColor: Vivid variant   (lightness ~40%, saturation ~70%) — for text & badges
 *
 * Falls back gracefully if canvas is unavailable.
 */
export async function extractImageColors(
  file: File
): Promise<ExtractedColors> {
  const fallback: ExtractedColors = {
    bgColor: "#EAF1FF",
    accentColor: "#3B82F6",
  };

  try {
    const img = await loadImage(file);
    const [r, g, b] = sampleAverageColor(img);
    const [h, s] = rgbToHsl(r / 255, g / 255, b / 255);

    // Clamp saturation so near-grey images still get a subtle tint
    const clampedS = Math.max(s, 0.25);

    const bgColor = hsl(h, Math.min(clampedS * 0.6, 0.5), 0.93);
    const accentColor = hsl(h, Math.min(clampedS * 1.2, 0.75), 0.38);

    return { bgColor, accentColor };
  } catch (err) {
    console.warn("[extractImageColors] failed:", err);
    return fallback;
  }
}
