import { useState } from "react";
import { Package, ChevronRight, ScanBarcode } from "lucide-react";
import type { OrderData } from "@/pages/Index";

const COUNTERPARTIES = [
  "ООО «Ромашка»",
  "ИП Иванов А.С.",
  "ООО «ТоргСервис»",
  "АО «Фармацевт»",
  "ООО «Логистик Про»",
];

interface Props {
  onStart: (data: OrderData) => void;
}

const OrderSetup = ({ onStart }: Props) => {
  const [counterparty, setCounterparty] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [plannedQuantity, setPlannedQuantity] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const canStart = counterparty.trim() !== "" && orderNumber.trim() !== "";

  const handleStart = () => {
    if (!canStart) return;
    onStart({
      counterparty,
      orderNumber,
      plannedQuantity: plannedQuantity ? parseInt(plannedQuantity, 10) : null,
    });
  };

  const filteredParties = COUNTERPARTIES.filter((p) =>
    p.toLowerCase().includes(counterparty.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ScanBarcode className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Честный знак</h1>
            <p className="text-xs text-muted-foreground">Сканер КИТУ</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-5 space-y-4">
        <div className="space-y-1.5 relative">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Контрагент
          </label>
          <input
            type="text"
            value={counterparty}
            onChange={(e) => {
              setCounterparty(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Начните вводить название..."
            className="w-full h-12 bg-card border border-border rounded-xl px-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all text-sm"
          />
          {showDropdown && counterparty.length > 0 && filteredParties.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl overflow-hidden z-10 fade-in-up">
              {filteredParties.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setCounterparty(p);
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-secondary/60 transition-colors border-b border-border/50 last:border-b-0"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Номер заказа
          </label>
          <input
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="Например: 2024-001234"
            className="w-full h-12 bg-card border border-border rounded-xl px-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all text-sm font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Плановое кол-во упаковок{" "}
            <span className="text-muted-foreground/40 normal-case tracking-normal">(необязательно)</span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={plannedQuantity}
            onChange={(e) => setPlannedQuantity(e.target.value)}
            placeholder="—"
            min={1}
            className="w-full h-12 bg-card border border-border rounded-xl px-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all text-sm font-mono"
          />
        </div>

        {/* Info card */}
        <div className="bg-secondary/40 border border-border/50 rounded-xl p-4 mt-6">
          <div className="flex items-start gap-3">
            <Package className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              После нажатия «Начать» откроется экран сканирования штрихкодов КИТУ. Каждый отсканированный код будет добавлен в список.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom button */}
      <div className="px-5 pb-8 pt-4">
        <button
          onClick={handleStart}
          disabled={!canStart}
          className="w-full h-14 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed bg-primary text-primary-foreground active:scale-[0.98]"
        >
          Начать сканирование
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default OrderSetup;
