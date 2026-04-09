import { ArrowRight, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductVariant, ComparisonResult } from "@/types/comparison";
import { getUnitLabel } from "@/lib/comparison";

interface ComparisonResultsProps {
  result: ComparisonResult;
  onClose: () => void;
}

export function ComparisonResults({ result, onClose }: ComparisonResultsProps) {
  const { variants } = result;

  const rankColor = (rank?: "best" | "mid" | "worst") => {
    switch (rank) {
      case "best":
        return "border-green-500 bg-green-500/10";
      case "mid":
        return "border-yellow-500 bg-yellow-500/10";
      case "worst":
        return "border-red-500 bg-red-500/10";
      default:
        return "border-border bg-card";
    }
  };

  const rankBadge = (rank?: "best" | "mid" | "worst") => {
    switch (rank) {
      case "best":
        return (
          <Badge className="bg-green-500 text-white text-[9px] gap-0.5 px-1.5 py-0">
            <Trophy className="size-2.5" />
            הכי משתלם
          </Badge>
        );
      case "mid":
        return (
          <Badge className="bg-yellow-500 text-white text-[9px] px-1.5 py-0">
            ממוצע
          </Badge>
        );
      case "worst":
        return (
          <Badge className="bg-red-500 text-white text-[9px] px-1.5 py-0">
            יקר
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col" dir="rtl">
      {/* Header */}
      <header className="p-4 flex items-center gap-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowRight className="size-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-foreground">השוואת מוצרים</h1>
          {result.category && (
            <p className="text-xs text-muted-foreground">קטגוריה: {result.category}</p>
          )}
        </div>
      </header>

      {/* Results Grid */}
      <div className="flex-1 overflow-auto p-3">
        {variants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <p className="text-sm">לא נמצאו מוצרים בתמונה</p>
            <Button variant="outline" onClick={onClose}>
              חזור
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {variants.map((v) => (
              <VariantCard key={v.id} variant={v} rankColor={rankColor} rankBadge={rankBadge} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VariantCard({
  variant: v,
  rankColor,
  rankBadge,
}: {
  variant: ProductVariant;
  rankColor: (rank?: "best" | "mid" | "worst") => string;
  rankBadge: (rank?: "best" | "mid" | "worst") => React.ReactNode;
}) {
  const unitLabel = getUnitLabel(v.unit);

  return (
    <div
      className={`rounded-xl border-2 p-2 flex flex-col gap-1.5 transition-all duration-200 ${rankColor(v.rank)}`}
    >
      {/* Badge */}
      <div className="flex justify-center">{rankBadge(v.rank)}</div>

      {/* Product info */}
      <div className="text-center min-w-0">
        <p className="text-xs font-bold text-foreground truncate leading-tight">
          {v.brandName || "מותג לא ידוע"}
        </p>
        <p className="text-[10px] text-muted-foreground truncate leading-tight">
          {v.productName || "מוצר"}
        </p>
        {v.characteristics && (
          <p className="text-[9px] text-muted-foreground/70 truncate leading-tight">
            {v.characteristics}
          </p>
        )}
      </div>

      {/* Price per 100 */}
      <div className="text-center mt-auto pt-1 border-t border-border/30">
        {v.pricePer100 != null ? (
          <>
            <p className="text-sm font-bold text-foreground leading-none">
              ₪{v.pricePer100.toFixed(2)}
            </p>
            <p className="text-[9px] text-muted-foreground">ל-100 {unitLabel}</p>
          </>
        ) : (
          <p className="text-[10px] text-muted-foreground">לא חושב</p>
        )}
      </div>

      {/* Raw data */}
      <div className="flex flex-col items-center gap-0 text-[9px] text-muted-foreground/60">
        {v.price != null && <span>₪{v.price.toFixed(2)}</span>}
        {v.weight != null && (
          <span>
            {v.weight} {v.unit}
          </span>
        )}
      </div>
    </div>
  );
}
