import { db, CashShift } from '../database';
import { InventoryServices } from './inventoryServices';

export interface ShiftSummary {
  shiftId: string;
  openedAt: Date;
  closedAt?: Date;
  openingCash: number;
  cashSales: number;
  cardSales: number;
  otherPayments: number;
  refunds: number;
  expectedCash: number;
  actualCash?: number;
  difference: number;
  totalSales: number;
  totalRevenue: number;
}

export class CashShiftService {
  // Register management (physical registers)
  static async createRegister(
    businessId: string,
    deviceId: string,
    userId: string,
    location?: string
  ): Promise<string> {
    await InventoryServices.requirePermission(userId, 'settings.business', businessId);

    const registerId = await db.cashRegisters.add({
      businessId,
      deviceId,
      location,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await InventoryServices.logAuditAction(
      businessId,
      userId,
      'settings.business',
      'cash_register',
      registerId,
      `Created cash register: ${deviceId}`,
      undefined,
      { deviceId, location }
    );

    return registerId;
  }

  static async getRegisters(businessId: string, userId: string): Promise<any[]> {
    await InventoryServices.requirePermission(userId, 'cashier.view_reports', businessId);

    return await db.cashRegisters
      .where('businessId')
      .equals(businessId)
      .toArray();
  }

  // Shift management
  static async openShift(
    registerId: string,
    userId: string,
    openingCash: number
  ): Promise<string> {
    const register = await db.cashRegisters.get(registerId);
    if (!register) {
      throw new Error('Cash register not found');
    }

    if (!register.isActive) {
      throw new Error('Cash register is not active');
    }

    await InventoryServices.requirePermission(userId, 'cashier.open_drawer', register.businessId);

    // Check if user already has an open shift
    const existingShift = await db.cashShifts
      .where('[userId+status]')
      .equals([userId, 'open'])
      .first();

    if (existingShift) {
      throw new Error('User already has an open shift');
    }

    const shiftId = await db.cashShifts.add({
      registerId,
      businessId: register.businessId,
      userId,
      openedAt: new Date(),
      openingCash,
      expectedCash: openingCash, // Initially just the opening cash
      difference: 0,
      status: 'open'
    });

    await InventoryServices.logAuditAction(
      register.businessId,
      userId,
      'cashier.close_shift',
      'cash_shift',
      shiftId.toString(),
      `Opened shift with $${openingCash} opening cash`,
      undefined,
      { registerId, openingCash }
    );

    return shiftId.toString();
  }

  static async closeShift(
    shiftId: string,
    userId: string,
    actualCash: number,
    notes?: string
  ): Promise<ShiftSummary> {
    const shift = await db.cashShifts.get(shiftId);
    if (!shift) {
      throw new Error('Shift not found');
    }

    if (shift.status !== 'open') {
      throw new Error('Shift is not open');
    }

    if (shift.userId !== userId) {
      throw new Error('Only the shift owner can close it');
    }

    await InventoryServices.requirePermission(userId, 'cashier.close_shift', shift.businessId);

    // Calculate shift summary
    const summary = await this.calculateShiftSummary(shiftId);

    const expectedCash = shift.openingCash + summary.cashSales - summary.refunds;
    const difference = actualCash - expectedCash;

    await db.cashShifts.update(shiftId, {
      closedAt: new Date(),
      closingCash: actualCash,
      expectedCash,
      difference,
      status: 'closed',
      notes
    });

    await InventoryServices.logAuditAction(
      shift.businessId,
      userId,
      'cashier.close_shift',
      'cash_shift',
      shiftId,
      `Closed shift - Expected: $${expectedCash}, Actual: $${actualCash}, Difference: $${difference}`,
      { status: 'open' },
      { status: 'closed', actualCash, expectedCash, difference, notes }
    );

    return {
      shiftId,
      openedAt: shift.openedAt,
      closedAt: new Date(),
      openingCash: shift.openingCash,
      ...summary,
      expectedCash,
      actualCash,
      difference
    };
  }

  static async reconcileShift(
    shiftId: string,
    reconciledBy: string,
    notes?: string
  ): Promise<void> {
    const shift = await db.cashShifts.get(shiftId);
    if (!shift) {
      throw new Error('Shift not found');
    }

    await InventoryServices.requirePermission(reconciledBy, 'cashier.view_reports', shift.businessId);

    await db.cashShifts.update(shiftId, {
      status: 'reconciled',
      reconciledBy,
      reconciledAt: new Date()
    });

    await InventoryServices.logAuditAction(
      shift.businessId,
      reconciledBy,
      'cashier.view_reports',
      'cash_shift',
      shiftId,
      `Reconciled shift: ${notes || 'No notes'}`,
      { status: shift.status },
      { status: 'reconciled', reconciledBy, reconciledAt: new Date(), notes }
    );
  }

  static async getCurrentShift(userId: string): Promise<CashShift | null> {
    const shift = await db.cashShifts
      .where('[userId+status]')
      .equals([userId, 'open'])
      .first();
    return shift || null;
  }

  static async getShiftHistory(
    businessId: string,
    userId: string,
    startDate?: Date,
    endDate?: Date,
    userFilter?: string,
    limit: number = 50
  ): Promise<CashShift[]> {
    await InventoryServices.requirePermission(userId, 'cashier.view_reports', businessId);

    let shifts = await db.cashShifts
      .where('businessId')
      .equals(businessId)
      .reverse()
      .limit(limit)
      .toArray();

    if (userFilter) {
      shifts = shifts.filter(s => s.userId === userFilter);
    }

    if (startDate) {
      shifts = shifts.filter(s => s.openedAt >= startDate);
    }

    if (endDate) {
      shifts = shifts.filter(s => (!s.closedAt || s.closedAt <= endDate));
    }

    return shifts;
  }

  static async calculateShiftSummary(shiftId: string): Promise<Omit<ShiftSummary, 'shiftId' | 'openedAt' | 'closedAt' | 'openingCash' | 'expectedCash' | 'actualCash' | 'difference'>> {
    const shift = await db.cashShifts.get(shiftId);
    if (!shift) {
      throw new Error('Shift not found');
    }

    // Get all sales and payments for this shift
    const sales = await db.sales.where('shiftId').equals(shiftId).toArray();
    const completedSales = sales.filter(s => s.paymentStatus === 'completed' && s.isActive);

    let cashSales = 0;
    let cardSales = 0;
    let otherPayments = 0;
    let refunds = 0;
    let totalRevenue = 0;

    for (const sale of completedSales) {
      totalRevenue += sale.total;

      const payments = await db.payments.where('shiftId').equals(shiftId).toArray();

      for (const payment of payments) {
        switch (payment.method) {
          case 'cash':
            cashSales += payment.amount;
            break;
          case 'card':
            cardSales += payment.amount;
            break;
          default:
            otherPayments += payment.amount;
            break;
        }
      }
    }

    // Calculate refunds (negative payments)
    const allPayments = await db.payments
      .where('shiftId')
      .equals(shiftId)
      .toArray();

    for (const payment of allPayments) {
      if (payment.amount < 0) {
        refunds += Math.abs(payment.amount);
      }
    }

    return {
      cashSales,
      cardSales,
      otherPayments,
      refunds,
      totalSales: completedSales.length,
      totalRevenue
    };
  }

  static async getShiftReport(
    shiftId: string,
    userId: string
  ): Promise<{
    shift: CashShift;
    summary: ShiftSummary;
    sales: any[];
    register: any;
  }> {
    const shift = await db.cashShifts.get(shiftId);
    if (!shift) {
      throw new Error('Shift not found');
    }

    await InventoryServices.requirePermission(userId, 'cashier.view_reports', shift.businessId);

    const register = await db.cashRegisters.get(shift.registerId);
    const summary = await this.calculateShiftSummary(shiftId);

    const expectedCash = shift.openingCash + summary.cashSales - summary.refunds;

    // Get sales summary
    const sales = await db.sales
      .where('shiftId')
      .equals(shiftId)
      .filter(s => s.paymentStatus === 'completed' && s.isActive)
      .toArray();

    const salesSummary = sales.map(sale => ({
      id: sale.id,
      total: sale.total,
      paymentStatus: sale.paymentStatus,
      createdAt: sale.createdAt
    }));

    return {
      shift,
      summary: {
        shiftId,
        openedAt: shift.openedAt,
        closedAt: shift.closedAt,
        openingCash: shift.openingCash,
        ...summary,
        expectedCash,
        actualCash: shift.closingCash,
        difference: shift.difference
      },
      sales: salesSummary,
      register
    };
  }

  static async forceCloseShift(
    shiftId: string,
    adminUserId: string,
    reason: string,
    declaredCash: number
  ): Promise<void> {
    const shift = await db.cashShifts.get(shiftId);
    if (!shift) {
      throw new Error('Shift not found');
    }

    await InventoryServices.requirePermission(adminUserId, 'cashier.view_reports', shift.businessId);

    const summary = await this.calculateShiftSummary(shiftId);
    const expectedCash = shift.openingCash + summary.cashSales - summary.refunds;
    const difference = declaredCash - expectedCash;

    await db.cashShifts.update(shiftId, {
      closedAt: new Date(),
      closingCash: declaredCash,
      expectedCash,
      difference,
      status: 'closed',
      notes: `Force closed by admin: ${reason}`
    });

    await InventoryServices.logAuditAction(
      shift.businessId,
      adminUserId,
      'cashier.view_reports',
      'cash_shift',
      shiftId,
      `Force closed shift - Reason: ${reason}, Declared cash: $${declaredCash}`,
      { status: shift.status },
      { status: 'closed', closingCash: declaredCash, expectedCash, difference, reason }
    );
  }

  static async transferShift(
    shiftId: string,
    fromUserId: string,
    toUserId: string,
    adminUserId: string,
    reason: string
  ): Promise<void> {
    const shift = await db.cashShifts.get(shiftId);
    if (!shift) {
      throw new Error('Shift not found');
    }

    if (shift.status !== 'open') {
      throw new Error('Can only transfer open shifts');
    }

    await InventoryServices.requirePermission(adminUserId, 'users.update', shift.businessId);

    await db.cashShifts.update(shiftId, {
      userId: toUserId
    });

    await InventoryServices.logAuditAction(
      shift.businessId,
      adminUserId,
      'users.update',
      'cash_shift',
      shiftId,
      `Transferred shift from ${fromUserId} to ${toUserId}: ${reason}`,
      { userId: fromUserId },
      { userId: toUserId, reason }
    );
  }
}