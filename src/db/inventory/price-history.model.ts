export interface PriceHistory {
  id?: string;
  productId: string;
  businessId: string;
  oldCost?: number;
  newCost: number;
  oldPrice?: number;
  newPrice: number;
  changeReason?: string; // 'initial', 'cost_update', 'price_change', 'promotion', etc.
  changedBy: string; // userId
  changedAt: Date;
  effectiveDate: Date; // when this price became effective
  metadata?: Record<string, any>; // additional info like promotion details
}