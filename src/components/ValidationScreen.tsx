import { useState } from "react";
import { Check, Edit2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AIExtraction, ScanResult } from "@/types/scan";
import { addToHistory } from "@/lib/storage";
import { saveScan, uploadScanImage } from "@/lib/scan-service";

interface ValidationScreenProps {
  extraction: AIExtraction;
  imageDataUrl?: string;
  onDone: (result: ScanResult) => void;
  onScanPrice: () => void;
  onCancel: () => void;
}

export function ValidationScreen({
  extraction,
  imageDataUrl,
  onDone,
  onScanPrice,
  onCancel,
}: ValidationScreenProps) {
  const [price, setPrice] = useState(extraction.price?.toString() ?? "");
  const [rolls, setRolls] = useState(extraction.rolls?.toString() ?? "");
  const [sheets, setSheets] = useState(extraction.sheetsPerRoll?.toString() ?? "");
  const [company, setCompany] = useState(extraction.companyName ?? "");
  const [product, setProduct] = useState(extraction.productName ?? "");
  const [saving, setSaving] = useState(false);

  const priceNum = parseFloat(price) || null;
  const rollsNum = parseInt(rolls) || null;
  const sheetsNum = parseInt(sheets) || null;

  const canCalculate = priceNum && rollsNum && sheetsNum;
  const pricePerSheet = canCalculate ? priceNum / (rollsNum * sheetsNum) : null;

  const handleConfirm = async () => {
    setSaving(true);
    const result: ScanResult = {
      id: crypto.randomUUID(),
      companyName: company || null,
      productName: product || null,
      price: priceNum,
      rolls: rollsNum,
      sheetsPerRoll: sheetsNum,
      pricePerSheet,
      timestamp: Date.now(),
      imageDataUrl,
    };

    // Check if user edited anything
    const isEdited =
      extraction.price?.toString() !== price ||
      extraction.rolls?.toString() !== rolls ||
      extraction.sheetsPerRoll?.toString() !== sheets ||
      (extraction.companyName ?? "") !== company ||
      (extraction.productName ?? "") !== product;

    // Upload image & save to DB in background
    const imagePath = imageDataUrl ? await uploadScanImage(imageDataUrl) : null;
    await saveScan(extraction, result, isEdited, imagePath);

    addToHistory(result);
    setSaving(false);
    onDone(result);
  };

  const missingPrice = !extraction.price;

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col gap-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">אימות נתונים</h2>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          ביטול
        </Button>
      </div>

      {missingPrice && (
        <div className="bg-accent/20 border border-accent rounded-xl p-3 flex items-start gap-3">
          <AlertTriangle className="text-accent-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-accent-foreground">המחיר לא זוהה</p>
            <p className="text-xs text-muted-foreground mt-1">סרוק את תג המחיר או הזן ידנית</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={onScanPrice}>
              סרוק תג מחיר
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Field label="חברה" value={company} onChange={setCompany} />
        <Field label="שם מוצר" value={product} onChange={setProduct} />
        <Field label="מחיר (₪)" value={price} onChange={setPrice} type="number" highlight={missingPrice} />
        <Field label="מספר גלילים" value={rolls} onChange={setRolls} type="number" />
        <Field label="דפים לגליל" value={sheets} onChange={setSheets} type="number" />
      </div>

      {pricePerSheet !== null && (
        <div className="bg-primary/10 rounded-2xl p-5 text-center mt-2">
          <p className="text-sm text-muted-foreground">מחיר לדף</p>
          <p className="text-3xl font-bold text-primary mt-1">₪{pricePerSheet.toFixed(4)}</p>
        </div>
      )}

      <div className="mt-auto pt-4">
        <Button
          variant="scan"
          className="w-full h-14 rounded-xl"
          onClick={handleConfirm}
          disabled={!canCalculate || saving}
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className="!size-5" />
          )}
          {saving ? "שומר..." : "שמור תוצאה"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  highlight = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      <div className="relative">
        <Input
          type={type}
          inputMode={type === "number" ? "decimal" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`h-12 rounded-xl text-base ${highlight ? "border-accent ring-1 ring-accent" : ""}`}
          dir="rtl"
        />
        <Edit2 className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
      </div>
    </div>
  );
}
