import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share, Plus, ChevronDown } from "lucide-react";
import {
  deferInstallPrompt,
  getDeferredPrompt,
  isIOS,
  triggerInstall,
} from "@/lib/pwa-install";

// Re-export for backwards compatibility with existing imports
export { recordScanForInstallPrompt } from "@/lib/pwa-install";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "auto" when triggered by the 3-scan rule, "manual" when from header button */
  source?: "auto" | "manual";
}

export function InstallPromptModal({ open, onOpenChange, source = "auto" }: Props) {
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setIos(isIOS());
  }, []);

  const handleDismiss = () => {
    deferInstallPrompt();
    onOpenChange(false);
  };

  const handleInstall = async () => {
    if (getDeferredPrompt()) {
      const ok = await triggerInstall(source);
      if (ok) {
        onOpenChange(false);
        return;
      }
    }
    if (!ios) handleDismiss();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : handleDismiss())}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-right text-xl">נהנית מהאפליקציה?</DialogTitle>
          <DialogDescription className="text-right">
            התקן את האפליקציה על מסך הבית שלך לגישה מהירה ונוחה
          </DialogDescription>
        </DialogHeader>

        {ios ? (
          <ol className="space-y-3 text-right text-sm text-foreground">
            <li className="flex items-start gap-2 flex-row-reverse">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                1
              </span>
              <span className="flex-1 flex items-center gap-1 flex-row-reverse">
                לחץ על כפתור ה-Share <Share className="size-4 inline" /> בתחתית הדפדפן.
              </span>
            </li>
            <li className="flex items-start gap-2 flex-row-reverse">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                2
              </span>
              <span className="flex-1 flex items-center gap-1 flex-row-reverse">
                גלול מטה <ChevronDown className="size-4 inline" /> ובחר ב-Add to Home Screen.
              </span>
            </li>
            <li className="flex items-start gap-2 flex-row-reverse">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                3
              </span>
              <span className="flex-1 flex items-center gap-1 flex-row-reverse">
                לחץ על Add <Plus className="size-4 inline" /> בפינה העליונה.
              </span>
            </li>
          </ol>
        ) : null}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {!ios && (
            <Button onClick={handleInstall} className="w-full">
              התקן עכשיו
            </Button>
          )}
          <Button variant="ghost" onClick={handleDismiss} className="w-full">
            {ios ? "סגור" : "אולי מאוחר יותר"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
