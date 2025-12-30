export const schemaVersion = 20;

export const stores = {
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
};