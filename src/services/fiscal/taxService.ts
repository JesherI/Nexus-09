import { db, TaxType } from '../database';
import { InventoryServices } from './inventoryServices';

export interface TaxConfiguration {
  type: TaxType;
  rate: number;
  description: string;
  isActive: boolean;
}

// Standard tax configurations for Mexico
export const MEXICAN_TAX_CONFIGS: TaxConfiguration[] = [
  { type: 'IVA', rate: 16, description: 'Impuesto al Valor Agregado 16%', isActive: true },
  { type: 'IVA', rate: 8, description: 'Impuesto al Valor Agregado 8% (reducción temporal)', isActive: false },
  { type: 'EXENTO', rate: 0, description: 'Exento de IVA', isActive: true },
  { type: 'TASA_CERO', rate: 0, description: 'Tasa Cero', isActive: true },
  { type: 'IEPS', rate: 0, description: 'Impuesto Especial sobre Producción y Servicios', isActive: true },
];

export class TaxService {
  // Get available tax configurations
  static getAvailableTaxConfigs(): TaxConfiguration[] {
    return MEXICAN_TAX_CONFIGS.filter(config => config.isActive);
  }

  // Validate tax configuration
  static validateTaxConfig(type: TaxType, rate: number): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (rate < 0) {
      errors.push('Tax rate cannot be negative');
    }

    if (rate > 100) {
      errors.push('Tax rate cannot exceed 100%');
    }

    // Specific validations by tax type
    switch (type) {
      case 'EXENTO':
      case 'TASA_CERO':
        if (rate !== 0) {
          errors.push(`${type} tax rate must be 0%`);
        }
        break;
      case 'IVA':
        if (rate < 0 || rate > 50) {
          errors.push('IVA rate should be between 0% and 50%');
        }
        break;
      case 'IEPS':
        // IEPS can vary widely depending on the product
        break;
      case 'ISR':
        if (rate < 0 || rate > 35) {
          errors.push('ISR rate should be between 0% and 35%');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Update product tax configuration
  static async updateProductTax(
    productId: string,
    taxType: TaxType,
    taxRate: number,
    userId: string
  ): Promise<void> {
    const product = await db.products.get(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    await InventoryServices.requirePermission(userId, 'products.update', product.businessId);

    // Validate tax configuration
    const validation = this.validateTaxConfig(taxType, taxRate);
    if (!validation.valid) {
      throw new Error(`Invalid tax configuration: ${validation.errors.join(', ')}`);
    }

    const oldTaxType = product.taxType;
    const oldTaxRate = product.taxRate;

    await db.products.update(productId, {
      taxType,
      taxRate,
      updatedAt: new Date()
    });

    await InventoryServices.logAuditAction(
      product.businessId,
      userId,
      'products.update',
      'product',
      productId,
      'Updated product tax configuration',
      { taxType: oldTaxType, taxRate: oldTaxRate },
      { taxType, taxRate }
    );
  }

  // Bulk update tax configurations
  static async bulkUpdateTax(
    updates: Array<{ productId: string; taxType: TaxType; taxRate: number }>,
    userId: string
  ): Promise<void> {
    const productIds = updates.map(u => u.productId);
    const products = await db.products.where('id').anyOf(productIds).toArray();

    if (products.length === 0) return;

    const businessId = products[0].businessId;

    await InventoryServices.requirePermission(userId, 'products.update', businessId);

    // Validate all updates first
    for (const update of updates) {
      const validation = this.validateTaxConfig(update.taxType, update.taxRate);
      if (!validation.valid) {
        throw new Error(`Invalid tax config for product ${update.productId}: ${validation.errors.join(', ')}`);
      }
    }

    // Apply updates
    for (const update of updates) {
      const product = products.find(p => p.id === update.productId);
      if (!product) continue;

      await db.products.update(update.productId, {
        taxType: update.taxType,
        taxRate: update.taxRate,
        updatedAt: new Date()
      });
    }

    await InventoryServices.logAuditAction(
      businessId,
      userId,
      'products.update',
      'bulk_update',
      undefined,
      `Bulk tax update: ${updates.length} products`,
      undefined,
      { updates }
    );
  }

  // Calculate tax amount for a given amount and tax config
  static calculateTax(amount: number, taxType: TaxType, taxRate: number): number {
    if (taxType === 'EXENTO' || taxType === 'TASA_CERO') {
      return 0;
    }

    return amount * (taxRate / 100);
  }

  // Get tax breakdown for products
  static async getTaxBreakdown(businessId: string, userId: string): Promise<{
    byTaxType: Record<string, { count: number; totalValue: number; totalTax: number }>;
    totalProducts: number;
    totalValue: number;
    totalTax: number;
  }> {
    await InventoryServices.requirePermission(userId, 'reports.inventory', businessId);

    const products = await db.products
      .where('[businessId+isActive]')
      .equals([businessId, 1])
      .toArray();

    const breakdown: Record<string, { count: number; totalValue: number; totalTax: number }> = {};
    let totalProducts = products.length;
    let totalValue = 0;
    let totalTax = 0;

    for (const product of products) {
      const taxType = product.taxType;
      if (!breakdown[taxType]) {
        breakdown[taxType] = { count: 0, totalValue: 0, totalTax: 0 };
      }

      breakdown[taxType].count++;
      breakdown[taxType].totalValue += product.price;
      breakdown[taxType].totalTax += this.calculateTax(product.price, product.taxType, product.taxRate);

      totalValue += product.price;
      totalTax += this.calculateTax(product.price, product.taxType, product.taxRate);
    }

    return {
      byTaxType: breakdown,
      totalProducts,
      totalValue,
      totalTax
    };
  }

  // Apply tax changes retroactively (dangerous - use with caution)
  static async applyTaxChangesRetroactively(
    productId: string,
    newTaxType: TaxType,
    newTaxRate: number,
    userId: string,
    reason: string
  ): Promise<{ affectedSales: number; totalAdjustment: number }> {
    const product = await db.products.get(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    await InventoryServices.requirePermission(userId, 'settings.business', product.businessId);

    // This is a complex operation that would require updating historical SaleItems
    // For now, we'll just log the intention and return a warning
    console.warn('Retroactive tax changes are complex and may affect historical reporting');
    console.warn('This operation should be performed by a tax professional');

    await InventoryServices.logAuditAction(
      product.businessId,
      userId,
      'settings.business',
      'product',
      productId,
      `Requested retroactive tax change: ${product.taxType} ${product.taxRate}% → ${newTaxType} ${newTaxRate}%`,
      { taxType: product.taxType, taxRate: product.taxRate },
      { newTaxType, newTaxRate, reason }
    );

    return {
      affectedSales: 0, // Would need to calculate
      totalAdjustment: 0 // Would need to calculate
    };
  }
}