import { Camera, BarChart3, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScanButtonProps {
  onClick: () => void;
  label?: string;
  description?: string;
  onHelpClick?: (e: React.MouseEvent) => void;
}

export function ScanButton({ onClick, label = "סרוק מוצר", description, onHelpClick }: ScanButtonProps) {
  const isComparison = label === "סרוק מוצרים";

  return (
    <Button
      variant="scan"
      size="lg"
      onClick={onClick}
      className="w-full max-w-xs min-h-[5rem] rounded-2xl flex flex-col items-center justify-center gap-1 py-3 relative overflow-hidden"
    >
      <span className="flex items-center gap-2 text-base font-bold">
        {isComparison ? <BarChart3 className="!size-5" /> : <Camera className="!size-5" />}
        {label}
      </span>
      
      {description && (
        <div className="flex items-center justify-center w-full px-4">
          <span className="text-[11px] font-normal opacity-80 leading-tight text-center">
            {description}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onHelpClick?.(e);
            }}
            /* הוספנו mr-4 כדי להזיז אותו שמאלה בערך 4 מ"מ */
            className="p-1 rounded-full text-primary-foreground/70 hover:text-primary-foreground transition-colors shrink-0 mr-4"
            aria-label="עזרה"
          >
            <Info className="size-3.5" />
          </button>
        </div>
      )}
    </Button>
  );
}
