import { useState } from "react";
import { ArrowRight, Pencil, Check, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProductVariant, ComparisonResult } from "@/types/comparison";
import { rankVariants, recalcPricePer100g } from "@/lib/comparison";

interface ComparisonResultsProps {
  result: ComparisonResult;
  onClose: () => void;
}

export function ComparisonResults({ result, onClose }: ComparisonResultsProps) {
  const [variants, setVariants] = useState<ProductVariant[]>(result.variants);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleEdit = (id: string, field: "price" | "weight", value: string) => {
    setVariants((prev) => {
      const updated = prev.map((v) => {
        if (v.id !== id) return v;
        const num = value === "" ? null : parseFloat(value);
        const patched = { ...v, [field]: isNaN(num as number) ? null : num };
        return recalcPricePer100g(patched);
      });
      return rankVariants(updated);
    });
  };

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
          <Badge className="bg-green-500 text-white text-[10px] gap-1">
            <Trophy className="size-3" />
            הכי משתלם
          </Badge>
        );
      case "mid":
        return (
          <Badge className="bg-yellow-500 text-white text-[10px]">
            ממוצע
          </Badge>
        );
      case "worst":
        return (
          <Badge className="bg-red-500 text-white text-[10px]">
            יקר
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
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

      {/* Results */}
      <div className="flex-1 overflow-auto p-4">
        {variants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <p className="text-sm">לא נמצאו מוצרים בתמונה</p>
            <Button variant="outline" onClick={onClose}>
              חזור
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {variants.map((v, idx) => (
              <div
                key={v.id}
                className={`rounded-xl border-2 p-4 transition-all duration-200 ${rankColor(v.rank)}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-muted-foreground bg-muted rounded-full w-6 h-6 flex items-center justify-center">
                        {idx + 1}
                      </span>
                      {rankBadge(v.rank)}
                    </div>
                    <p className="text-sm font-semibold text-foreground truncate">
                      {v.brandName || "מותג לא ידוע"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {v.productName || "מוצר לא ידוע"}
                    </p>
                    {v.characteristics && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {v.characteristics}
                      </p>
                    )}
                  </div>
                  <div className="text-left shrink-0">
                    {v.pricePer100g != null ? (
                      <>
                        <p className="text-lg font-bold text-foreground">
                          ₪{v.pricePer100g.toFixed(2)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">ל-100 גרם</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">לא חושב</p>
                    )}
                  </div>
                </div>

                {/* Edit mode */}
                {editingId === v.id ? (
                  <div className="flex gap-2 items-end mt-3 pt-3 border-t border-border/50">
                    <div className="flex-1">
                      <label className="text-[10px] text-muted-foreground mb-1 block">מחיר (₪)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={v.price ?? ""}
                        onChange={(e) => handleEdit(v.id, "price", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-muted-foreground mb-1 block">משקל (גרם)</label>
                      <Input
                        type="number"
                        value={v.weight ?? ""}
                        onChange={(e) => handleEdit(v.id, "weight", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      onClick={() => setEditingId(null)}
                    >
                      <Check className="size-4 text-primary" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {v.price != null && <span>₪{v.price.toFixed(2)}</span>}
                      {v.weight != null && <span>{v.weight} גרם</span>}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1 text-muted-foreground"
                      onClick={() => setEditingId(v.id)}
                    >
                      <Pencil className="size-3" />
                      עריכה
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
