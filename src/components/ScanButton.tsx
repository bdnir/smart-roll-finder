import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScanButtonProps {
  onClick: () => void;
  label?: string;
}

export function ScanButton({ onClick, label = "סרוק מוצר" }: ScanButtonProps) {
  return (
    <Button
      onClick={onClick}
      className="w-full max-w-xs h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2 text-base font-bold shadow-lg"
    >
      <Camera className="!size-5" />
      {label}
    </Button>
  );
}
