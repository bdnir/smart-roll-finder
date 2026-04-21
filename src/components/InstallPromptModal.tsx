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

const SCAN_COUNTER_KEY = "buysmart_total_scans";
const NEXT_PROMPT_KEY = "buysmart_next_install_prompt_at";
const INSTALLED_KEY = "buysmart_installed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    localStorage.getItem(INSTALLED_KEY) === "true"
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

export function recordScanForInstallPrompt(): "show" | null {
  if (isStandalone()) return null;
  const current = parseInt(localStorage.getItem(SCAN_COUNTER_KEY) || "0", 10) + 1;
  localStorage.setItem(SCAN_COUNTER_KEY, String(current));
  const nextAt = parseInt(localStorage.getItem(NEXT_PROMPT_KEY) || "5", 10);
  if (current >= nextAt) return "show";
  return null;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });
  window.addEventListener("appinstalled", () => {
    localStorage.setItem(INSTALLED_KEY, "true");
    deferredPrompt = null;
  });
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InstallPromptModal({ open, onOpenChange }: Props) {
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setIos(isIOS());
  }, []);

  const handleDismiss = () => {
    const current = parseInt(localStorage.getItem(SCAN_COUNTER_KEY) || "0", 10);
    localStorage.setItem(NEXT_PROMPT_KEY, String(current + 10));
    onOpenChange(false);
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          localStorage.setItem(INSTALLED_KEY, "true");
        }
        deferredPrompt = null;
        onOpenChange(false);
        return;
      } catch {
        // fall through
      }
    }
    if (!ios) {
      // No native prompt available; defer
      handleDismiss();
    }
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
