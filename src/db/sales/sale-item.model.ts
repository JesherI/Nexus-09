import { TaxType } from '../types/enums';

export interface SaleItem {
  id?: string;
  saleId: string;
  shiftId: string; // reference to CashShift for the sale
  productId: string;
  quantity: number;
  costAtSale: number; // product cost at time of sale (frozen)
  priceAtSale: number; // selling price per unit at time of sale (frozen)
  taxTypeAtSale: TaxType; // tax type applied at time of sale (frozen)
  taxRateAtSale: number; // tax rate percentage at time of sale (frozen)
  subtotal: number; // quantity * priceAtSale (before tax/discount)
  taxAmount: number; // tax amount calculated for this item
  discountAmount?: number; // discount amount applied to this item
  total: number; // final total for this item (after tax and discount)
  createdAt: Date;
}