import { PaymentStatus } from '../types/enums';

export interface Sale {
  id?: string;
  businessId: string;
  shiftId: string; // reference to CashShift
  customerId?: string; // reference to Customer (optional)
  userId: string; // cashier who created the sale
  total: number; // final total after discounts and taxes
  subtotal: number; // sum of all items before tax/discount
  tax: number; // total tax amount
  discount: number; // total discount amount
  paymentStatus: PaymentStatus;
  folio: string; // fiscal folio number (unique within series)
  series: string; // fiscal series (e.g., 'A', 'B', 'VENTA')
  notes?: string; // optional notes
  isActive: boolean; // soft delete flag
  createdAt: Date;
  completedAt?: Date; // when payment was completed
}