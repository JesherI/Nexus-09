import { db, Sale, SaleItem, Payment, PaymentMethod, Product } from '../database';
import { InventoryServices } from './inventoryServices';
import { CashShiftService } from './cashShiftService';
import { AuthService } from './auth';
import { FiscalService } from './fiscalService';

export interface CartItem {
  productId: string;
  quantity: number;
  priceAtSale: number;
  discount?: number;
}

export interface SaleSummary {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
}

export class SaleService {
  // Cart/Cart management
  static async createSale(businessId: string, userId: string, shiftId: string, items: CartItem[]): Promise<string> {
    await InventoryServices.requirePermission(userId, 'sales.create', businessId);

    // Calculate totals
    const summary = await this.calculateSaleSummary(items);

    // Generate fiscal number
    const fiscalNumber = await FiscalService.generateFiscalNumber(businessId);

    // Create sale record
    const saleId = await db.sales.add({
      businessId,
      shiftId,
      userId,
      total: summary.total,
      subtotal: summary.subtotal,
      tax: summary.tax,
      discount: summary.discount,
      paymentStatus: 'pending',
      folio: fiscalNumber.folio,
      series: fiscalNumber.series,
      isActive: true,
      createdAt: new Date()
    });

    // Create sale items with frozen prices and tax calculations
    for (const item of items) {
      // Get current product info to freeze prices
      const product = await db.products.get(item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      const subtotal = item.quantity * item.priceAtSale;
      const discountAmount = item.discount || 0;
      const taxableAmount = subtotal - discountAmount;

      // Calculate tax based on tax type
      let taxAmount = 0;
      if (product.taxType === 'IVA' || product.taxType === 'IEPS') {
        taxAmount = taxableAmount * (product.taxRate / 100);
      } else if (product.taxType === 'EXENTO' || product.taxType === 'TASA_CERO') {
        taxAmount = 0;
      }

      const total = taxableAmount + taxAmount;

      await db.saleItems.add({
        saleId: saleId.toString(),
        shiftId,
        productId: item.productId,
        quantity: item.quantity,
        costAtSale: product.cost, // Freeze cost at sale time
        priceAtSale: item.priceAtSale, // Freeze selling price
        taxTypeAtSale: product.taxType, // Freeze tax type
        taxRateAtSale: product.taxRate, // Freeze tax rate
        subtotal,
        taxAmount,
        discountAmount,
        total,
        createdAt: new Date()
      });
    }

    await InventoryServices.logAuditAction(
      businessId,
      userId,
      'sales.create',
      'sale',
      saleId.toString(),
      `Created sale with ${items.length} items, total: $${summary.total}`,
      undefined,
      { items, summary }
    );

    return saleId.toString();
  }

  static async calculateSaleSummary(items: CartItem[]): Promise<SaleSummary> {
    let totalSubtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    for (const item of items) {
      const product = await db.products.get(item.productId);
      if (!product) continue;

      const itemSubtotal = item.quantity * item.priceAtSale;
      const itemDiscount = item.discount || 0;
      const taxableAmount = itemSubtotal - itemDiscount;

      // Calculate tax based on tax type
      let itemTax = 0;
      if (product.taxType === 'IVA' || product.taxType === 'IEPS') {
        itemTax = taxableAmount * (product.taxRate / 100);
      } else if (product.taxType === 'EXENTO' || product.taxType === 'TASA_CERO') {
        itemTax = 0;
      }

      totalSubtotal += itemSubtotal;
      totalTax += itemTax;
      totalDiscount += itemDiscount;
    }

    const total = totalSubtotal + totalTax - totalDiscount;

    return {
      subtotal: totalSubtotal,
      tax: totalTax,
      discount: totalDiscount,
      total
    };
  }

  // Payment processing
  static async processPayment(
    saleId: string,
    payments: Array<{ method: PaymentMethod; amount: number; reference?: string }>,
    userId: string
  ): Promise<{ change: number }> {
    const sale = await db.sales.get(saleId);
    if (!sale) {
      throw new Error('Sale not found');
    }

    await InventoryServices.requirePermission(userId, 'sales.create', sale.businessId);

    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

    if (totalPaid < sale.total) {
      throw new Error(`Payment amount $${totalPaid} is less than sale total $${sale.total}`);
    }

    // Update sale status
    await db.sales.update(saleId, {
      paymentStatus: 'completed',
      completedAt: new Date()
    });

    // Process inventory movements for each item
    const saleItems = await db.saleItems.where('saleId').equals(saleId).toArray();

    for (const item of saleItems) {
      await InventoryServices.recordStockSale(
        item.productId,
        item.quantity,
        userId,
        saleId
      );
    }

    // Record payments
    for (const payment of payments) {
      await db.payments.add({
        saleId,
        shiftId: sale.shiftId,
        method: payment.method,
        amount: payment.amount,
        reference: payment.reference,
        processedBy: userId,
        processedAt: new Date()
      });
    }

    // Calculate change
    const change = totalPaid - sale.total;

    await InventoryServices.logAuditAction(
      sale.businessId,
      userId,
      'sales.create',
      'sale',
      saleId,
      `Completed payment for sale - Total paid: $${totalPaid}, Change: $${change}`,
      { paymentStatus: 'pending' },
      { paymentStatus: 'completed', payments, totalPaid, change }
    );

    return { change };
  }

  // Sale management
  static async getSale(saleId: string, userId: string): Promise<Sale | null> {
    const sale = await db.sales.get(saleId);
    if (!sale) return null;

    await InventoryServices.requirePermission(userId, 'sales.read', sale.businessId);
    return sale;
  }

  static async getSaleWithItems(saleId: string, userId: string): Promise<{
    sale: Sale;
    items: SaleItem[];
    payments: Payment[];
  } | null> {
    const sale = await this.getSale(saleId, userId);
    if (!sale) return null;

    const [items, payments] = await Promise.all([
      db.saleItems.where('saleId').equals(saleId).toArray(),
      db.payments.where('saleId').equals(saleId).toArray()
    ]);

    return { sale, items, payments };
  }

  static async cancelSale(saleId: string, userId: string, pin?: string, reason?: string): Promise<void> {
    const sale = await db.sales.get(saleId);
    if (!sale) {
      throw new Error('Sale not found');
    }

    if (sale.paymentStatus === 'completed') {
      await InventoryServices.requirePermission(userId, 'sales.cancel', sale.businessId);

      // Validate PIN for POS operation
      if (!pin || !(await AuthService.verifyUserPin(userId, pin))) {
        throw new Error('Invalid PIN required for cancelling sale');
      }
    }

    // Update sale status
    await db.sales.update(saleId, {
      paymentStatus: 'cancelled',
      isActive: false
    });

    // If sale was completed, we need to reverse inventory movements
    if (sale.paymentStatus === 'completed') {
      await InventoryServices.cancelSale(saleId, userId, reason);
    }

    await InventoryServices.logAuditAction(
      sale.businessId,
      userId,
      'sales.cancel',
      'sale',
      saleId,
      `Cancelled sale: ${reason || 'No reason provided'}`,
      { paymentStatus: sale.paymentStatus },
      { paymentStatus: 'cancelled' }
    );
  }

  static async refundSale(saleId: string, refundAmount: number, userId: string, pin?: string, reason?: string): Promise<void> {
    const sale = await db.sales.get(saleId);
    if (!sale) {
      throw new Error('Sale not found');
    }

    await InventoryServices.requirePermission(userId, 'sales.refund', sale.businessId);

    // Validate PIN for POS operation
    if (!pin || !(await AuthService.verifyUserPin(userId, pin))) {
      throw new Error('Invalid PIN required for refunding sale');
    }

    if (sale.paymentStatus !== 'completed') {
      throw new Error('Can only refund completed sales');
    }

    await InventoryServices.processRefund(saleId, userId, refundAmount, reason);

    // Update sale status if fully refunded
    if (refundAmount >= sale.total) {
      await db.sales.update(saleId, {
        paymentStatus: 'refunded'
      });
    }

    await InventoryServices.logAuditAction(
      sale.businessId,
      userId,
      'sales.refund',
      'sale',
      saleId,
      `Processed refund of $${refundAmount}: ${reason || 'No reason provided'}`,
      { paymentStatus: sale.paymentStatus },
      { paymentStatus: refundAmount >= sale.total ? 'refunded' : sale.paymentStatus, refundAmount }
    );
  }

  // Reporting
  static async getSalesReport(
    businessId: string,
    userId: string,
    startDate?: Date,
    endDate?: Date,
    includeInactive: boolean = false
  ): Promise<{
    totalSales: number;
    totalRevenue: number;
    totalTax: number;
    totalDiscount: number;
    salesCount: number;
    averageSale: number;
  }> {
    await InventoryServices.requirePermission(userId, 'reports.sales', businessId);

    let sales = await db.sales.where('businessId').equals(businessId).toArray();
    if (!includeInactive) {
      sales = sales.filter(sale => sale.isActive);
    }

    if (startDate) {
      sales = sales.filter(sale => sale.createdAt >= startDate);
    }
    if (endDate) {
      sales = sales.filter(sale => sale.createdAt <= endDate);
    }

    const completedSales = sales.filter(sale => sale.paymentStatus === 'completed');

    const totalRevenue = completedSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalTax = completedSales.reduce((sum, sale) => sum + sale.tax, 0);
    const totalDiscount = completedSales.reduce((sum, sale) => sum + sale.discount, 0);
    const salesCount = completedSales.length;
    const averageSale = salesCount > 0 ? totalRevenue / salesCount : 0;

    return {
      totalSales: totalRevenue,
      totalRevenue,
      totalTax,
      totalDiscount,
      salesCount,
      averageSale
    };
  }

  static async getRecentSales(businessId: string, userId: string, limit: number = 50, includeInactive: boolean = false): Promise<Sale[]> {
    await InventoryServices.requirePermission(userId, 'sales.read', businessId);

    let sales = await db.sales
      .where('businessId')
      .equals(businessId)
      .reverse()
      .limit(limit)
      .toArray();

    if (!includeInactive) {
      sales = sales.filter(sale => sale.isActive);
    }

    return sales;
  }

  // Tax reporting methods
  static async getTaxSummary(businessId: string, userId: string, startDate?: Date, endDate?: Date): Promise<{
    totalTaxCollected: number;
    taxByType: Record<string, number>;
    exemptSales: number;
    taxableSales: number;
  }> {
    await InventoryServices.requirePermission(userId, 'reports.sales', businessId);

    let saleItems = await db.saleItems.toArray();

    // Filter by business and date
    const salesInRange = await db.sales
      .where('businessId')
      .equals(businessId)
      .filter(sale => {
        if (startDate && sale.createdAt < startDate) return false;
        if (endDate && sale.createdAt > endDate) return false;
        return sale.paymentStatus === 'completed' && sale.isActive;
      })
      .toArray();

    const saleIds = new Set(salesInRange.map(s => s.id));
    saleItems = saleItems.filter(item => saleIds.has(item.saleId));

    let totalTaxCollected = 0;
    const taxByType: Record<string, number> = {};
    let exemptSales = 0;
    let taxableSales = 0;

    for (const item of saleItems) {
      totalTaxCollected += item.taxAmount;

      if (!taxByType[item.taxTypeAtSale]) {
        taxByType[item.taxTypeAtSale] = 0;
      }
      taxByType[item.taxTypeAtSale] += item.taxAmount;

      if (item.taxTypeAtSale === 'EXENTO' || item.taxTypeAtSale === 'TASA_CERO') {
        exemptSales += item.subtotal;
      } else {
        taxableSales += item.subtotal;
      }
    }

    return {
      totalTaxCollected,
      taxByType,
      exemptSales,
      taxableSales
    };
  }

  static async getProductsByTaxType(businessId: string, userId: string): Promise<Record<string, Product[]>> {
    await InventoryServices.requirePermission(userId, 'products.read', businessId);

    const products = await db.products
      .where('[businessId+isActive]')
      .equals([businessId, 1])
      .toArray();

    const grouped: Record<string, Product[]> = {};
    for (const product of products) {
      if (!grouped[product.taxType]) {
        grouped[product.taxType] = [];
      }
      grouped[product.taxType].push(product);
    }

    return grouped;
  }

  // Complete sale workflow in one method
  static async processCompleteSale(
    businessId: string,
    userId: string,
    items: CartItem[],
    payments: Array<{ method: PaymentMethod; amount: number; reference?: string }>
  ): Promise<{
    saleId: string;
    change: number;
    sale: Sale;
    items: SaleItem[];
    payments: Payment[];
  }> {
    // Get current user's shift
    const currentShift = await CashShiftService.getCurrentShift(userId);
    if (!currentShift) {
      throw new Error('No active shift found. Please open a shift before processing sales.');
    }

    // Create the sale
    const saleId = await this.createSale(businessId, userId, currentShift.id!, items);

    // Process payment
    const { change } = await this.processPayment(saleId, payments, userId);

    // Get complete sale data
    const saleData = await this.getSaleWithItems(saleId, userId);
    if (!saleData) {
      throw new Error('Failed to retrieve sale data');
    }

    return {
      saleId,
      change,
      sale: saleData.sale,
      items: saleData.items,
      payments: saleData.payments
    };
  }
}