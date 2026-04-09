export interface ProductVariant {
  id: string;
  brandName: string | null;
  productName: string | null;
  characteristics: string | null;
  weight: number | null; // in the unit specified by `unit`
  unit: string; // e.g. "גרם", "מ\"ל", "ליטר", "יחידות"
  price: number | null;
  pricePer100: number | null; // price per 100 units (grams/ml/etc)
  rank?: "best" | "mid" | "worst";
}

export interface ComparisonResult {
  category: string | null;
  variants: ProductVariant[];
}
