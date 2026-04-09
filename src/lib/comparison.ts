import { supabase } from "@/integrations/supabase/client";
import { ComparisonResult, ProductVariant } from "@/types/comparison";

export async function analyzeComparison(imageBase64: string): Promise<ComparisonResult> {
  const { data, error } = await supabase.functions.invoke("analyze-comparison", {
    body: { image: imageBase64 },
  });

  if (error) {
    console.error("Comparison analysis error:", error);
    throw new Error("שגיאה בניתוח התמונה. נסה שוב.");
  }

  const raw = data as { category: string | null; variants: any[] };

  const variants: ProductVariant[] = (raw.variants || []).map((v: any, i: number) => ({
    id: crypto.randomUUID(),
    brandName: v.brandName ?? null,
    productName: v.productName ?? null,
    characteristics: v.characteristics ?? null,
    weight: v.weight ?? null,
    price: v.price ?? null,
    pricePer100g:
      v.price != null && v.weight != null && v.weight > 0
        ? (v.price / v.weight) * 100
        : null,
  }));

  return { category: raw.category, variants: rankVariants(variants) };
}

export function rankVariants(variants: ProductVariant[]): ProductVariant[] {
  const withPrice = variants.filter((v) => v.pricePer100g != null);
  const without = variants.filter((v) => v.pricePer100g == null);

  if (withPrice.length === 0) return variants;

  const sorted = [...withPrice].sort((a, b) => a.pricePer100g! - b.pricePer100g!);
  const min = sorted[0].pricePer100g!;
  const max = sorted[sorted.length - 1].pricePer100g!;
  const range = max - min;

  const ranked = sorted.map((v) => {
    let rank: "best" | "mid" | "worst";
    if (range === 0) {
      rank = "best";
    } else {
      const ratio = (v.pricePer100g! - min) / range;
      rank = ratio <= 0.33 ? "best" : ratio <= 0.66 ? "mid" : "worst";
    }
    return { ...v, rank };
  });

  return [...ranked, ...without];
}

export function recalcPricePer100g(variant: ProductVariant): ProductVariant {
  const pricePer100g =
    variant.price != null && variant.weight != null && variant.weight > 0
      ? (variant.price / variant.weight) * 100
      : null;
  return { ...variant, pricePer100g };
}
