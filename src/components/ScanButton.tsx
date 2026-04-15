import { Camera, BarChart3, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScanButtonProps {
  onClick: () => void;
  label?: string;
  description?: string;
}

export function ScanButton({ onClick, label = "סרוק מוצר", description }: ScanButtonProps) {
  const isComparison = label === "סרוק מוצרים";

  return (
    <Button
      variant="scan"
      size="lg"
      onClick={onClick}
      className="w-full max-w-xs min-h-[5rem] rounded-2xl animate-scan-glow flex flex-col items-center justify-center gap-1 py-3 relative overflow-hidden"
    >
      {/* אייקון ה-i החדש - ממוקם בפינה העליונה */}
      <div className="absolute top-2 right-3 opacity-70">
        <Info className="size-4" />
      </div>

      <span className="flex items-center gap-2 text-base font-bold">
        {isComparison ? <BarChart3 className="!size-5" /> : <Camera className="!size-5" />}
        {label}
      </span>
      
      {description && (
        <span className="text-[11px] font-normal opacity-80 leading-tight text-center px-2">
          {description}
        </span>
      )}
    </Button>
  );
}
