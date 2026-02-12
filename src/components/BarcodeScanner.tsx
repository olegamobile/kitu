import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, CameraOff, Zap, ZapOff } from "lucide-react";

interface Props {
  onScan: (code: string) => void;
  disabled?: boolean;
}

const BarcodeScanner = ({ onScan, disabled }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<any>(null);
  const lastScannedRef = useRef<string>("");
  const lastScannedTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);

  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [scanMethod, setScanMethod] = useState<"native" | "html5-qrcode" | null>(null);

  const DEBOUNCE_MS = 1500;

  const handleDetected = useCallback(
    (code: string) => {
      if (disabled) return;
      const now = Date.now();
      if (code === lastScannedRef.current && now - lastScannedTimeRef.current < DEBOUNCE_MS) return;
      lastScannedRef.current = code;
      lastScannedTimeRef.current = now;
      onScan(code);
    },
    [onScan, disabled]
  );

  // Check for native Barcode Detection API
  const hasNativeAPI = typeof window !== "undefined" && "BarcodeDetector" in window;

  const startNativeScanning = useCallback(
    (video: HTMLVideoElement) => {
      // @ts-ignore
      const detector = new window.BarcodeDetector({
        formats: ["code_128", "code_39", "ean_13", "ean_8", "data_matrix", "qr_code"],
      });

      const scan = async () => {
        if (!video || video.readyState < 2) {
          animFrameRef.current = requestAnimationFrame(scan);
          return;
        }
        try {
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0) {
            handleDetected(barcodes[0].rawValue);
          }
        } catch (e) {
          // ignore detection errors
        }
        animFrameRef.current = requestAnimationFrame(scan);
      };

      animFrameRef.current = requestAnimationFrame(scan);
      setScanMethod("native");
    },
    [handleDetected]
  );

  const startHtml5QrcodeScanning = useCallback(
    async (stream: MediaStream) => {
      const { Html5Qrcode } = await import("html5-qrcode");

      // Create a hidden container for html5-qrcode
      let container = document.getElementById("html5qr-scanner");
      if (!container) {
        container = document.createElement("div");
        container.id = "html5qr-scanner";
        container.style.display = "none";
        document.body.appendChild(container);
      }

      const scanner = new Html5Qrcode("html5qr-scanner");
      scannerRef.current = scanner;

      const videoTrack = stream.getVideoTracks()[0];
      // @ts-ignore - html5-qrcode internal method
      await scanner.start(
        { deviceId: { exact: videoTrack.getSettings().deviceId || "" } },
        {
          fps: 10,
          qrbox: { width: 280, height: 160 },
          aspectRatio: 1.0,
        },
        (decodedText: string) => {
          handleDetected(decodedText);
        },
        () => {}
      );
      setScanMethod("html5-qrcode");
    },
    [handleDetected]
  );

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check torch support
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as any;
      if (capabilities?.torch) {
        setHasTorch(true);
      }

      setCameraActive(true);

      // Try native API first, fallback to html5-qrcode
      if (hasNativeAPI && videoRef.current) {
        startNativeScanning(videoRef.current);
      } else {
        await startHtml5QrcodeScanning(stream);
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err.name === "NotAllowedError") {
        setError("Разрешите доступ к камере");
      } else if (err.name === "NotFoundError") {
        setError("Камера не найдена");
      } else {
        setError("Ошибка камеры: " + err.message);
      }
    }
  }, [hasNativeAPI, startNativeScanning, startHtml5QrcodeScanning]);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (scannerRef.current) {
      try {
        scannerRef.current.stop();
      } catch {}
      scannerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorch(false);
    setHasTorch(false);
    setScanMethod(null);
  }, []);

  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch } as any] });
      setTorch(!torch);
    } catch {}
  }, [torch]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="flex flex-col gap-2">
      {/* Camera viewport */}
      <div className="relative w-full aspect-[16/10] bg-black rounded-xl overflow-hidden border border-border/30">
        {cameraActive ? (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Scan area overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[70%] h-[50%] border-2 border-primary/60 rounded-lg relative">
                <div className="absolute -top-[1px] -left-[1px] w-5 h-5 border-t-2 border-l-2 border-primary rounded-tl-md" />
                <div className="absolute -top-[1px] -right-[1px] w-5 h-5 border-t-2 border-r-2 border-primary rounded-tr-md" />
                <div className="absolute -bottom-[1px] -left-[1px] w-5 h-5 border-b-2 border-l-2 border-primary rounded-bl-md" />
                <div className="absolute -bottom-[1px] -right-[1px] w-5 h-5 border-b-2 border-r-2 border-primary rounded-br-md" />
                {/* Scan line animation */}
                <div className="absolute left-2 right-2 h-0.5 bg-primary/80 animate-scan-line" />
              </div>
            </div>

            {/* Method badge */}
            {scanMethod && (
              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md">
                <p className="text-[9px] text-white/70 font-mono">
                  {scanMethod === "native" ? "Barcode API" : "html5-qrcode"}
                </p>
              </div>
            )}

            {/* Controls */}
            <div className="absolute top-2 right-2 flex gap-1.5">
              {hasTorch && (
                <button
                  onClick={toggleTorch}
                  className="w-8 h-8 bg-black/60 backdrop-blur-sm rounded-lg flex items-center justify-center active:scale-90 transition-transform"
                >
                  {torch ? <Zap className="w-4 h-4 text-yellow-400" /> : <ZapOff className="w-4 h-4 text-white/60" />}
                </button>
              )}
              <button
                onClick={stopCamera}
                className="w-8 h-8 bg-black/60 backdrop-blur-sm rounded-lg flex items-center justify-center active:scale-90 transition-transform"
              >
                <CameraOff className="w-4 h-4 text-white/60" />
              </button>
            </div>

            {disabled && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <p className="text-xs text-white/70">Сканирование остановлено</p>
              </div>
            )}
          </>
        ) : (
          <button
            onClick={startCamera}
            className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground active:bg-white/5 transition-colors"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Camera className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Начать сканирование</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">Наведите камеру на штрих-код</p>
            </div>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
};

export default BarcodeScanner;
