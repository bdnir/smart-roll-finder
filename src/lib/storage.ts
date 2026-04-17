import { ScanResult } from "@/types/scan";

const STORAGE_KEY = "buysmart_history";

export function getHistory(): ScanResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToHistory(result: ScanResult): void {
  const history = getHistory();
  history.unshift(result);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function removeFromHistory(id: string): void {
  const history = getHistory().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function computePricePerUnit(
  price: number | null,
  unitCount: number | null
): number | null {
  if (!price || !unitCount || unitCount <= 0) return null;
  return price / unitCount;
}

export function updateHistoryItem(id: string, patch: Partial<ScanResult>): void {
  const history = getHistory().map((r) => {
    if (r.id !== id) return r;
    const merged = { ...r, ...patch };
    merged.pricePerUnit = computePricePerUnit(merged.price, merged.unitCount);
    return merged;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}
