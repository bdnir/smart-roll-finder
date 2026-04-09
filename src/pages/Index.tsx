import { useState, useEffect } from "react";
import { ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScanButton } from "@/components/ScanButton";
import { ProductCard } from "@/components/ProductCard";
import { CameraCapture } from "@/components/CameraCapture";
import { ValidationScreen } from "@/components/ValidationScreen";
import { ComparisonResults } from "@/components/ComparisonResults";
import { analyzeImage } from "@/lib/ai";
import { analyzeComparison } from "@/lib/comparison";
import { getHistory, clearHistory } from "@/lib/storage";
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
  const { toast } = useToast();

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const refreshHistory = () => setHistory(getHistory());

  const handleCapture = async (imageBase64: string) => {
    // Comparison mode
    if (state.step === "camera" && state.mode === "comparison") {
      setState({ step: "loading", imageDataUrl: imageBase64, loadingMode: "comparison" });
      try {
        const result = await analyzeComparison(imageBase64);
        setState({ step: "comparison-results", result });
      } catch (e) {
        toast({
          title: "שגיאה",
          description: e instanceof Error ? e.message : "שגיאה לא ידועה",
          variant: "destructive",
        });
        setState({ step: "home" });
      }
      return;
    }

    // Price tag scan for existing package
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

    // Single product scan
    setState({ step: "loading", imageDataUrl: imageBase64, loadingMode: "single" });
    try {
      const extraction = await analyzeImage(imageBase64);
      setState({ step: "validation", extraction, imageDataUrl: imageBase64 });
    } catch (e) {
      toast({
        title: "שגיאה",
        description: e instanceof Error ? e.message : "שגיאה לא ידועה",
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

  // Home
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
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

      {/* Scan CTA */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-6">
        {/* Single product */}
        <ScanButton
          onClick={() => setState({ step: "camera", mode: "package" })}
          description="צלם את הנתונים על האריזה כדי לחשב את המחיר ליחידה"
        />

        {/* Comparison mode */}
        <ScanButton
          label="סרוק מוצרים"
          onClick={() => setState({ step: "camera", mode: "comparison" })}
          description="צלם את המוצרים כדי לחשב ולהשוות את מחירם"
        />
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="px-4 pb-6">
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
          <div className="space-y-2">
            {history.map((item) => (
              <ProductCard key={item.id} result={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
