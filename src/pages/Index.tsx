import { useState } from "react";
import OrderSetup from "@/components/OrderSetup";
import ScanningScreen from "@/components/ScanningScreen";

export interface OrderData {
  counterparty: string;
  orderNumber: string;
  plannedQuantity: number | null;
}

const Index = () => {
  const [orderData, setOrderData] = useState<OrderData | null>(null);

  if (!orderData) {
    return <OrderSetup onStart={setOrderData} />;
  }

  return (
    <ScanningScreen
      orderData={orderData}
      onBack={() => setOrderData(null)}
    />
  );
};

export default Index;
