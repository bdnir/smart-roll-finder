export type UnitType = "rolls" | "sheets" | "units" | "g" | "kg" | "ml" | "l" | "pack";

export interface AIExtraction {
  price: number | null;
  unitCount: number | null;
  unitType: UnitType | string | null;
  companyName: string | null;
  productName: string | null;
  sheetsPerRoll?: number | null;
}

export interface ScanResult {
  id: string;
  companyName: string | null;
  productName: string | null;
  price: number | null;
  unitCount: number | null;
  unitType: UnitType | string | null;
  sheetsPerRoll?: number | null;
  pricePerUnit: number | null;
  timestamp: number;
  imageDataUrl?: string;
}
