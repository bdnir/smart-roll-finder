import { useEffect, useState } from "react";
import {
  getDeferredPrompt,
  isAppInstalled,
  isIOS,
  subscribePwa,
} from "@/lib/pwa-install";

export function usePwaInstall() {
  const [installed, setInstalled] = useState<boolean>(() => isAppInstalled());
  const [canPrompt, setCanPrompt] = useState<boolean>(() => !!getDeferredPrompt());
  const [ios] = useState<boolean>(() => isIOS());

  useEffect(() => {
    const update = () => {
      setInstalled(isAppInstalled());
      setCanPrompt(!!getDeferredPrompt());
    };
    const unsub = subscribePwa(update);
    const mq = window.matchMedia("(display-mode: standalone)");
    const onChange = () => update();
    mq.addEventListener?.("change", onChange);
    return () => {
      unsub();
      mq.removeEventListener?.("change", onChange);
    };
  }, []);

  return { installed, canPrompt, ios };
}
