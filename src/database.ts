import Dexie, { Table } from 'dexie';

export type UserType = 'owner' | 'admin' | 'cashier';

export interface Business {
  id?: string;
  name: string;
  logoId?: string; // reference to fileStorage
  logo?: string; // deprecated - for migration only
  location: string;
  website?: string;
  email?: string;
  phone: string;
  createdAt: Date;
}

export interface User {
  id?: string;
  businessId?: string; // reference to business
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  phone: string;
  email: string;
  password: string; // hashed password
  pinHash?: string; // hashed PIN for POS operations
  profileImageId?: string; // reference to fileStorage
  profileImage?: string; // deprecated - for migration only
  type: UserType;
  isActive: boolean; // soft delete flag
  createdAt: Date;
  lastLogin?: Date;
}

export interface Session {
  id?: string;
  userId: string;
  deviceId: string;
  deviceFingerprint: string;
  // Tokens removed for security - stored encrypted separately
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  isActive: boolean;
  invalidatedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface JWTPayload {
  userId: string;
  deviceId: string;
  sessionId: string;
  businessId?: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

export interface PosSettings {
  id?: number;
  businessId: string;
  timezone: string;
  dateFormat: string;
  currency: string;
  createdAt: Date;
}

export type ProductType = 'piece' | 'package';

export type MovementType = 'entrada' | 'salida' | 'ajuste' | 'merma' | 'devolucion';

export type TaxType = 'IVA' | 'EXENTO' | 'TASA_CERO' | 'IEPS' | 'ISR';

export type Permission =
  // Product management
  | 'products.create'
  | 'products.read'
  | 'products.update'
  | 'products.delete'
  | 'products.adjust_price'
  | 'products.adjust_stock'

  // Inventory movements
  | 'inventory.entrada'
  | 'inventory.salida'
  | 'inventory.ajuste'
  | 'inventory.merma'
  | 'inventory.devolucion'

  // Sales and transactions
  | 'sales.create'
  | 'sales.read'
  | 'sales.cancel'
  | 'sales.refund'
  | 'sales.modify_price'

  // Cash register operations
  | 'cashier.open_drawer'
  | 'cashier.close_shift'
  | 'cashier.view_reports'

  // User management
  | 'users.create'
  | 'users.read'
  | 'users.update'
  | 'users.delete'

  // System settings
  | 'settings.business'
  | 'settings.pos'
  | 'settings.permissions'

  // File management
  | 'files.upload'
  | 'files.read'
  | 'files.delete'

  // Reports and analytics
  | 'reports.inventory'
  | 'reports.sales'
  | 'reports.audit';



export interface Department {
  id?: string;
  businessId: string;
  name: string;
  iconId?: string; // reference to fileStorage
  icon?: string; // deprecated - for migration only
  description: string;
  isActive: boolean; // soft delete flag
  createdAt: Date;
}

export interface Product {
  id?: string;
  businessId: string;
  name: string;
  barcode: string;
  departmentId?: string; // optional reference to department
  type: ProductType; // 'piece' or 'package'
  packageContent?: number; // how many pieces in a package (if type is 'package')
  description: string;
  cost: number; // current cost price (can change)
  price: number; // current selling price (can change)
  imageId?: string; // reference to fileStorage
  image?: string; // deprecated - for migration only
  minStockLevel?: number; // minimum stock level for alerts
  taxType: TaxType; // type of tax applied to this product
  taxRate: number; // tax rate percentage (0 for EXENTO/TASA_CERO)
  isActive: boolean; // soft delete flag
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id?: string;
  businessId: string;
  name: string;
  description: string;
  departmentId?: string; // optional reference to department
  price: number; // service price
  imageId?: string; // reference to fileStorage
  image?: string; // deprecated - for migration only
  isActive: boolean; // soft delete flag
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryMovement {
  id?: string;
  productId: string;
  businessId: string;
  quantity: number; // positive for increases, negative for decreases
  type: MovementType;
  reason?: string; // optional description/reason for the movement
  userId: string; // who made the movement
  reference?: string; // optional reference (sale ID, purchase order, etc.)
  createdAt: Date;
}



export interface PermissionAssignment {
  id?: string;
  businessId: string;
  userId: string;
  permission: Permission;
  grantedBy: string; // userId who granted the permission
  grantedAt: Date;
}

export interface AuditLog {
  id?: string;
  businessId: string;
  userId: string;
  action: string; // permission or action performed
  resourceType: string; // 'product', 'sale', 'user', etc.
  resourceId?: string; // ID of the affected resource
  details?: string; // additional details about the action
  oldValue?: string; // JSON string of old values for updates
  newValue?: string; // JSON string of new values for updates
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'check' | 'credit';

export type PaymentStatus = 'pending' | 'completed' | 'cancelled' | 'refunded';

export interface Sale {
  id?: string;
  businessId: string;
  shiftId: string; // reference to CashShift
  customerId?: string; // reference to Customer (optional)
  userId: string; // cashier who created the sale
  total: number; // final total after discounts and taxes
  subtotal: number; // sum of all items before tax/discount
  tax: number; // total tax amount
  discount: number; // total discount amount
  paymentStatus: PaymentStatus;
  folio: string; // fiscal folio number (unique within series)
  series: string; // fiscal series (e.g., 'A', 'B', 'VENTA')
  notes?: string; // optional notes
  isActive: boolean; // soft delete flag
  createdAt: Date;
  completedAt?: Date; // when payment was completed
}

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

export interface Payment {
  id?: string;
  saleId: string;
  shiftId: string; // reference to CashShift
  method: PaymentMethod;
  amount: number;
  reference?: string; // transaction ID, check number, etc.
  processedBy?: string; // userId who processed the payment
  processedAt: Date;
  notes?: string;
}

export interface CashRegister {
  id?: string;
  businessId: string;
  deviceId: string; // unique identifier for this physical register
  location?: string; // physical location description
  isActive: boolean; // if this register is available for use
  createdAt: Date;
  updatedAt: Date;
}

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
  status: 'open' | 'closed' | 'reconciled'; // shift status
  notes?: string; // optional notes
  reconciledBy?: string; // userId who reconciled the shift
  reconciledAt?: Date; // when reconciliation was done
}

export type FileType = 'image' | 'document' | 'other';

export interface FileStorage {
  id?: string;
  businessId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number; // in bytes
  fileType: FileType;
  data: Blob; // binary data
  checksum?: string; // for integrity verification
  uploadedBy: string; // userId
  uploadedAt: Date;
  metadata?: Record<string, any>; // additional metadata
}

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

export interface Customer {
  id?: string;
  businessId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string; // RFC in Mexico, RUT in other countries
  customerType: 'individual' | 'business'; // persona física vs moral
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

    this.version(20).stores({
      users: 'id, email, phone, type, isActive, createdAt, lastLogin',
      businesses: 'id, name, location, phone, createdAt',
      sessions: 'id, userId, deviceId, createdAt, expiresAt, lastActivity, isActive, invalidatedAt',
      posSettings: '++id, businessId, timezone, dateFormat, currency, createdAt',
      departments: 'id, businessId, name, isActive, createdAt',
      products: 'id, businessId, name, [businessId+barcode], departmentId, type, isActive, createdAt, updatedAt',
      services: 'id, businessId, name, departmentId, isActive, createdAt, updatedAt',
      inventoryMovements: 'id, productId, businessId, type, createdAt',
      permissionAssignments: 'id, businessId, userId, permission, grantedAt',
      auditLogs: 'id, businessId, userId, action, resourceType, resourceId, createdAt',
      sales: 'id, businessId, shiftId, userId, paymentStatus, [businessId+series+folio], isActive, createdAt, completedAt',
      saleItems: 'id, saleId, shiftId, productId, createdAt',
      payments: 'id, saleId, shiftId, method, processedAt',
      cashRegisters: 'id, businessId, deviceId, isActive, createdAt, updatedAt',
      cashShifts: 'id, registerId, businessId, userId, status, openedAt, closedAt',
      fileStorage: 'id, businessId, fileName, fileType, uploadedAt',
      priceHistory: 'id, productId, businessId, changedAt, effectiveDate',
      customers: 'id, businessId, name, email, phone, taxId, customerType, isActive, createdAt, updatedAt'
    });
  }
}

export const db = new AppDatabase();