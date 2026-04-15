import { supabase } from "@/integrations/supabase/client";
import { AIExtraction } from "@/types/scan";
import { getDeviceId } from "./device";

export async function analyzeImage(imageBase64: string): Promise<AIExtraction> {
  const deviceId = getDeviceId();
  const { data, error } = await supabase.functions.invoke("analyze-package", {
    body: { image: imageBase64, device_id: deviceId },
  });

  if (error) {
    console.error("AI analysis error:", error);
    // Check if the error response has a code
    const errorBody = typeof error === "object" && "context" in error ? error : null;
    const msg = (errorBody as any)?.context?.body
      ? JSON.parse(new TextDecoder().decode((errorBody as any).context.body))
      : null;
    
    if (msg?.code === "QUOTA_EXCEEDED" || msg?.code === "CREDITS_EXHAUSTED") {
      throw new Error("מצטערים, עקב עומס שימוש השירות אינו זמין כרגע. השירות יתחדש מחר.");
    }
    if (msg?.code === "BLURRY_IMAGE") {
      throw new Error("התמונה לא ברורה, נסה לצלם מקרוב יותר ובתאורה טובה");
    }
    throw new Error("שגיאה בניתוח התמונה. נסה שוב.");
  }

  // Check for error in response data
  if (data?.code === "BLURRY_IMAGE") {
    throw new Error("התמונה לא ברורה, נסה לצלם מקרוב יותר ובתאורה טובה");
  }
  if (data?.code === "QUOTA_EXCEEDED" || data?.code === "CREDITS_EXHAUSTED") {
    throw new Error("מצטערים, עקב עומס שימוש השירות אינו זמין כרגע. השירות יתחדש מחר.");
  }

  return data as AIExtraction;
}
