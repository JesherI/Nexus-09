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