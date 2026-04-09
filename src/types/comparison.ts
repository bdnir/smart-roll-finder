export interface ProductVariant {
  id: string;
  brandName: string | null;
  productName: string | null;
  characteristics: string | null;
  weight: number | null; // grams
  price: number | null;
  pricePer100g: number | null;
  rank?: "best" | "mid" | "worst";
}

export interface ComparisonResult {
  category: string | null;
  variants: ProductVariant[];
}
