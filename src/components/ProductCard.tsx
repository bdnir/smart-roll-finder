import { useState, useRef } from "react";
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
}: ProductCardProps) {
  const [editing, setEditing] = useState(false);
  const [draftPrice, setDraftPrice] = useState("");
  const startX = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.touches[0].clientX - startX.current;
    // RTL: swipe right = delete (positive dx)
    if (dx > 0) setOffset(Math.min(dx, 120));
  };
  const onTouchEnd = () => {
    if (offset > 80 && onDelete) {
      onDelete(result.id);
    }
    setOffset(0);
    startX.current = null;
  };

  const submitPrice = () => {
    const n = parseFloat(draftPrice);
    if (!isNaN(n) && n > 0 && onUpdatePrice) {
      onUpdatePrice(result.id, n);
    }
    setEditing(false);
    setDraftPrice("");
  };

  const unitLabel = "ליחידה";

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
            {result.rolls && result.sheetsPerRoll ? (
              <p className="text-xs text-muted-foreground mt-1">
                {result.rolls} יחידות
              </p>
            ) : null}
          </div>

          {/* Divider */}
          <div className="w-px bg-border" />

          {/* Middle: price */}
          <div className="flex flex-col justify-center min-w-[110px] text-center">
            {result.pricePerSheet !== null ? (
              <>
                <p className={`text-base font-bold ${rankPriceColor[rank]}`}>
                  ₪{result.pricePerSheet.toFixed(2)} {unitLabel}
                </p>
                {result.price != null && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    מחיר כולל {result.price.toFixed(2)} ש"ח
                  </p>
                )}
              </>
            ) : editing ? (
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
            ) : (
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1 text-sm text-primary font-medium justify-center"
                >
                  <Edit2 className="size-3.5" />
                  עדכן מחיר
                </button>
                {onScanPrice && (
                  <button
                    onClick={() => onScanPrice(result.id)}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    <Camera className="size-3" />
                    סרוק תג
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
