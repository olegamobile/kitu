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
  const disabledRef = useRef(disabled);

  // Update ref whenever prop changes
  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [scanMethod, setScanMethod] = useState<"native" | "html5-qrcode" | null>(null);

  const DEBOUNCE_MS = 1500;

  const handleDetected = useCallback(
    (code: string) => {
      if (disabledRef.current) return;
      const now = Date.now();
      if (code === lastScannedRef.current && now - lastScannedTimeRef.current < DEBOUNCE_MS) return;

      // Telegram Haptic Feedback
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred("success");
      }

      lastScannedRef.current = code;
      lastScannedTimeRef.current = now;
      onScan(code);
    },
    [onScan]
  );

  // Check for native Barcode Detection API
  const hasNativeAPI = typeof window !== "undefined" && "BarcodeDetector" in window;

  const startNativeScanning = useCallback(
    (video: HTMLVideoElement) => {
      // @ts-ignore
      const detector = new window.BarcodeDetector({
        formats: ["code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e", "codabar", "itf"],
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
    async () => {
      const { Html5Qrcode } = await import("html5-qrcode");

      // Set method FIRST to ensure the div is visible in React
      setScanMethod("html5-qrcode");

      // Give React a frame to update visibility
      await new Promise(resolve => setTimeout(resolve, 50));

      let container = document.getElementById("html5qr-scanner");
      if (!container) {
        console.error("Scanner container #html5qr-scanner not found in DOM");
        setError("Код сканера не загружен");
        return;
      }
      // container.style.display = "block"; // This line is removed as the display is controlled by state

      const scanner = new Html5Qrcode("html5qr-scanner");
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: (viewWidth, viewHeight) => {
              const width = Math.min(viewWidth * 0.85, 400);
              const height = Math.min(viewHeight * 0.35, 180);
              return { width, height };
            },
            aspectRatio: 1.0,
            // @ts-ignore
            formatsToSupport: [
              2, // CODABAR
              3, // CODE_39
              4, // CODE_93
              5, // CODE_128
              7, // EAN_8
              8, // EAN_13
              9, // ITF
              14, // UPC_A
              15, // UPC_E
              16, // UPC_EAN_EXTENSION
            ]
          },
          (decodedText: string) => {
            handleDetected(decodedText);
          },
          () => { }
        );

        // @ts-ignore
        const stream = scanner.scannerPaused ? null : scanner.videoElement?.srcObject as MediaStream;
        if (stream) {
          streamRef.current = stream;
          const track = stream.getVideoTracks()[0];
          const capabilities = track.getCapabilities?.() as any;
          if (capabilities?.torch) {
            setHasTorch(true);
          }
        }
      } catch (err) {
        console.error("Html5Qrcode error:", err);
        setError("Ошибка камеры: " + (typeof err === 'string' ? err : "Нет доступа"));
        setScanMethod(null);
        throw err;
      }
    },
    [handleDetected]
  );

  const startCamera = useCallback(async () => {
    setError(null);
    setHasTorch(false);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      setError("Камера недоступна. Используйте HTTPS или localhost (Secure Context).");
      return;
    }

    try {
      setCameraActive(true);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Prefer html5-qrcode on mobile as native API is often unstable/buggy
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (hasNativeAPI && !isMobile) {
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

          const track = stream.getVideoTracks()[0];
          const capabilities = track.getCapabilities?.() as any;
          if (capabilities?.torch) {
            setHasTorch(true);
          }

          startNativeScanning(videoRef.current);
        }
      } else {
        await startHtml5QrcodeScanning();
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setCameraActive(false);
      if (err.name === "NotAllowedError") {
        setError("Разрешите доступ к камере");
      } else if (err.name === "NotFoundError") {
        setError("Камера не найдена");
      } else {
        setError("Ошибка камеры: " + err.message);
      }
    }
  }, [hasNativeAPI, startNativeScanning, startHtml5QrcodeScanning]);

  const stopCamera = useCallback(async () => {
    cancelAnimationFrame(animFrameRef.current);
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        const container = document.getElementById("html5qr-scanner");
        if (container) container.style.display = "none";
      } catch (e) {
        console.warn("Error stopping scanner:", e);
      }
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
    } catch { }
  }, [torch]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Auto-stop camera when disabled (limit reached)
  useEffect(() => {
    if (disabled && cameraActive) {
      stopCamera();
    }
  }, [disabled, cameraActive, stopCamera]);

  return (
    <div className="flex flex-col gap-2">
      {/* Camera viewport */}
      <div id="scanner-container" className="relative w-full aspect-[16/10] bg-black rounded-xl overflow-hidden border border-border/30">
        {cameraActive ? (
          <>
            {scanMethod === "native" && (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
            )}
            <div
              id="html5qr-scanner"
              className="absolute inset-0 z-[1]"
              style={{ display: scanMethod === "html5-qrcode" ? "block" : "none" }}
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Scan area overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
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
              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md z-20">
                <p className="text-[9px] text-white/70 font-mono">
                  {scanMethod === "native" ? "Barcode API" : "html5-qrcode"}
                </p>
              </div>
            )}

            {/* Controls */}
            <div className="absolute top-2 right-2 flex gap-1.5 z-20">
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
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
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
