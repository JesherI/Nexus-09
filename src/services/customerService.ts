import { db, Customer } from '../database';
import { InventoryServices } from './inventoryServices';

export interface CustomerSummary {
  totalSpent: number;
  purchaseCount: number;
  averagePurchase: number;
  lastPurchaseDate?: Date;
  creditUsed: number;
  creditAvailable: number;
}

export class CustomerService {
  static async createCustomer(customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'currentBalance' | 'totalPurchases' | 'purchaseCount'>): Promise<string> {
    await InventoryServices.requirePermission(customerData.businessId, 'users.create');

    const customerId = await db.customers.add({
      ...customerData,
      currentBalance: 0,
      totalPurchases: 0,
      purchaseCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await InventoryServices.logAuditAction(
      customerData.businessId,
      'system', // Since we don't have user context here
      'users.create',
      'customer',
      customerId.toString(),
      'Created new customer',
      undefined,
      customerData
    );

    return customerId.toString();
  }

  static async getCustomer(customerId: string, businessId: string): Promise<Customer | null> {
    const customer = await db.customers.get(customerId);
    if (!customer || customer.businessId !== businessId || !customer.isActive) {
      return null;
    }
    return customer;
  }

  static async getCustomers(businessId: string, includeInactive: boolean = false): Promise<Customer[]> {
    await InventoryServices.requirePermission(businessId, 'users.read');

    let customers = await db.customers.where('businessId').equals(businessId).toArray();
    if (!includeInactive) {
      customers = customers.filter(c => c.isActive);
    }
    return customers;
  }

  static async searchCustomers(businessId: string, query: string): Promise<Customer[]> {
    await InventoryServices.requirePermission(businessId, 'users.read');

    const customers = await this.getCustomers(businessId);
    const searchTerm = query.toLowerCase();

    return customers.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchTerm) ||
      customer.phone?.toLowerCase().includes(searchTerm) ||
      customer.taxId?.toLowerCase().includes(searchTerm)
    );
  }

  static async updateCustomer(customerId: string, updates: Partial<Omit<Customer, 'id' | 'businessId' | 'createdAt'>>, userId: string): Promise<void> {
    const customer = await db.customers.get(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    await InventoryServices.requirePermission(userId, 'users.update', customer.businessId);

    await db.customers.update(customerId, {
      ...updates,
      updatedAt: new Date()
    });

    await InventoryServices.logAuditAction(
      customer.businessId,
      userId,
      'users.update',
      'customer',
      customerId,
      'Updated customer',
      customer,
      { ...customer, ...updates }
    );
  }

  static async deactivateCustomer(customerId: string, userId: string): Promise<void> {
    const customer = await db.customers.get(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    await InventoryServices.requirePermission(userId, 'users.delete', customer.businessId);

    await db.customers.update(customerId, {
      isActive: false,
      updatedAt: new Date()
    });

    await InventoryServices.logAuditAction(
      customer.businessId,
      userId,
      'users.delete',
      'customer',
      customerId,
      'Deactivated customer',
      { isActive: true },
      { isActive: false }
    );
  }

  static async getCustomerSummary(customerId: string, businessId: string): Promise<CustomerSummary> {
    const customer = await this.getCustomer(customerId, businessId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Get all completed sales for this customer
    const sales = await db.sales
      .where('customerId')
      .equals(customerId)
      .filter(s => s.paymentStatus === 'completed' && s.isActive)
      .toArray();

    const totalSpent = sales.reduce((sum, sale) => sum + sale.total, 0);
    const purchaseCount = sales.length;
    const averagePurchase = purchaseCount > 0 ? totalSpent / purchaseCount : 0;
    const lastPurchaseDate = sales.length > 0
      ? new Date(Math.max(...sales.map(s => s.createdAt.getTime())))
      : undefined;

    const creditUsed = customer.currentBalance;
    const creditAvailable = (customer.creditLimit || 0) - creditUsed;

    return {
      totalSpent,
      purchaseCount,
      averagePurchase,
      lastPurchaseDate,
      creditUsed,
      creditAvailable
    };
  }

  static async recordCustomerPurchase(customerId: string, amount: number): Promise<void> {
    const customer = await db.customers.get(customerId);
    if (!customer) return;

    await db.customers.update(customerId, {
      currentBalance: customer.currentBalance + amount,
      totalPurchases: customer.totalPurchases + amount,
      purchaseCount: customer.purchaseCount + 1,
      lastPurchaseDate: new Date(),
      updatedAt: new Date()
    });
  }

  static async findCustomerByTaxId(businessId: string, taxId: string): Promise<Customer | null> {
    const customer = await db.customers
      .where('[businessId+taxId]')
      .equals([businessId, taxId])
      .filter(c => c.isActive)
      .first();
    return customer || null;
  }

  static async findCustomerByPhone(businessId: string, phone: string): Promise<Customer | null> {
    const customer = await db.customers
      .where('[businessId+phone]')
      .equals([businessId, phone])
      .filter(c => c.isActive)
      .first();
    return customer || null;
  }

  static async getTopCustomers(businessId: string, limit: number = 10): Promise<Array<Customer & { totalSpent: number }>> {
    await InventoryServices.requirePermission(businessId, 'reports.sales');

    const customers = await this.getCustomers(businessId);

    const customersWithTotals = await Promise.all(
      customers.map(async (customer) => {
        const summary = await this.getCustomerSummary(customer.id!, businessId);
        return {
          ...customer,
          totalSpent: summary.totalSpent
        };
      })
    );

    return customersWithTotals
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit);
  }
}