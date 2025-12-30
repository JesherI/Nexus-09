import { db, PriceHistory } from '../database';
import { InventoryServices } from './inventoryServices';

export interface PriceUpdate {
  cost?: number;
  price?: number;
  reason?: string;
  effectiveDate?: Date;
  metadata?: Record<string, any>;
}

export class PriceService {
  // Get current price for a product
  static async getCurrentPrice(productId: string): Promise<{ cost: number; price: number; taxRate: number } | null> {
    const product = await db.products.get(productId);
    if (!product || !product.isActive) return null;

    return {
      cost: product.cost,
      price: product.price,
      taxRate: product.taxRate || 0
    };
  }

  // Update product price with history tracking
  static async updateProductPrice(
    productId: string,
    updates: PriceUpdate,
    userId: string
  ): Promise<void> {
    const product = await db.products.get(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    await InventoryServices.requirePermission(userId, 'products.adjust_price', product.businessId);

    const oldCost = product.cost;
    const oldPrice = product.price;
    const newCost = updates.cost ?? oldCost;
    const newPrice = updates.price ?? oldPrice;

    // Only update if there's an actual change
    if (newCost === oldCost && newPrice === oldPrice) {
      return;
    }

    // Update product
    const updateData: any = { updatedAt: new Date() };
    if (updates.cost !== undefined) updateData.cost = newCost;
    if (updates.price !== undefined) updateData.price = newPrice;

    await db.products.update(productId, updateData);

    // Record price history
    await db.priceHistory.add({
      productId,
      businessId: product.businessId,
      oldCost: updates.cost !== undefined ? oldCost : undefined,
      newCost,
      oldPrice: updates.price !== undefined ? oldPrice : undefined,
      newPrice,
      changeReason: updates.reason || 'price_update',
      changedBy: userId,
      changedAt: new Date(),
      effectiveDate: updates.effectiveDate || new Date(),
      metadata: updates.metadata
    });

    // Log audit action
    await InventoryServices.logAuditAction(
      product.businessId,
      userId,
      'products.adjust_price',
      'product',
      productId,
      `Price updated: ${updates.reason || 'Manual update'}`,
      { cost: oldCost, price: oldPrice },
      { cost: newCost, price: newPrice }
    );
  }

  // Bulk price updates
  static async bulkUpdatePrices(
    updates: Array<{ productId: string; cost?: number; price?: number }>,
    reason: string,
    userId: string
  ): Promise<void> {
    const productIds = updates.map(u => u.productId);
    const products = await db.products.where('id').anyOf(productIds).toArray();

    if (products.length === 0) return;

    const businessId = products[0].businessId;

    // Check permission
    await InventoryServices.requirePermission(userId, 'products.adjust_price', businessId);

    // Process each update
    for (const update of updates) {
      const product = products.find(p => p.id === update.productId);
      if (!product) continue;

      await this.updateProductPrice(update.productId, {
        cost: update.cost,
        price: update.price,
        reason,
        metadata: { bulkUpdate: true }
      }, userId);
    }

    await InventoryServices.logAuditAction(
      businessId,
      userId,
      'products.adjust_price',
      'bulk_update',
      undefined,
      `Bulk price update: ${updates.length} products, reason: ${reason}`,
      undefined,
      { updates, reason }
    );
  }

  // Get price history for a product
  static async getPriceHistory(
    productId: string,
    userId: string,
    limit: number = 50
  ): Promise<PriceHistory[]> {
    const product = await db.products.get(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    await InventoryServices.requirePermission(userId, 'products.read', product.businessId);

    return await db.priceHistory
      .where('productId')
      .equals(productId)
      .reverse()
      .limit(limit)
      .toArray();
  }

  // Calculate margin and profit
  static calculateMargin(cost: number, price: number): number {
    if (cost === 0) return 0;
    return ((price - cost) / cost) * 100;
  }

  static calculateProfit(cost: number, price: number): number {
    return price - cost;
  }

  // Get products with pricing info
  static async getProductsWithPricing(
    businessId: string,
    userId: string,
    includeInactive: boolean = false
  ): Promise<Array<{
    product: any;
    currentMargin: number;
    currentProfit: number;
    lastPriceChange?: Date;
  }>> {
    await InventoryServices.requirePermission(userId, 'products.read', businessId);

    const products = await db.products
      .where('businessId')
      .equals(businessId)
      .filter(p => includeInactive || p.isActive)
      .toArray();

    const result = await Promise.all(products.map(async (product) => {
      const margin = this.calculateMargin(product.cost, product.price);
      const profit = this.calculateProfit(product.cost, product.price);

      // Get last price change
      const lastChange = await db.priceHistory
        .where('productId')
        .equals(product.id!)
        .reverse()
        .limit(1)
        .first();

      return {
        product,
        currentMargin: margin,
        currentProfit: profit,
        lastPriceChange: lastChange?.changedAt
      };
    }));

    return result;
  }

  // Validate price update
  static validatePriceUpdate(cost: number, price: number): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (cost < 0) {
      errors.push('Cost cannot be negative');
    }

    if (price < 0) {
      errors.push('Price cannot be negative');
    }

    if (price < cost) {
      errors.push('Selling price cannot be lower than cost (negative margin)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Get price statistics
  static async getPriceStatistics(businessId: string, userId: string): Promise<{
    totalProducts: number;
    averageMargin: number;
    averageProfit: number;
    priceChangesThisMonth: number;
    productsWithNegativeMargin: number;
  }> {
    await InventoryServices.requirePermission(userId, 'reports.inventory', businessId);

    const products = await this.getProductsWithPricing(businessId, userId);

    const totalProducts = products.length;
    const averageMargin = products.reduce((sum, p) => sum + p.currentMargin, 0) / totalProducts;
    const averageProfit = products.reduce((sum, p) => sum + p.currentProfit, 0) / totalProducts;

    // Count price changes this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const priceChanges = await db.priceHistory
      .where('businessId')
      .equals(businessId)
      .and(change => change.changedAt >= startOfMonth)
      .count();

    const productsWithNegativeMargin = products.filter(p => p.currentMargin < 0).length;

    return {
      totalProducts,
      averageMargin,
      averageProfit,
      priceChangesThisMonth: priceChanges,
      productsWithNegativeMargin
    };
  }
}