import { CustomerType } from '../types/enums';

export interface Customer {
  id?: string;
  businessId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string; // RFC in Mexico, RUT in other countries
  customerType: CustomerType; // persona física vs moral
  creditLimit?: number;
  currentBalance: number;
  lastPurchaseDate?: Date;
  totalPurchases: number; // total amount spent
  purchaseCount: number; // number of purchases
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}