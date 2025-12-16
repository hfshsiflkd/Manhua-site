"use client";

// TODO: Replace with QPay integration
// This provider component abstracts the payment flow
// Current: Shows bank transfer instructions
// Future: Replace VipBankTransferPayment with VipQPayPayment component

import { VipBankTransferPayment } from "./VipBankTransferPayment";

interface VipPaymentProviderProps {
  planMonths: number;
  planPrice: number;
  username: string;
  isOpen: boolean;
  onClose: () => void;
}

export function VipPaymentProvider({
  planMonths,
  planPrice,
  username,
  isOpen,
  onClose,
}: VipPaymentProviderProps) {
  if (!isOpen) return null;

  // TODO: When QPay is ready, replace this with:
  // return <VipQPayPayment planMonths={planMonths} planPrice={planPrice} username={username} onClose={onClose} />;

  return (
    <VipBankTransferPayment
      planMonths={planMonths}
      planPrice={planPrice}
      username={username}
      onClose={onClose}
    />
  );
}

