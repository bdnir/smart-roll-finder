export interface ScanResult {
  id: string;
  companyName: string | null;
  productName: string | null;
  price: number | null;
  rolls: number | null;
  sheetsPerRoll: number | null;
  pricePerSheet: number | null;
  timestamp: number;
  imageDataUrl?: string;
}

export interface AIExtraction {
  price: number | null;
  rolls: number | null;
  sheetsPerRoll: number | null;
  companyName: string | null;
  productName: string | null;
}
