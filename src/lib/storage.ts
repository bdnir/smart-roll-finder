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
  // Keep last 50
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
