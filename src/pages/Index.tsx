import { useState, useEffect, useMemo } from "react";
import { ShoppingCart, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScanButton } from "@/components/ScanButton";
import { ProductCard } from "@/components/ProductCard";
import { CameraCapture } from "@/components/CameraCapture";
import { ValidationScreen } from "@/components/ValidationScreen";
import { ComparisonResults } from "@/components/ComparisonResults";
import { HelpModal } from "@/components/HelpModal";
import { analyzeImage } from "@/lib/ai";
import { analyzeComparison } from "@/lib/comparison";
import {
  getHistory,
  clearHistory,
  removeFromHistory,
  updateHistoryItem,
} from "@/lib/storage";
import { checkQuota, QuotaExceededError } from "@/lib/scan-service";
import { AIExtraction, ScanResult } from "@/types/scan";
import { ComparisonResult } from "@/types/comparison";
import { useToast } from "@/hooks/use-toast";

type AppState =
  | { step: "home" }
  | { step: "camera"; mode: "package" | "price" | "comparison"; pendingExtraction?: AIExtraction; pendingImage?: string }
  | { step: "loading"; imageDataUrl: string; loadingMode: "single" | "comparison"; pendingExtraction?: AIExtraction }
  | { step: "validation"; extraction: AIExtraction; imageDataUrl?: string }
  | { step: "comparison-results"; result: ComparisonResult };

export default function Index() {
  const [state, setState] = useState<AppState>({ step: "home" });
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [helpOpen, setHelpOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const refreshHistory = () => setHistory(getHistory());

  const handleScanStart = async (mode: "package" | "comparison") => {
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
      setState({ step: "camera", mode });
    } catch {
      setState({ step: "camera", mode });
    }
  };

  const handleCapture = async (imageBase64: string) => {
    if (state.step === "camera" && state.mode === "comparison") {
      setState({ step: "loading", imageDataUrl: imageBase64, loadingMode: "comparison" });
      try {
        const result = await analyzeComparison(imageBase64);
        setState({ step: "comparison-results", result });
      } catch (e) {
        const msg = e instanceof QuotaExceededError
          ? e.message
          : e instanceof Error ? e.message : "שגיאה לא ידועה";
        toast({ title: "שגיאה", description: msg, variant: "destructive" });
        setState({ step: "home" });
      }
      return;
    }

    if (state.step === "camera" && state.mode === "price" && state.pendingExtraction) {
      setState({ step: "loading", imageDataUrl: imageBase64, loadingMode: "single", pendingExtraction: state.pendingExtraction });
      try {
        const priceResult = await analyzeImage(imageBase64);
        setState({
          step: "validation",
          extraction: { ...state.pendingExtraction, price: priceResult.price ?? state.pendingExtraction.price },
          imageDataUrl: state.pendingImage,
        });
      } catch {
        toast({ title: "שגיאה", description: "לא ניתן לנתח את תג המחיר", variant: "destructive" });
        setState({
          step: "validation",
          extraction: state.pendingExtraction,
          imageDataUrl: state.pendingImage,
        });
      }
      return;
    }

    setState({ step: "loading", imageDataUrl: imageBase64, loadingMode: "single" });
    try {
      const extraction = await analyzeImage(imageBase64);
      setState({ step: "validation", extraction, imageDataUrl: imageBase64 });
    } catch (e) {
      const isBlurry = e instanceof Error && e.message.toLowerCase().includes("blur");
      toast({
        title: "שגיאה",
        description: isBlurry
          ? "התמונה לא ברורה, נסה לצלם מקרוב יותר ובתאורה טובה"
          : e instanceof Error ? e.message : "שגיאה לא ידועה",
        variant: "destructive",
      });
      setState({ step: "home" });
    }
  };

  const handleDone = (_result: ScanResult) => {
    refreshHistory();
    setState({ step: "home" });
    toast({ title: "נשמר!", description: "התוצאה נשמרה בהצלחה" });
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
          {state.loadingMode === "comparison" ? "מנתח ומשווה מוצרים..." : "מנתח את התמונה..."}
        </p>
      </div>
    );
  }

  if (state.step === "validation") {
    return (
      <ValidationScreen
        extraction={state.extraction}
        imageDataUrl={state.imageDataUrl}
        onDone={handleDone}
        onScanPrice={() =>
          setState({
            step: "camera",
            mode: "price",
            pendingExtraction: state.extraction,
            pendingImage: state.imageDataUrl,
          })
        }
        onCancel={() => setState({ step: "home" })}
      />
    );
  }

  if (state.step === "comparison-results") {
    return (
      <ComparisonResults
        result={state.result}
        onClose={() => setState({ step: "home" })}
      />
    );
  }

  const hasItems = history.length > 0;

  // Rank items by pricePerSheet (cheapest = best)
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

  const handleDelete = (id: string) => {
    removeFromHistory(id);
    refreshHistory();
  };

  const handleUpdatePrice = (id: string, price: number) => {
    updateHistoryItem(id, { price });
    refreshHistory();
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

      {/* Scan area – pinned to top when items exist, centered otherwise */}
      <div
        className={`flex flex-col items-center px-6 gap-3 transition-all duration-500 ease-out ${
          hasItems ? "pt-2 pb-4" : "flex-1 justify-center py-8"
        }`}
      >
        <div className="w-full max-w-xs animate-scan-glow">
          <ScanButton onClick={() => handleScanStart("package")} />
        </div>
        {/* Static description with 'i' icon on the LEFT of text */}
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
            <h2 className="text-sm font-semibold text-foreground">
              סריקות אחרונות
            </h2>
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
              />
            ))}
          </div>
        </div>
      )}

      <HelpModal open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
