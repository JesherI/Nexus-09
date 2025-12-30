import Dexie, { Table } from 'dexie';

// Types
import { UserType, ProductType, MovementType, TaxType, PaymentMethod, PaymentStatus, FileType, CustomerType, ShiftStatus, TokenType } from './types/enums';
import { Permission } from './types/permissions';

// Models
import { User } from './auth/user.model';
import { Session, JWTPayload } from './auth/session.model';
import { PermissionAssignment } from './auth/permissions.model';
import { AuditLog } from './auth/audit.model';

import { Business } from './business/business.model';
import { PosSettings } from './business/pos-settings.model';

import { Product } from './inventory/product.model';
import { Department } from './inventory/department.model';
import { InventoryMovement } from './inventory/inventory-movement.model';
import { PriceHistory } from './inventory/price-history.model';
import { Service } from './inventory/service.model';

import { Sale } from './sales/sale.model';
import { SaleItem } from './sales/sale-item.model';
import { Payment } from './sales/payment.model';
import { CashRegister } from './sales/cash-register.model';
import { CashShift } from './sales/cash-shift.model';

import { Customer } from './customers/customer.model';

import { FileStorage } from './files/file-storage.model';

// Schema
import { schemaVersion, stores } from './schema';

class AppDatabase extends Dexie {
  users!: Table<User>;
  businesses!: Table<Business>;
  sessions!: Table<Session>;
  posSettings!: Table<PosSettings>;
  departments!: Table<Department>;
  products!: Table<Product>;
  services!: Table<Service>;
  inventoryMovements!: Table<InventoryMovement>;
  permissionAssignments!: Table<PermissionAssignment>;
  auditLogs!: Table<AuditLog>;
  sales!: Table<Sale>;
  saleItems!: Table<SaleItem>;
  payments!: Table<Payment>;
  cashRegisters!: Table<CashRegister>;
  cashShifts!: Table<CashShift>;
  fileStorage!: Table<FileStorage>;
  priceHistory!: Table<PriceHistory>;
  customers!: Table<Customer>;

  constructor() {
    super('NexusAppDB');
    this.version(schemaVersion).stores(stores);
  }
}

export const db = new AppDatabase();

// Export types for convenience
export type {
  UserType,
  ProductType,
  MovementType,
  TaxType,
  PaymentMethod,
  PaymentStatus,
  FileType,
  CustomerType,
  ShiftStatus,
  TokenType,
  Permission,
  User,
  Session,
  JWTPayload,
  PermissionAssignment,
  AuditLog,
  Business,
  PosSettings,
  Product,
  Department,
  Service,
  InventoryMovement,
  PriceHistory,
  Sale,
  SaleItem,
  Payment,
  CashRegister,
  CashShift,
  Customer,
  FileStorage
};