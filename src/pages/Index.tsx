import { useState, useEffect, useMemo } from "react";
import { ShoppingCart, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScanButton } from "@/components/ScanButton";
import { ProductCard } from "@/components/ProductCard";
import { CameraCapture } from "@/components/CameraCapture";
import { HelpModal } from "@/components/HelpModal";
import { InstallPromptModal, recordScanForInstallPrompt } from "@/components/InstallPromptModal";
import { analyzeImage } from "@/lib/ai";
import {
  getHistory,
  addToHistory,
  clearHistory,
  removeFromHistory,
  updateHistoryItem,
} from "@/lib/storage";
import { checkQuota, saveScan, uploadScanImage, QuotaExceededError } from "@/lib/scan-service";
import { playSuccessBeep } from "@/lib/audio";
import { AIExtraction, ScanResult } from "@/types/scan";
import { useToast } from "@/hooks/use-toast";

type AppState =
  | { step: "home" }
  | { step: "camera"; mode: "package" | "price"; targetId?: string }
  | { step: "loading"; loadingMode: "package" | "price" };

const SCAN_FAIL_MSG = "הסריקה נכשלה, נסה שוב";

export default function Index() {
  const [state, setState] = useState<AppState>({ step: "home" });
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [lastScannedId, setLastScannedId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const rankedHistory = useMemo(() => {
    const withPrice = history.filter((h) => h.pricePerUnit != null);
    if (withPrice.length === 0) {
      return history.map((h) => ({ item: h, rank: "mid" as const }));
    }
    const sorted = [...history].sort((a, b) => {
      if (a.pricePerUnit == null) return 1;
      if (b.pricePerUnit == null) return -1;
      return a.pricePerUnit - b.pricePerUnit;
    });
    const prices = withPrice.map((h) => h.pricePerUnit!);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return sorted.map((item) => {
      if (item.pricePerUnit == null) return { item, rank: "mid" as const };
      let rank: "best" | "worst" | "mid" = "mid";
      if (item.pricePerUnit === min) rank = "best";
      else if (item.pricePerUnit === max && max !== min) rank = "worst";
      return { item, rank };
    });
  }, [history]);

  const refreshHistory = () => setHistory(getHistory());

  const handleScanStart = async () => {
    try {
      const allowed = await checkQuota();
      if (!allowed) {
        toast({
          title: "מגבלת שימוש",
          description: "מצטערים, עקב עומס שימוש השירות אינו זמין כרגע. השירות יתחדש מחר.",
          variant: "destructive",
        });
        return;
      }
    } catch {
      // ignore quota check failure
    }
    setState({ step: "camera", mode: "package" });
  };

  // pricePerUnit comes from storage helper (computePricePerUnit)

  const handleCapture = async (imageBase64: string) => {
    // Price-only scan to update an existing item
    if (state.step === "camera" && state.mode === "price" && state.targetId) {
      const targetId = state.targetId;
      setState({ step: "loading", loadingMode: "price" });
      try {
        const extraction = await analyzeImage(imageBase64);
        if (extraction.price != null) {
          updateHistoryItem(targetId, { price: extraction.price });
          refreshHistory();
          playSuccessBeep();
          toast({ title: "המחיר עודכן" });
        } else {
          toast({ title: "שגיאה", description: SCAN_FAIL_MSG, variant: "destructive" });
        }
      } catch (e) {
        const msg = e instanceof QuotaExceededError ? e.message : SCAN_FAIL_MSG;
        toast({ title: "שגיאה", description: msg, variant: "destructive" });
      }
      setState({ step: "home" });
      return;
    }

    // Standard package scan – direct injection
    setState({ step: "loading", loadingMode: "package" });
    try {
      const extraction: AIExtraction = await analyzeImage(imageBase64);

      // Validate: must have name AND unitCount (works for any product)
      const hasName = !!(extraction.productName || extraction.companyName);
      const hasUnits = !!extraction.unitCount;
      if (!hasName || !hasUnits) {
        toast({ title: "שגיאה", description: SCAN_FAIL_MSG, variant: "destructive" });
        setState({ step: "home" });
        return;
      }

      const pricePerUnit =
        extraction.price && extraction.unitCount
          ? extraction.price / extraction.unitCount
          : null;

      const result: ScanResult = {
        id: crypto.randomUUID(),
        companyName: extraction.companyName,
        productName: extraction.productName,
        price: extraction.price,
        unitCount: extraction.unitCount,
        unitType: extraction.unitType,
        sheetsPerRoll: extraction.sheetsPerRoll ?? null,
        pricePerUnit,
        timestamp: Date.now(),
        imageDataUrl: imageBase64,
      };

      addToHistory(result);
      refreshHistory();
      setLastScannedId(result.id);
      playSuccessBeep();
      setState({ step: "home" });
      if (recordScanForInstallPrompt() === "show") {
        setTimeout(() => setInstallOpen(true), 600);
      }

      // Background: upload + save
      (async () => {
        const imagePath = await uploadScanImage(imageBase64);
        await saveScan(extraction, result, false, imagePath);
      })();
    } catch (e) {
      const msg = e instanceof QuotaExceededError ? e.message : SCAN_FAIL_MSG;
      toast({ title: "שגיאה", description: msg, variant: "destructive" });
      setState({ step: "home" });
    }
  };

  if (state.step === "camera") {
    return (
      <CameraCapture
        onCapture={handleCapture}
        onClose={() => setState({ step: "home" })}
      />
    );
  }

  if (state.step === "loading") {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-5 px-6">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full scan-button-gradient blur-2xl opacity-60 animate-pulse" />
          <div className="relative w-20 h-20 rounded-full border-4 border-primary/30 border-t-primary border-r-accent animate-spin" />
        </div>
        <p className="text-foreground/80 font-semibold tracking-tight">
          {state.loadingMode === "price" ? "מנתח את תג המחיר..." : "מנתח את התמונה..."}
        </p>
        <div className="w-full max-w-xs space-y-2">
          <div className="h-3 rounded-full bg-muted animate-pulse" />
          <div className="h-3 rounded-full bg-muted animate-pulse w-4/5" />
          <div className="h-3 rounded-full bg-muted animate-pulse w-2/3" />
        </div>
      </div>
    );
  }

  const hasItems = history.length > 0;

  const handleDelete = (id: string) => {
    removeFromHistory(id);
    refreshHistory();
  };

  const handleUpdatePrice = (id: string, price: number) => {
    updateHistoryItem(id, { price });
    refreshHistory();
    if (id === lastScannedId) setLastScannedId(null);
  };

  const handleScanPriceFor = (id: string) => {
    setState({ step: "camera", mode: "price", targetId: id });
  };

  const bestItem = rankedHistory.find((r) => r.rank === "best");

  return (
    <div className="min-h-[100dvh] flex flex-col relative overflow-hidden">
      {/* Decorative cyber blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="blob absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/25 blur-3xl" />
        <div className="blob absolute top-40 -left-24 w-72 h-72 rounded-full bg-accent/25 blur-3xl" style={{ animationDelay: "-4s" }} />
      </div>

      <header className="px-5 pt-6 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl scan-button-gradient flex items-center justify-center shadow-glow">
              <ShoppingCart className="text-primary-foreground size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                <span className="kinetic-text text-gradient-cyber">BuySmart</span>
              </h1>
              <p className="text-xs text-muted-foreground font-medium">מחשבון עלות חכם</p>
            </div>
          </div>
          <button
            onClick={() => setHelpOpen(true)}
            aria-label="עזרה"
            className="w-10 h-10 rounded-2xl glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <Info className="size-4" />
          </button>
        </div>
      </header>

      {/* Bento: Scan CTA + quick stats */}
      <div className="px-4 pt-2 pb-4">
        <div className={`grid gap-3 ${hasItems ? "grid-cols-1" : "grid-cols-1"}`}>
          <div className="glass rounded-3xl p-6 flex flex-col items-center gap-3 card-elevated animate-spring-in">
            <div className="w-full max-w-xs animate-scan-glow">
              <ScanButton onClick={handleScanStart} />
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              צלם את הנתונים על האריזה כדי לחשב את מחיר היחידה
            </p>
          </div>

          {hasItems && (
            <div className="grid grid-cols-2 gap-3 animate-fade-in">
              <div className="glass rounded-2xl p-4 flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground font-medium">סה״כ סריקות</span>
                <span className="text-2xl font-extrabold text-gradient-cyber leading-none">{history.length}</span>
              </div>
              <div className="glass rounded-2xl p-4 flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground font-medium">הכי משתלם</span>
                <span className="text-sm font-bold truncate">
                  {bestItem ? (bestItem.item.companyName || bestItem.item.productName || "—") : "—"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {hasItems && (
        <div className="px-4 pb-8 flex-1">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-bold text-foreground tracking-tight">סריקות אחרונות</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearHistory();
                refreshHistory();
              }}
              className="text-xs text-muted-foreground rounded-xl"
            >
              <Trash2 className="size-3" />
              נקה הכל
            </Button>
          </div>
          <div className="space-y-3">
            {rankedHistory.map(({ item, rank }) => (
              <ProductCard
                key={item.id}
                result={item}
                rank={rank}
                onDelete={handleDelete}
                onUpdatePrice={handleUpdatePrice}
                onScanPrice={handleScanPriceFor}
                highlightPrice={item.id === lastScannedId}
              />
            ))}
          </div>
        </div>
      )}

      <HelpModal open={helpOpen} onOpenChange={setHelpOpen} />
      <InstallPromptModal open={installOpen} onOpenChange={setInstallOpen} />
    </div>
  );
}
