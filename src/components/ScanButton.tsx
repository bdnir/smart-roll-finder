import { Camera, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScanButtonProps {
  onClick: () => void;
  label?: string;
}

export function ScanButton({ onClick, label = "סרוק מוצר" }: ScanButtonProps) {
  const isComparison = label === "סרוק מוצרים";

  return (
    <Button
      variant="scan"
      size="lg"
      onClick={onClick}
      className="w-full max-w-xs h-16 rounded-2xl animate-pulse-scan"
    >
      {isComparison ? <BarChart3 className="!size-6" /> : <Camera className="!size-6" />}
      {label}
    </Button>
  );
}
