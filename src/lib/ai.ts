import { supabase } from "@/integrations/supabase/client";
import { AIExtraction } from "@/types/scan";

export async function analyzeImage(imageBase64: string): Promise<AIExtraction> {
  const { data, error } = await supabase.functions.invoke("analyze-package", {
    body: { image: imageBase64 },
  });

  if (error) {
    console.error("AI analysis error:", error);
    throw new Error("שגיאה בניתוח התמונה. נסה שוב.");
  }

  return data as AIExtraction;
}
