import { getDeviceId } from "./device";

const SCAN_COUNTER_KEY = "buysmart_total_scans";
const NEXT_PROMPT_KEY = "buysmart_next_install_prompt_at";
const INSTALLED_KEY = "buysmart_installed";
const INSTALLED_AT_KEY = "buysmart_installed_at";
const UNINSTALL_LOGGED_KEY = "buysmart_uninstall_logged";
const AUTO_PROMPT_TRIGGER = 3;
const DISMISS_INTERVAL = 10;

export type PwaEvent =
  | "pwa_installed"
  | "pwa_uninstalled"
  | "auto_prompt_shown"
  | "manual_prompt_clicked"
  | "ios_instructions_shown";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function subscribePwa(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isAppInstalled(): boolean {
  return isStandalone() || localStorage.getItem(INSTALLED_KEY) === "true";
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

/** Async, non-blocking analytics. Never throws. */
export function trackPwaEvent(event: PwaEvent, extra: Record<string, unknown> = {}): void {
  const payload = {
    event,
    timestamp: new Date().toISOString(),
    device_id: getDeviceId(),
    standalone: isStandalone(),
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    ...extra,
  };
  // Persist locally so we don't lose events
  try {
    const log = JSON.parse(localStorage.getItem("buysmart_pwa_events") || "[]");
    log.push(payload);
    localStorage.setItem("buysmart_pwa_events", JSON.stringify(log.slice(-50)));
  } catch {
    /* ignore */
  }
  // Fire & forget – do NOT block the scan flow
  queueMicrotask(() => {
    try {
      // eslint-disable-next-line no-console
      console.info("[pwa-analytics]", payload);
    } catch {
      /* ignore */
    }
  });
}

/** Initialize PWA listeners once at app start. */
export function initPwa(): void {
  if (typeof window === "undefined") return;
  if ((window as unknown as { __pwa_init?: boolean }).__pwa_init) return;
  (window as unknown as { __pwa_init?: boolean }).__pwa_init = true;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    localStorage.setItem(INSTALLED_KEY, "true");
    localStorage.setItem(INSTALLED_AT_KEY, new Date().toISOString());
    localStorage.removeItem(UNINSTALL_LOGGED_KEY);
    deferredPrompt = null;
    trackPwaEvent("pwa_installed");
    notify();
  });

  // Detect uninstall: previously installed but now opened in browser mode
  const wasInstalled = localStorage.getItem(INSTALLED_KEY) === "true";
  const uninstallLogged = localStorage.getItem(UNINSTALL_LOGGED_KEY) === "true";
  if (wasInstalled && !isStandalone() && !uninstallLogged) {
    // Heuristic: if app is opened in browser after being installed, mark uninstalled
    trackPwaEvent("pwa_uninstalled", {
      installed_at: localStorage.getItem(INSTALLED_AT_KEY),
    });
    localStorage.setItem(UNINSTALL_LOGGED_KEY, "true");
    localStorage.removeItem(INSTALLED_KEY);
    localStorage.removeItem(INSTALLED_AT_KEY);
  }
}

/** Increment scan counter; returns "show" when auto-prompt should fire. */
export function recordScanForInstallPrompt(): "show" | null {
  if (isAppInstalled()) return null;
  const current = parseInt(localStorage.getItem(SCAN_COUNTER_KEY) || "0", 10) + 1;
  localStorage.setItem(SCAN_COUNTER_KEY, String(current));
  const nextAt = parseInt(localStorage.getItem(NEXT_PROMPT_KEY) || String(AUTO_PROMPT_TRIGGER), 10);
  if (current >= nextAt) return "show";
  return null;
}

/** Dismiss handler – defers next prompt by N more scans. */
export function deferInstallPrompt(): void {
  const current = parseInt(localStorage.getItem(SCAN_COUNTER_KEY) || "0", 10);
  localStorage.setItem(NEXT_PROMPT_KEY, String(current + DISMISS_INTERVAL));
}

/** Trigger native install prompt. Returns true if accepted. */
export async function triggerInstall(source: "auto" | "manual"): Promise<boolean> {
  trackPwaEvent(source === "auto" ? "auto_prompt_shown" : "manual_prompt_clicked");
  if (!deferredPrompt) return false;
  try {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      localStorage.setItem(INSTALLED_KEY, "true");
      localStorage.setItem(INSTALLED_AT_KEY, new Date().toISOString());
    }
    deferredPrompt = null;
    notify();
    return choice.outcome === "accepted";
  } catch {
    return false;
  }
}
