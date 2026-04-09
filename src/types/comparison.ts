export interface BoundingBox {
  x: number; // left edge as % of image width (0-100)
  y: number; // top edge as % of image height (0-100)
  w: number; // width as % of image width (0-100)
  h: number; // height as % of image height (0-100)
}

export interface ProductVariant {
  id: string;
  brandName: string | null;
  productName: string | null;
  characteristics: string | null;
  weight: number | null;
  unit: string;
  price: number | null;
  pricePer100: number | null;
  rank?: "best" | "mid" | "worst";
  bbox?: BoundingBox | null;
  croppedImage?: string; // base64 data URL of cropped product
}

export interface ComparisonResult {
  category: string | null;
  variants: ProductVariant[];
  sourceImage?: string; // original captured image
}
