import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "./device";
import { compressImage } from "./image-utils";
import { AIExtraction, ScanResult } from "@/types/scan";

export class QuotaExceededError extends Error {
  constructor() {
    super("מצטערים, עקב עומס שימוש השירות אינו זמין כרגע. השירות יתחדש מחר.");
    this.name = "QuotaExceededError";
  }
}

export async function checkQuota(): Promise<boolean> {
  const deviceId = getDeviceId();
  const { data, error } = await supabase.rpc("check_scan_quota", {
    p_device_id: deviceId,
    p_limit: 10,
  });
  if (error) {
    console.error("Quota check error:", error);
    return true; // Allow on error
  }
  return data as boolean;
}

export async function uploadScanImage(imageDataUrl: string): Promise<string | null> {
  try {
    const blob = await compressImage(imageDataUrl);
    const deviceId = getDeviceId();
    const path = `${deviceId}/${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from("scan-images")
      .upload(path, blob, { contentType: "image/jpeg" });
    if (error) {
      console.error("Upload error:", error);
      return null;
    }
    return path;
  } catch (e) {
    console.error("Image compression/upload error:", e);
    return null;
  }
}

export async function saveScan(
  aiRaw: AIExtraction,
  userEdited: ScanResult,
  isManuallyEdited: boolean,
  imagePath: string | null
): Promise<void> {
  const deviceId = getDeviceId();
  const { error } = await supabase.from("scans").insert({
    device_id: deviceId,
    ai_raw_data: aiRaw as unknown as Record<string, unknown>,
    user_edited_data: userEdited as unknown as Record<string, unknown>,
    is_manually_edited: isManuallyEdited,
    image_path: imagePath,
  });
  if (error) {
    console.error("Save scan error:", error);
  }
}
