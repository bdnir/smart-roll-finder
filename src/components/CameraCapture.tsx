import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraCaptureProps {
  onCapture: (imageBase64: string) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
      setError(null);
    } catch {
      setError("לא ניתן לגשת למצלמה. אנא אפשר גישה למצלמה בהגדרות הדפדפן.");
    }
  }, [stream]);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    stream?.getTracks().forEach((t) => t.stop());
    onCapture(dataUrl);
  };

  const toggleCamera = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startCamera(next);
  };

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6 text-center gap-4">
        <p className="text-destructive font-medium">{error}</p>
        <Button variant="outline" onClick={onClose}>חזרה</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-foreground/95 flex flex-col" style={{ height: '100dvh' }}>
      <div className="flex-1 relative overflow-hidden min-h-0">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ WebkitTransform: 'translateZ(0)' }}
        />
        {/* Frame overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[85%] h-[60%] border-2 border-primary/60 rounded-2xl relative">
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
          </div>
        </div>
        <p className="absolute top-6 left-0 right-0 text-center text-primary-foreground text-sm font-medium">
          כוון את האריזה או תג המחיר בתוך המסגרת
        </p>
      </div>

      <div className="bg-background p-6 flex items-center justify-between" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
          <X className="!size-6" />
        </Button>
        <Button
          variant="scan"
          size="icon"
          onClick={handleCapture}
          className="!w-16 !h-16 rounded-full"
        >
          <Camera className="!size-7" />
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleCamera} className="rounded-full">
          <RotateCcw className="!size-5" />
        </Button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
