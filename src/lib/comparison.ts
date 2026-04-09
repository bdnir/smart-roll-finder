import { supabase } from "@/integrations/supabase/client";
import { ComparisonResult, ProductVariant, BoundingBox } from "@/types/comparison";

const UNIT_MAP: Record<string, string> = {
  g: "גרם", gr: "גרם", gram: "גרם", grams: "גרם", "גרם": "גרם",
  ml: 'מ"ל', "מ\"ל": 'מ"ל', "מ''ל": 'מ"ל',
  liter: "ליטר", liters: "ליטר", l: "ליטר", "ליטר": "ליטר",
  kg: 'ק"ג', "ק\"ג": 'ק"ג',
  unit: "יחידות", units: "יחידות", "יחידות": "יחידות",
};

function normalizeUnit(raw: string | null | undefined): string {
  if (!raw) return "גרם";
  const key = raw.trim().toLowerCase();
  return UNIT_MAP[key] || raw;
}

function toBaseWeight(weight: number, unit: string): number {
  if (unit === "ליטר") return weight * 1000;
  if (unit === 'ק"ג') return weight * 1000;
  return weight;
}

function unitLabel(unit: string): string {
  if (unit === "ליטר" || unit === 'מ"ל') return 'מ"ל';
  if (unit === 'ק"ג' || unit === "גרם") return "גרם";
  return unit;
}

/** Crop a region from a base64 image using canvas */
function cropImage(imageDataUrl: string, bbox: BoundingBox): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const sx = (bbox.x / 100) * img.width;
      const sy = (bbox.y / 100) * img.height;
      const sw = (bbox.w / 100) * img.width;
      const sh = (bbox.h / 100) * img.height;
      canvas.width = Math.max(1, Math.round(sw));
      canvas.height = Math.max(1, Math.round(sh));
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas context unavailable")); return; }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => reject(new Error("Failed to load image for cropping"));
    img.src = imageDataUrl;
  });
}

export async function analyzeComparison(imageBase64: string): Promise<ComparisonResult> {
  const { data, error } = await supabase.functions.invoke("analyze-comparison", {
    body: { image: imageBase64 },
  });

  if (error) {
    console.error("Comparison analysis error:", error);
    throw new Error("שגיאה בניתוח התמונה. נסה שוב.");
  }

  const raw = data as { category: string | null; variants: any[] };

  const variants: ProductVariant[] = (raw.variants || []).map((v: any) => {
    const unit = normalizeUnit(v.unit);
    const weight = v.weight ?? null;
    const price = v.price ?? null;
    const baseWeight = weight != null ? toBaseWeight(weight, unit) : null;
    const pricePer100 =
      price != null && baseWeight != null && baseWeight > 0
        ? (price / baseWeight) * 100
        : null;

    return {
      id: crypto.randomUUID(),
      brandName: v.brandName ?? null,
      productName: v.productName ?? null,
      characteristics: v.characteristics ?? null,
      weight, unit, price, pricePer100,
      bbox: v.bbox ?? null,
    };
  });

  // Crop images client-side
  const variantsWithImages = await Promise.all(
    variants.map(async (v) => {
      if (v.bbox) {
        try {
          const cropped = await cropImage(imageBase64, v.bbox);
          return { ...v, croppedImage: cropped };
        } catch (e) {
          console.warn("Failed to crop image for variant:", v.brandName, e);
        }
      }
      return v;
    })
  );

  return {
    category: raw.category,
    variants: rankVariants(variantsWithImages),
    sourceImage: imageBase64,
  };
}

export function rankVariants(variants: ProductVariant[]): ProductVariant[] {
  const withPrice = variants.filter((v) => v.pricePer100 != null);
  const without = variants.filter((v) => v.pricePer100 == null);

  if (withPrice.length === 0) return variants;

  const sorted = [...withPrice].sort((a, b) => a.pricePer100! - b.pricePer100!);
  const min = sorted[0].pricePer100!;
  const max = sorted[sorted.length - 1].pricePer100!;
  const range = max - min;

  const ranked = sorted.map((v) => {
    let rank: "best" | "mid" | "worst";
    if (range === 0) {
      rank = "best";
    } else {
      const ratio = (v.pricePer100! - min) / range;
      rank = ratio <= 0.33 ? "best" : ratio <= 0.66 ? "mid" : "worst";
    }
    return { ...v, rank };
  });

  return [...ranked, ...without];
}

export function getUnitLabel(unit: string): string {
  return unitLabel(unit);
}
