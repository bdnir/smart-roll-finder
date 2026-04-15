import { useState, useEffect } from "react";
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
import { getHistory, clearHistory } from "@/lib/storage";
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
          ? "התמונה לא בר
