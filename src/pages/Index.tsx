import { useState, useEffect, useMemo } from "react";
import { ShoppingCart, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScanButton } from "@/components/ScanButton";
import { ProductCard } from "@/components/ProductCard";
import { CameraCapture } from "@/components/CameraCapture";
import { HelpModal } from "@/components/HelpModal";
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
  const { toast } = useToast();

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const rankedHistory = useMemo(() => {
    const withPrice = history.filter((h) => h.pricePerSheet != null);
    if (withPrice.length === 0) {
      return history.map((h) => ({ item: h, rank: "mid" as const }));
    }
    const sorted = [...history].sort((a, b) => {
      if (a.pricePerSheet == null) return 1;
      if (b.pricePerSheet == null) return -1;
      return a.pricePerSheet - b.pricePerSheet;
    });
    const prices = withPrice.map((h) => h.pricePerSheet!);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return sorted.map((item) => {
      if (item.pricePerSheet == null) return { item, rank: "mid" as const };
      let rank: "best" | "worst" | "mid" = "mid";
      if (item.pricePerSheet === min) rank = "best";
      else if (item.pricePerSheet === max && max !== min) rank = "worst";
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

  const computePricePerSheet = (
    price: number | null,
    rolls: number | null,
    sheets: number | null
  ): number | null => {
    if (!price) return null;
    if (rolls && sheets) return price / (rolls * sheets);
    if (rolls) return price / rolls;
    return null;
  };

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

      // Validate: must have name AND units (rolls)
      const hasName = !!(extraction.productName || extraction.companyName);
      const hasUnits = !!extraction.rolls;
      if (!hasName || !hasUnits) {
        toast({ title: "שגיאה", description: SCAN_FAIL_MSG, variant: "destructive" });
        setState({ step: "home" });
        return;
      }

      const pricePerSheet = computePricePerSheet(
        extraction.price,
        extraction.rolls,
        extraction.sheetsPerRoll
      );

      const result: ScanResult = {
        id: crypto.randomUUID(),
        companyName: extraction.companyName,
        productName: extraction.productName,
        price: extraction.price,
        rolls: extraction.rolls,
        sheetsPerRoll: extraction.sheetsPerRoll,
        pricePerSheet,
        timestamp: Date.now(),
        imageDataUrl: imageBase64,
      };

      addToHistory(result);
      refreshHistory();
      playSuccessBeep();
      setState({ step: "home" });

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
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground font-medium">
          {state.loadingMode === "price" ? "מנתח את תג המחיר..." : "מנתח את התמונה..."}
        </p>
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
  };

  const handleScanPriceFor = (id: string) => {
    setState({ step: "camera", mode: "price", targetId: id });
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <header className="p-5 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl scan-button-gradient flex items-center justify-center">
            <ShoppingCart className="text-primary-foreground size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">BuySmart</h1>
            <p className="text-xs text-muted-foreground">מחשבון עלות</p>
          </div>
        </div>
      </header>

      <div
        className={`flex flex-col items-center px-6 gap-3 transition-all duration-500 ease-out ${
          hasItems ? "pt-2 pb-4" : "flex-1 justify-center py-8"
        }`}
      >
        <div className="w-full max-w-xs animate-scan-glow">
          <ScanButton onClick={handleScanStart} />
        </div>
        <div className="flex items-center gap-2 max-w-xs w-full justify-center">
          <button
            onClick={() => setHelpOpen(true)}
            aria-label="עזרה"
            className="p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <Info className="size-4" />
          </button>
          <p className="text-xs text-muted-foreground text-center">
            צלם את הנתונים על האריזה כדי לחשב את מחיר היחידה
          </p>
        </div>
      </div>

      {hasItems && (
        <div className="px-4 pb-6 flex-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">סריקות אחרונות</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearHistory();
                refreshHistory();
              }}
              className="text-xs text-muted-foreground"
            >
              <Trash2 className="size-3" />
              נקה
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
              />
            ))}
          </div>
        </div>
      )}

      <HelpModal open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
