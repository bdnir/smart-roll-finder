import { ScanResult } from "@/types/scan";

interface ProductCardProps {
  result: ScanResult;
}

export function ProductCard({ result }: ProductCardProps) {
  return (
    <div className="bg-card rounded-xl p-4 card-elevated transition-all duration-200 animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {result.companyName || "לא ידוע"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {result.productName || "מוצר לא ידוע"}
          </p>
        </div>
        <div className="text-left mr-4">
          {result.pricePerSheet !== null ? (
            <>
              <p className="text-lg font-bold text-primary">
                ₪{result.pricePerSheet.toFixed(4)}
              </p>
              <p className="text-[10px] text-muted-foreground">לדף</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">לא חושב</p>
          )}
        </div>
      </div>
    </div>
  );
}
