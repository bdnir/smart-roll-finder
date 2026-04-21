import { useState, useRef, useEffect } from "react";
import { Edit2, X, Package, Camera } from "lucide-react";
import { ScanResult } from "@/types/scan";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ProductCardProps {
  result: ScanResult;
  rank?: "best" | "worst" | "mid";
  onDelete?: (id: string) => void;
  onUpdatePrice?: (id: string, price: number) => void;
  onScanPrice?: (id: string) => void;
  highlightPrice?: boolean;
}

const rankBorder: Record<string, string> = {
  best: "border-2 border-emerald-500",
  worst: "border-2 border-red-500",
  mid: "border-2 border-amber-400",
};

const rankPriceColor: Record<string, string> = {
  best: "text-emerald-600",
  worst: "text-red-600",
  mid: "text-amber-600",
};

export function ProductCard({
  result,
  rank = "mid",
  onDelete,
  onUpdatePrice,
  onScanPrice,
  highlightPrice = false,
}: ProductCardProps) {
  const [editing, setEditing] = useState(false);
  const [draftPrice, setDraftPrice] = useState("");
  const [hasEditedPrice, setHasEditedPrice] = useState(false);
  const startX = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);

  // Reset edited flag when a new scan (different id) becomes highlighted
  useEffect(() => {
    setHasEditedPrice(false);
  }, [result.id]);

  const shouldBlink = highlightPrice && !hasEditedPrice;

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx > 0) setOffset(Math.min(dx, 120));
  };
  const onTouchEnd = () => {
    if (offset > 80 && onDelete) {
      onDelete(result.id);
    }
    setOffset(0);
    startX.current = null;
  };

  const startEditing = () => {
    setDraftPrice(result.price != null ? String(result.price) : "");
    setEditing(true);
  };

  const submitPrice = () => {
    const n = parseFloat(draftPrice);
    if (!isNaN(n) && n > 0 && onUpdatePrice) {
      onUpdatePrice(result.id, n);
      setHasEditedPrice(true);
    }
    setEditing(false);
    setDraftPrice("");
  };

  const handleScanPrice = () => {
    setHasEditedPrice(true);
    onScanPrice?.(result.id);
  };

  const unitTypeLabels: Record<string, string> = {
    rolls: "לגליל",
    sheets: "לדף",
    units: "ליחידה",
    g: "ל-100 גרם",
    ml: "ל-100 מ״ל",
    pack: "לחבילה",
  };
  const unitType = result.unitType || "units";
  const isToiletPaper = unitType === "rolls" && !!result.sheetsPerRoll;
  const effectiveUnitType = isToiletPaper ? "sheets" : unitType;
  const unitLabel = unitTypeLabels[effectiveUnitType] || "ליחידה";
  const basePerUnit = result.pricePerUnit;
  const perSheet =
    isToiletPaper && basePerUnit != null && result.sheetsPerRoll
      ? basePerUnit / result.sheetsPerRoll
      : null;
  const displayPrice =
    perSheet != null
      ? perSheet
      : basePerUnit != null && (unitType === "g" || unitType === "ml")
      ? basePerUnit * 100
      : basePerUnit;

  const blinkClass = shouldBlink ? "animate-pulse font-bold" : "";

  return (
    <div className="relative">
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ transform: `translateX(${offset}px)` }}
        className={`bg-card rounded-2xl p-3 card-elevated transition-all duration-200 animate-slide-up ${rankBorder[rank]}`}
      >
        <div className="flex items-stretch gap-3">
          {/* Right (RTL first): name & details */}
          <div className="flex-1 min-w-0 flex flex-col justify-center text-right">
            <p className="text-sm font-semibold text-foreground leading-tight">
              {result.companyName || "מוצר"}
              {result.productName ? `, ${result.productName}` : ""}
            </p>
            {result.unitCount ? (
              <p className="text-xs text-muted-foreground mt-1">
                {result.unitCount} {unitType === "rolls" ? "גלילים" : unitType === "g" ? "גרם" : unitType === "ml" ? "מ״ל" : "יחידות"}
              </p>
            ) : null}
          </div>

          {/* Divider */}
          <div className="w-px bg-border" />

          {/* Middle: price */}
          <div className="flex flex-col justify-center min-w-[110px] text-center">
            {editing ? (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={draftPrice}
                  onChange={(e) => setDraftPrice(e.target.value)}
                  placeholder="מחיר"
                  className="h-8 text-sm"
                  autoFocus
                />
                <Button size="sm" onClick={submitPrice} className="h-8 px-2">
                  ✓
                </Button>
              </div>
            ) : displayPrice != null ? (
              <>
                <p className={`text-base font-bold ${rankPriceColor[rank]}`}>
                  ₪{displayPrice.toFixed(perSheet != null ? 3 : 2)} {unitLabel}
                </p>
                {result.price != null && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    מחיר כולל {result.price.toFixed(2)} ש"ח
                  </p>
                )}
                <button
                  onClick={startEditing}
                  className={`flex items-center gap-1 text-[11px] text-primary justify-center mt-1 ${shouldBlink ? "animate-pulse font-bold" : "font-medium"}`}
                >
                  <Edit2 className="size-3" />
                  עדכן מחיר כולל
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={startEditing}
                  className={`flex items-center gap-1 text-sm text-primary font-medium justify-center ${blinkClass}`}
                >
                  <Edit2 className="size-3.5" />
                  עדכן מחיר כולל
                </button>
                {onScanPrice && (
                  <button
                    onClick={handleScanPrice}
                    className={`flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground ${blinkClass}`}
                  >
                    <Camera className="size-3" />
                    סרוק תג מחיר
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Left: image */}
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
            {result.imageDataUrl ? (
              <img
                src={result.imageDataUrl}
                alt={result.productName || "product"}
                className="w-full h-full object-cover"
              />
            ) : (
              <Package className="size-6 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Close X */}
        {onDelete && (
          <button
            onClick={() => onDelete(result.id)}
            aria-label="הסר"
            className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-background border border-border shadow flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
