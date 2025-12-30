import { ShiftStatus } from '../types/enums';

export interface CashShift {
  id?: string;
  registerId: string; // reference to CashRegister
  businessId: string;
  userId: string; // cashier who opened this shift
  openedAt: Date;
  closedAt?: Date; // when shift was closed
  openingCash: number; // cash amount when shift opened
  closingCash?: number; // cash amount when shift closed
  expectedCash: number; // calculated expected cash at close
  actualCash?: number; // actual cash counted
  difference: number; // actual - expected
  status: ShiftStatus; // shift status
  notes?: string; // optional notes
  reconciledBy?: string; // userId who reconciled the shift
  reconciledAt?: Date; // when reconciliation was done
}