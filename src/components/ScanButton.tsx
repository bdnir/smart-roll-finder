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
      className="w-full max-w-xs h-16 rounded-3xl scan-button-gradient text-primary-foreground flex items-center justify-center gap-2 text-base font-bold shadow-glow hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-300"
    >
      <Camera className="!size-5" />
      {label}
    </Button>
  );
}
