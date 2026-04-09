import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScanButtonProps {
  onClick: () => void;
}

export function ScanButton({ onClick }: ScanButtonProps) {
  return (
    <Button
      variant="scan"
      size="lg"
      onClick={onClick}
      className="w-full max-w-xs h-16 rounded-2xl animate-pulse-scan"
    >
      <Camera className="!size-6" />
      סרוק מוצר
    </Button>
  );
}
