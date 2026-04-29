import { useState } from "react";
import { Download } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { triggerInstall, trackPwaEvent } from "@/lib/pwa-install";
import { InstallPromptModal } from "./InstallPromptModal";

export function InstallHeaderButton() {
  const { installed, canPrompt, ios } = usePwaInstall();
  const [open, setOpen] = useState(false);

  if (installed) return null;

  const handleClick = async () => {
    if (ios) {
      trackPwaEvent("ios_instructions_shown");
      setOpen(true);
      return;
    }
    if (canPrompt) {
      const accepted = await triggerInstall("manual");
      if (!accepted) setOpen(true);
      return;
    }
    // Fallback – show modal so user has guidance
    trackPwaEvent("manual_prompt_clicked");
    setOpen(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        aria-label="הוסף לעמוד הבית"
        className="glass rounded-full px-3.5 h-9 inline-flex items-center gap-1.5 text-xs font-bold text-foreground hover:text-primary border border-primary/20 hover:border-primary/50 transition-all active:scale-[0.96] hover:-translate-y-0.5 shadow-sm hover:shadow-glow"
      >
        <Download className="size-3.5" />
        <span>הוסף לעמוד הבית</span>
      </button>
      <InstallPromptModal open={open} onOpenChange={setOpen} />
    </>
  );
}
