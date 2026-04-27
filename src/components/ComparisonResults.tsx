import { ArrowRight, Trophy, Package } from "lucide-react";
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
        return "ring-2 ring-emerald-400/80 bg-emerald-500/5 shadow-[0_8px_30px_-8px_hsl(160_70%_45%/0.35)]";
      case "mid":
        return "ring-1 ring-amber-300/60 bg-amber-500/5";
      case "worst":
        return "ring-1 ring-rose-300/60 bg-rose-500/5";
      default:
        return "ring-1 ring-border bg-card";
    }
  };

  const rankBadge = (rank?: "best" | "mid" | "worst") => {
    switch (rank) {
      case "best":
        return (
          <Badge className="scan-button-gradient text-primary-foreground border-0 text-[9px] gap-0.5 px-1.5 py-0 shadow-glow">
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
    <div className="min-h-[100dvh] flex flex-col relative overflow-hidden" dir="rtl">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="blob absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="blob absolute bottom-0 -left-20 w-64 h-64 rounded-full bg-accent/20 blur-3xl" style={{ animationDelay: "-3s" }} />
      </div>

      {/* Header */}
      <header className="p-4 flex items-center gap-3 glass sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-2xl">
          <ArrowRight className="size-5" />
        </Button>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">
            <span className="text-gradient-cyber">השוואת מוצרים</span>
          </h1>
          {result.category && (
            <p className="text-xs text-muted-foreground">קטגוריה: {result.category}</p>
          )}
        </div>
      </header>

      {/* Results Grid (bento) */}
      <div className="flex-1 overflow-auto p-4">
        {variants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <p className="text-sm">לא נמצאו מוצרים בתמונה</p>
            <Button variant="outline" onClick={onClose}>
              חזור
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {variants.map((v, i) => (
              <div key={v.id} className="animate-spring-in" style={{ animationDelay: `${i * 40}ms` }}>
                <VariantCard variant={v} rankColor={rankColor} rankBadge={rankBadge} />
              </div>
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
      className={`rounded-2xl p-2.5 flex flex-col gap-1.5 transition-all duration-200 glass spring-hover ${rankColor(v.rank)}`}
    >
      {/* Cropped product image */}
      <div className="w-full aspect-square rounded-lg overflow-hidden bg-muted flex items-center justify-center">
        {v.croppedImage ? (
          <img
            src={v.croppedImage}
            alt={v.brandName || "מוצר"}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package className="size-8 text-muted-foreground/40" />
        )}
      </div>

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
