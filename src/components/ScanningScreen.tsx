import { useState, useCallback } from "react";
import { ArrowLeft, Trash2, Send, AlertTriangle } from "lucide-react";
import type { OrderData } from "@/pages/Index";
import BarcodeScanner from "./BarcodeScanner";
import { scanFeedback } from "@/lib/scan-feedback";

interface Props {
  orderData: OrderData;
  onBack: () => void;
}


const ScanningScreen = ({ orderData, onBack }: Props) => {
  const [scannedCodes, setScannedCodes] = useState<{ id: string; code: string; time: string }[]>([]);
  const [showSentModal, setShowSentModal] = useState(false);

  const { plannedQuantity } = orderData;
  const scannedCount = scannedCodes.length;
  const limitReached = plannedQuantity !== null && scannedCount >= plannedQuantity;
  const canSend = plannedQuantity === null
    ? scannedCount > 0
    : scannedCount === plannedQuantity;

  const handleScan = useCallback((code: string) => {
    if (limitReached) return;
    scanFeedback();
    const now = new Date();
    const time = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setScannedCodes((prev) => [
      { id: crypto.randomUUID(), code, time },
      ...prev,
    ]);
  }, [limitReached]);

  const handleDelete = useCallback((id: string) => {
    setScannedCodes((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleSend = () => {
    if (!canSend) return;
    setShowSentModal(true);
    setTimeout(() => {
      setShowSentModal(false);
      onBack();
    }, 2000);
  };

  const progressPercent = plannedQuantity
    ? Math.min((scannedCount / plannedQuantity) * 100, 100)
    : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Header */}
      <div className="px-4 pt-10 pb-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-muted-foreground active:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs">Назад</span>
          </button>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Заказ</p>
            <p className="text-xs font-mono text-foreground">{orderData.orderNumber}</p>
          </div>
        </div>

        {/* Counter */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Отсканировано</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-primary font-mono">{scannedCount}</span>
              {plannedQuantity !== null && (
                <span className="text-lg text-muted-foreground font-mono">/ {plannedQuantity}</span>
              )}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{orderData.counterparty}</p>
        </div>

        {/* Progress bar */}
        {plannedQuantity !== null && (
          <div className="mt-2.5 mb-1">
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: limitReached ? "hsl(var(--scan-success))" : "hsl(var(--primary))",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Camera scanner */}
      <div className="px-4 pt-2">
        <BarcodeScanner onScan={handleScan} disabled={limitReached} />
      </div>

      {/* Scanned list */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {scannedCodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-6">
            <p className="text-xs text-muted-foreground/40">Отсканированные коды появятся здесь</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {scannedCodes.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-3 bg-card border border-border/50 rounded-xl px-3 py-2.5 slide-in-right group"
              >
                <span className="text-[10px] text-muted-foreground/40 font-mono w-5 text-right shrink-0">
                  {scannedCount - index}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-foreground truncate">{item.code}</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">{item.time}</p>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 rounded-lg text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 active:scale-90 transition-all shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Limit warning */}
      {limitReached && (
        <div className="mx-4 mb-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 flex items-center gap-3 fade-in-up">
          <AlertTriangle className="w-4 h-4 text-primary shrink-0" />
          <p className="text-xs text-primary">Плановое количество достигнуто</p>
        </div>
      )}

      {/* Send button */}
      <div className="px-4 pb-6 pt-2 border-t border-border/30">
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-20 disabled:cursor-not-allowed bg-primary text-primary-foreground"
        >
          <Send className="w-4 h-4" />
          Отправить данные
        </button>
      </div>

      {/* Sent modal */}
      {showSentModal && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-50 fade-in-up">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Send className="w-7 h-7 text-primary" />
            </div>
            <p className="text-lg font-bold text-foreground">Данные отправлены</p>
            <p className="text-sm text-muted-foreground mt-1">
              {scannedCount} {scannedCount === 1 ? "упаковка" : scannedCount < 5 ? "упаковки" : "упаковок"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanningScreen;
