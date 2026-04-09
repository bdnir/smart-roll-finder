import { supabase } from "@/integrations/supabase/client";
import { ComparisonResult, ProductVariant } from "@/types/comparison";

const UNIT_MAP: Record<string, string> = {
  g: "גרם",
  gr: "גרם",
  gram: "גרם",
  grams: "גרם",
  "גרם": "גרם",
  ml: 'מ"ל',
  "מ\"ל": 'מ"ל',
  "מ''ל": 'מ"ל',
  liter: "ליטר",
  liters: "ליטר",
  l: "ליטר",
  "ליטר": "ליטר",
  kg: 'ק"ג',
  "ק\"ג": 'ק"ג',
  unit: "יחידות",
  units: "יחידות",
  "יחידות": "יחידות",
};

function normalizeUnit(raw: string | null | undefined): string {
  if (!raw) return "גרם";
  const key = raw.trim().toLowerCase();
  return UNIT_MAP[key] || raw;
}

/** Convert weight to base unit (g or ml) for fair comparison */
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
      weight,
      unit,
      price,
      pricePer100,
    };
  });

  return { category: raw.category, variants: rankVariants(variants) };
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
