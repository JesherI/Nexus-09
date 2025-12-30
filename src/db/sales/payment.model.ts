import { PaymentMethod } from '../types/enums';

export interface Payment {
  id?: string;
  saleId: string;
  shiftId: string; // reference to CashShift
  method: PaymentMethod;
  amount: number;
  reference?: string; // transaction ID, check number, etc.
  processedBy?: string; // userId who processed the payment
  processedAt: Date;
  notes?: string;
}