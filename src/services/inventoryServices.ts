import { db, Department, Product, Service, InventoryMovement, Permission, PermissionAssignment, AuditLog, TaxType } from '../database';

import { FileStorageService } from './fileStorageService';
import { PriceService } from './priceService';

export class InventoryServices {
  // Department methods
  static async createDepartment(departmentData: Omit<Department, 'id' | 'createdAt' | 'isActive'>): Promise<string> {
    try {
      const departmentId = await db.departments.add({
        ...departmentData,
        isActive: true,
        createdAt: new Date()
      });
      return departmentId.toString();
    } catch (error) {
      console.error('Error creating department:', error);
      throw new Error('Failed to create department');
    }
  }

  static async getDepartmentsByBusiness(businessId: string, includeInactive: boolean = false): Promise<Department[]> {
    try {
      if (includeInactive) {
        return await db.departments.where('businessId').equals(businessId).toArray();
      }
      return await db.departments
        .where('[businessId+isActive]')
        .equals([businessId, 1])
        .toArray();
    } catch (error) {
      console.error('Error getting departments:', error);
      throw new Error('Failed to get departments');
    }
  }

  static async updateDepartment(departmentId: string, updates: Partial<Omit<Department, 'id' | 'businessId' | 'createdAt'>>): Promise<void> {
    try {
      await db.departments.update(departmentId, updates);
    } catch (error) {
      console.error('Error updating department:', error);
      throw new Error('Failed to update department');
    }
  }

  static async deactivateDepartment(departmentId: string, userId: string): Promise<void> {
    try {
      const department = await db.departments.get(departmentId);
      if (!department) {
        throw new Error('Department not found');
      }

      await InventoryServices.requirePermission(userId, 'products.update', department.businessId);

      await db.departments.update(departmentId, {
        isActive: false
      });

      await InventoryServices.logAuditAction(
        department.businessId,
        userId,
        'products.update',
        'department',
        departmentId,
        'Deactivated department',
        { isActive: true },
        { isActive: false }
      );
    } catch (error) {
      console.error('Error deactivating department:', error);
      throw new Error('Failed to deactivate department');
    }
  }

  static async activateDepartment(departmentId: string, userId: string): Promise<void> {
    try {
      const department = await db.departments.get(departmentId);
      if (!department) {
        throw new Error('Department not found');
      }

      await InventoryServices.requirePermission(userId, 'products.update', department.businessId);

      await db.departments.update(departmentId, {
        isActive: true
      });

      await InventoryServices.logAuditAction(
        department.businessId,
        userId,
        'products.update',
        'department',
        departmentId,
        'Activated department',
        { isActive: false },
        { isActive: true, deletedAt: undefined }
      );
    } catch (error) {
      console.error('Error activating department:', error);
      throw new Error('Failed to activate department');
    }
  }

  // Product methods
  static getProductPrice(product: Product): number {
    return product.price;
  }

  static getCurrentSellingPrice(product: Product): number {
    return product.price;
  }

  static async getProductWithCurrentPrice(productId: string): Promise<Product & { currentSellingPrice: number } | undefined> {
    try {
      const product = await this.getProductById(productId);
      if (!product) return undefined;

      return {
        ...product,
        currentSellingPrice: this.getCurrentSellingPrice(product)
      };
    } catch (error) {
      console.error('Error getting product with current price:', error);
      throw new Error('Failed to get product with current price');
    }
  }

  static async getProductWithImage(productId: string): Promise<Product & { imageUrl?: string } | undefined> {
    try {
      const product = await this.getProductById(productId);
      if (!product) return undefined;

      let imageUrl: string | undefined;
      if (product.imageId) {
        const url = await FileStorageService.getFileUrl(product.imageId, product.businessId);
        imageUrl = url || undefined;
      } else if (product.image) {
        // Fallback to base64 for backward compatibility
        imageUrl = product.image;
      }

      return {
        ...product,
        imageUrl
      };
    } catch (error) {
      console.error('Error getting product with image:', error);
      throw new Error('Failed to get product with image');
    }
  }

  static async createProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'isActive'> & { taxType?: TaxType; taxRate?: number }, userId: string): Promise<string> {
    try {
      await this.requirePermission(userId, 'products.create', productData.businessId);

      // Check if barcode already exists for this business
      if (productData.barcode) {
        const existingProduct = await this.getProductByBarcode(productData.businessId, productData.barcode);
        if (existingProduct) {
          throw new Error(`Barcode ${productData.barcode} already exists for this business`);
        }
      }

      // Handle image upload if provided as File
      let imageId: string | undefined;
      if (productData.image && typeof productData.image !== 'string') {
        // Assume it's a File object
        const result = await FileStorageService.uploadFile(
          productData.image as File,
          productData.businessId,
          userId,
          'image'
        );
        imageId = result.fileId;
      } else if (typeof productData.image === 'string' && productData.image.startsWith('data:')) {
        // Handle base64 string
        const result = await FileStorageService.uploadFromBase64(
          productData.image,
          `product_${Date.now()}.jpg`,
          'image/jpeg',
          productData.businessId,
          userId
        );
        imageId = result.fileId;
      }

      const productToSave = {
        ...productData,
        taxType: productData.taxType ?? 'IVA',
        taxRate: productData.taxRate ?? 16, // Default 16% IVA for Mexico
        imageId: imageId || productData.imageId,
        image: undefined, // Remove old base64 data
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const productId = await db.products.add(productToSave);

      // Create initial price history record
      await PriceService.updateProductPrice(productId.toString(), {
        cost: productToSave.cost,
        price: productToSave.price,
        reason: 'initial',
        metadata: { created: true }
      }, userId);

      await this.logAuditAction(
        productData.businessId,
        userId,
        'products.create',
        'product',
        productId.toString(),
        'Created new product',
        undefined,
        productToSave
      );

      return productId.toString();
    } catch (error) {
      console.error('Error creating product:', error);
      throw new Error('Failed to create product');
    }
  }

  static async getProductsByBusiness(businessId: string, includeInactive: boolean = false): Promise<Product[]> {
    try {
      if (includeInactive) {
        return await db.products.where('businessId').equals(businessId).toArray();
      }
      return await db.products
        .where('[businessId+isActive]')
        .equals([businessId, 1])
        .toArray();
    } catch (error) {
      console.error('Error getting products:', error);
      throw new Error('Failed to get products');
    }
  }

  static async getProductsByDepartment(departmentId: string): Promise<Product[]> {
    try {
      return await db.products
        .where('departmentId').equals(departmentId)
        .and(product => product.isActive)
        .toArray();
    } catch (error) {
      console.error('Error getting products by department:', error);
      throw new Error('Failed to get products by department');
    }
  }

  static async getProductById(productId: string): Promise<Product | undefined> {
    try {
      return await db.products.get(productId);
    } catch (error) {
      console.error('Error getting product:', error);
      throw new Error('Failed to get product');
    }
  }

  static async getProductByBarcode(businessId: string, barcode: string): Promise<Product | undefined> {
    try {
      return await db.products
        .where('[businessId+barcode]')
        .equals([businessId, barcode])
        .first();
    } catch (error) {
      console.error('Error getting product by barcode:', error);
      throw new Error('Failed to get product by barcode');
    }
  }

  static async validateBarcode(businessId: string, barcode: string, excludeProductId?: string): Promise<boolean> {
    try {
      const existingProduct = await this.getProductByBarcode(businessId, barcode);
      if (!existingProduct) return true;
      if (excludeProductId && existingProduct.id === excludeProductId) return true;
      return false;
    } catch (error) {
      console.error('Error validating barcode:', error);
      return false;
    }
  }

  static async generateUniqueBarcode(businessId: string, baseBarcode?: string): Promise<string> {
    try {
      let barcode = baseBarcode || `AUTO${Date.now().toString().slice(-8)}`;

      // Keep trying until we find a unique barcode
      let counter = 0;
      while (!(await this.validateBarcode(businessId, barcode)) && counter < 1000) {
        barcode = `${baseBarcode || 'AUTO'}${Date.now().toString().slice(-6)}${counter}`;
        counter++;
      }

      if (counter >= 1000) {
        throw new Error('Could not generate unique barcode');
      }

      return barcode;
    } catch (error) {
      console.error('Error generating unique barcode:', error);
      throw new Error('Failed to generate unique barcode');
    }
  }

  static async getConflictingBarcodes(businessId: string): Promise<Array<{barcode: string, products: Product[]}>> {
    try {
      const products = await this.getProductsByBusiness(businessId);
      const barcodeGroups = new Map<string, Product[]>();

      // Group products by barcode
      for (const product of products) {
        if (!barcodeGroups.has(product.barcode)) {
          barcodeGroups.set(product.barcode, []);
        }
        barcodeGroups.get(product.barcode)!.push(product);
      }

      // Find barcodes with multiple products
      const conflicts: Array<{barcode: string, products: Product[]}> = [];
      for (const [barcode, products] of barcodeGroups) {
        if (products.length > 1) {
          conflicts.push({ barcode, products });
        }
      }

      return conflicts;
    } catch (error) {
      console.error('Error getting conflicting barcodes:', error);
      throw new Error('Failed to get conflicting barcodes');
    }
  }

  static async updateProduct(productId: string, updates: Partial<Omit<Product, 'id' | 'businessId' | 'createdAt'>>, userId: string): Promise<void> {
    try {
      const currentProduct = await this.getProductById(productId);
      if (!currentProduct) {
        throw new Error('Product not found');
      }

      // Check specific permissions for price adjustments
      if (updates.cost !== undefined || updates.price !== undefined) {
        await this.requirePermission(userId, 'products.adjust_price', currentProduct.businessId);
      } else {
        await this.requirePermission(userId, 'products.update', currentProduct.businessId);
      }

      // Check if barcode is being updated and if it conflicts
      if (updates.barcode && updates.barcode !== currentProduct.barcode) {
        const existingProduct = await this.getProductByBarcode(currentProduct.businessId, updates.barcode);
        if (existingProduct && existingProduct.id !== productId) {
          throw new Error(`Barcode ${updates.barcode} already exists for this business`);
        }
      }

      // Handle price updates through PriceService
      if (updates.cost !== undefined || updates.price !== undefined) {
        await PriceService.updateProductPrice(productId, {
          cost: updates.cost,
          price: updates.price,
          reason: 'manual_update'
        }, userId);
        // Remove price fields from direct update since PriceService handles them
        const { cost, price, ...otherUpdates } = updates;
        updates = otherUpdates;
      }

      await db.products.update(productId, { ...updates, updatedAt: new Date() });

      await this.logAuditAction(
        currentProduct.businessId,
        userId,
        'products.update',
        'product',
        productId,
        'Updated product',
        currentProduct,
        { ...currentProduct, ...updates }
      );
    } catch (error) {
      console.error('Error updating product:', error);
      throw new Error('Failed to update product');
    }
  }



  static async deactivateProduct(productId: string, userId: string): Promise<void> {
    try {
      const product = await this.getProductById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      await this.requirePermission(userId, 'products.delete', product.businessId);

      await db.products.update(productId, {
        isActive: false,
        updatedAt: new Date()
      });

      await this.logAuditAction(
        product.businessId,
        userId,
        'products.delete',
        'product',
        productId,
        'Deactivated product',
        { isActive: true },
        { isActive: false, deletedAt: new Date() }
      );
    } catch (error) {
      console.error('Error deactivating product:', error);
      throw new Error('Failed to deactivate product');
    }
  }

  static async activateProduct(productId: string, userId: string): Promise<void> {
    try {
      const product = await db.products.get(productId); // Get directly since it might be inactive
      if (!product) {
        throw new Error('Product not found');
      }

      await this.requirePermission(userId, 'products.update', product.businessId);

      await db.products.update(productId, {
        isActive: true,
        updatedAt: new Date()
      });

      await this.logAuditAction(
        product.businessId,
        userId,
        'products.update',
        'product',
        productId,
        'Activated product',
        { isActive: false },
        { isActive: true, deletedAt: undefined }
      );
    } catch (error) {
      console.error('Error activating product:', error);
      throw new Error('Failed to activate product');
    }
  }

  static async searchProducts(businessId: string, query: string): Promise<Product[]> {
    try {
      const allProducts = await this.getProductsByBusiness(businessId);
      const searchTerm = query.toLowerCase();

      return allProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.barcode.toLowerCase().includes(searchTerm) ||
        (product.description && product.description.toLowerCase().includes(searchTerm))
      );
    } catch (error) {
      console.error('Error searching products:', error);
      throw new Error('Failed to search products');
    }
  }

  static async getLowStockProducts(businessId: string): Promise<Product[]> {
    try {
      const products = await this.getProductsByBusiness(businessId);
      const lowStockProducts: Product[] = [];

      for (const product of products) {
        const currentStock = await this.calculateStockFromMovements(product.id!);
        if (product.minStockLevel !== undefined && currentStock <= product.minStockLevel) {
          lowStockProducts.push(product);
        }
      }

      return lowStockProducts;
    } catch (error) {
      console.error('Error getting low stock products:', error);
      throw new Error('Failed to get low stock products');
    }
  }

  // Inventory Movement methods
  static async createMovement(movementData: Omit<InventoryMovement, 'id' | 'createdAt'>): Promise<string> {
    try {
      const movementId = await db.inventoryMovements.add({
        ...movementData,
        createdAt: new Date()
      });
      return movementId.toString();
    } catch (error) {
      console.error('Error creating inventory movement:', error);
      throw new Error('Failed to create inventory movement');
    }
  }

  static async getMovementsByProduct(productId: string): Promise<InventoryMovement[]> {
    try {
      return await db.inventoryMovements.where('productId').equals(productId).sortBy('createdAt');
    } catch (error) {
      console.error('Error getting movements by product:', error);
      throw new Error('Failed to get movements by product');
    }
  }

  static async getMovementsByBusiness(businessId: string): Promise<InventoryMovement[]> {
    try {
      return await db.inventoryMovements.where('businessId').equals(businessId).sortBy('createdAt');
    } catch (error) {
      console.error('Error getting movements by business:', error);
      throw new Error('Failed to get movements by business');
    }
  }

  static async calculateStockFromMovements(productId: string): Promise<number> {
    try {
      const movements = await this.getMovementsByProduct(productId);
      return movements.reduce((total, movement) => total + movement.quantity, 0);
    } catch (error) {
      console.error('Error calculating stock from movements:', error);
      throw new Error('Failed to calculate stock from movements');
    }
  }

  static async recordStockEntry(productId: string, quantity: number, userId: string, reason?: string, reference?: string): Promise<string> {
    try {
      const product = await this.getProductById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      return await this.createMovement({
        productId,
        businessId: product.businessId,
        quantity: Math.abs(quantity), // Always positive for entries
        type: 'entrada',
        reason: reason || 'Entrada de inventario',
        userId,
        reference
      });
    } catch (error) {
      console.error('Error recording stock entry:', error);
      throw new Error('Failed to record stock entry');
    }
  }

  static async recordStockSale(productId: string, quantity: number, userId: string, reference?: string): Promise<string> {
    try {
      const product = await this.getProductById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      await this.requirePermission(userId, 'inventory.salida', product.businessId);

      // Create inventory movement
      const movementId = await this.createMovement({
        productId,
        businessId: product.businessId,
        quantity: -Math.abs(quantity), // Always negative for sales
        type: 'salida',
        reason: 'Venta',
        userId,
        reference
      });

      await this.logAuditAction(
        product.businessId,
        userId,
        'inventory.salida',
        'movement',
        movementId,
        `Sold ${quantity} units`,
        undefined,
        { productId, quantity, reference }
      );

      return movementId;
    } catch (error) {
      console.error('Error recording stock sale:', error);
      throw new Error('Failed to record stock sale');
    }
  }

  static async recordStockAdjustment(productId: string, quantity: number, userId: string, reason?: string): Promise<string> {
    try {
      const product = await this.getProductById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      await this.requirePermission(userId, 'inventory.ajuste', product.businessId);

      const movementId = await this.createMovement({
        productId,
        businessId: product.businessId,
        quantity,
        type: 'ajuste',
        reason: reason || 'Ajuste de inventario',
        userId
      });

      await this.logAuditAction(
        product.businessId,
        userId,
        'inventory.ajuste',
        'movement',
        movementId,
        `Adjusted stock by ${quantity} units`,
        undefined,
        { productId, quantity, reason }
      );

      return movementId;
    } catch (error) {
      console.error('Error recording stock adjustment:', error);
      throw new Error('Failed to record stock adjustment');
    }
  }

  static async recordStockLoss(productId: string, quantity: number, userId: string, reason?: string): Promise<string> {
    try {
      const product = await this.getProductById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      return await this.createMovement({
        productId,
        businessId: product.businessId,
        quantity: -Math.abs(quantity), // Always negative for losses
        type: 'merma',
        reason: reason || 'Pérdida de inventario',
        userId
      });
    } catch (error) {
      console.error('Error recording stock loss:', error);
      throw new Error('Failed to record stock loss');
    }
  }

  static async recordStockReturn(productId: string, quantity: number, userId: string, reason?: string, reference?: string): Promise<string> {
    try {
      const product = await this.getProductById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      return await this.createMovement({
        productId,
        businessId: product.businessId,
        quantity,
        type: 'devolucion',
        reason: reason || 'Devolución',
        userId,
        reference
      });
    } catch (error) {
      console.error('Error recording stock return:', error);
      throw new Error('Failed to record stock return');
    }
  }



  static async processSale(items: Array<{ productId: string, quantity: number, unitPrice: number }>, userId: string, reference?: string): Promise<{ movementIds: string[] }> {
    try {
      const movementIds: string[] = [];

      for (const item of items) {
        const movementId = await this.recordStockSale(item.productId, item.quantity, userId, reference);
        movementIds.push(movementId);
      }

      return { movementIds };
    } catch (error) {
      console.error('Error processing sale:', error);
      throw new Error('Failed to process sale');
    }
  }

  static async getSaleTotal(reference: string): Promise<number> {
    try {
      const saleItems = await db.saleItems.where('saleId').equals(reference).toArray();
      return saleItems.reduce((total, item) => total + item.total, 0);
    } catch (error) {
      console.error('Error getting sale total:', error);
      throw new Error('Failed to get sale total');
    }
  }

  static async getSalesSummary(businessId: string, startDate?: Date, endDate?: Date): Promise<{
    totalSales: number;
    totalRevenue: number;
    totalTax: number;
    totalDiscount: number;
    transactionsCount: number;
  }> {
    try {
      let sales = await db.sales.where('businessId').equals(businessId).toArray();

      if (startDate) {
        sales = sales.filter(s => s.createdAt >= startDate);
      }
      if (endDate) {
        sales = sales.filter(s => s.createdAt <= endDate);
      }

      const completedSales = sales.filter(s => s.paymentStatus === 'completed' && s.isActive);

      // Calculate totals from SaleItems for accuracy
      let totalRevenue = 0;
      let totalTax = 0;
      let totalDiscount = 0;
      let totalItemsSold = 0;

      for (const sale of completedSales) {
        const items = await db.saleItems.where('saleId').equals(sale.id!).toArray();
        for (const item of items) {
          totalRevenue += item.subtotal;
          totalTax += item.taxAmount;
          totalDiscount += item.discountAmount || 0;
          totalItemsSold += item.quantity;
        }
      }

      return {
        totalSales: totalItemsSold,
        totalRevenue,
        totalTax,
        totalDiscount,
        transactionsCount: completedSales.length
      };
    } catch (error) {
      console.error('Error getting sales summary:', error);
      throw new Error('Failed to get sales summary');
    }
  }

  // Permission and Audit methods
  static async checkPermission(userId: string, permission: Permission, businessId?: string): Promise<boolean> {
    try {
      // First check if user has the specific permission
      const assignments = await db.permissionAssignments
        .where('[userId+permission]')
        .equals([userId, permission])
        .toArray();

      if (assignments.length > 0) {
        // Check if business-specific permission matches
        if (businessId) {
          return assignments.some(a => a.businessId === businessId);
        }
        return true;
      }

      // If no specific permission, check user type for default permissions
      const user = await db.users.get(userId);
      if (!user) return false;

      // Default permissions by user type
      const defaultPermissions: Record<string, Permission[]> = {
        owner: [
          'products.create', 'products.read', 'products.update', 'products.delete', 'products.adjust_price', 'products.adjust_stock',
          'inventory.entrada', 'inventory.salida', 'inventory.ajuste', 'inventory.merma', 'inventory.devolucion',
          'sales.create', 'sales.read', 'sales.cancel', 'sales.refund', 'sales.modify_price',
          'cashier.open_drawer', 'cashier.close_shift', 'cashier.view_reports',
          'users.create', 'users.read', 'users.update', 'users.delete',
          'files.upload', 'files.read', 'files.delete',
          'settings.business', 'settings.pos', 'settings.permissions',
          'reports.inventory', 'reports.sales', 'reports.audit'
        ],
        admin: [
          'products.create', 'products.read', 'products.update', 'products.delete', 'products.adjust_price', 'products.adjust_stock',
          'inventory.entrada', 'inventory.salida', 'inventory.ajuste', 'inventory.merma', 'inventory.devolucion',
          'sales.create', 'sales.read', 'sales.cancel', 'sales.refund', 'sales.modify_price',
          'cashier.open_drawer', 'cashier.close_shift', 'cashier.view_reports',
          'users.create', 'users.read', 'users.update',
          'files.upload', 'files.read', 'files.delete',
          'settings.business', 'settings.pos', 'settings.permissions',
          'reports.inventory', 'reports.sales', 'reports.audit'
        ],
        cashier: [
          'products.read',
          'inventory.salida',
          'sales.create', 'sales.read',
          'files.read',
          'cashier.open_drawer'
        ]
      };

      return defaultPermissions[user.type]?.includes(permission) || false;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  static async requirePermission(userId: string, permission: Permission, businessId?: string): Promise<void> {
    const hasPermission = await this.checkPermission(userId, permission, businessId);
    if (!hasPermission) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }

  static async logAuditAction(
    businessId: string,
    userId: string,
    action: Permission,
    resourceType: string,
    resourceId?: string,
    details?: string,
    oldValue?: any,
    newValue?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await db.auditLogs.add({
        businessId,
        userId,
        action,
        resourceType,
        resourceId,
        details,
        oldValue: oldValue ? JSON.stringify(oldValue) : undefined,
        newValue: newValue ? JSON.stringify(newValue) : undefined,
        ipAddress,
        userAgent,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error logging audit action:', error);
      // Don't throw here - audit logging shouldn't break business logic
    }
  }

  static async assignPermission(businessId: string, userId: string, permission: Permission, grantedBy: string): Promise<void> {
    try {
      await this.requirePermission(grantedBy, 'settings.permissions', businessId);

      await db.permissionAssignments.add({
        businessId,
        userId,
        permission,
        grantedBy,
        grantedAt: new Date()
      });

      await this.logAuditAction(
        businessId,
        grantedBy,
        'settings.permissions',
        'permission',
        undefined,
        `Assigned permission ${permission} to user ${userId}`
      );
    } catch (error) {
      console.error('Error assigning permission:', error);
      throw new Error('Failed to assign permission');
    }
  }

  static async revokePermission(businessId: string, userId: string, permission: Permission, revokedBy: string): Promise<void> {
    try {
      await this.requirePermission(revokedBy, 'settings.permissions', businessId);

      await db.permissionAssignments
        .where('[businessId+userId+permission]')
        .equals([businessId, userId, permission])
        .delete();

      await this.logAuditAction(
        businessId,
        revokedBy,
        'settings.permissions',
        'permission',
        undefined,
        `Revoked permission ${permission} from user ${userId}`
      );
    } catch (error) {
      console.error('Error revoking permission:', error);
      throw new Error('Failed to revoke permission');
    }
  }

  static async getUserPermissions(userId: string, businessId?: string): Promise<Permission[]> {
    try {
      let assignments: PermissionAssignment[];

      if (businessId) {
        assignments = await db.permissionAssignments
          .where('[businessId+userId]')
          .equals([businessId, userId])
          .toArray();
      } else {
        assignments = await db.permissionAssignments
          .where('userId')
          .equals(userId)
          .toArray();
      }

      return assignments.map(a => a.permission);
    } catch (error) {
      console.error('Error getting user permissions:', error);
      throw new Error('Failed to get user permissions');
    }
  }

  static async getAuditLogs(businessId: string, startDate?: Date, endDate?: Date, userId?: string): Promise<AuditLog[]> {
    try {
      await this.requirePermission(userId || 'system', 'reports.audit', businessId);

      let logs = await db.auditLogs.where('businessId').equals(businessId).sortBy('createdAt');

      if (startDate) {
        logs = logs.filter(log => log.createdAt >= startDate);
      }
      if (endDate) {
        logs = logs.filter(log => log.createdAt <= endDate);
      }
      if (userId) {
        logs = logs.filter(log => log.userId === userId);
      }

      return logs;
    } catch (error) {
      console.error('Error getting audit logs:', error);
      throw new Error('Failed to get audit logs');
    }
  }

  // Restricted operations
  static async cancelSale(reference: string, userId: string, reason?: string): Promise<void> {
    try {
      const sale = await db.sales.get(reference);
      if (!sale) {
        throw new Error('Sale not found');
      }

      await this.requirePermission(userId, 'sales.cancel', sale.businessId);

      // Get sale items to reverse inventory
      const saleItems = await db.saleItems.where('saleId').equals(reference).toArray();

      // Create reversal movements for each item
      for (const item of saleItems) {
        await this.createMovement({
          productId: item.productId,
          businessId: sale.businessId,
          quantity: item.quantity, // Positive to restore stock
          type: 'ajuste',
          reason: `Cancelación de venta - ${reason || 'Sin motivo especificado'}`,
          userId,
          reference: `CANCEL-${reference}`
        });
      }

      await this.logAuditAction(
        sale.businessId,
        userId,
        'sales.cancel',
        'sale',
        reference,
        `Cancelled sale ${reference}: ${reason || 'No reason provided'}`,
        { sale, items: saleItems },
        undefined
      );
    } catch (error) {
      console.error('Error cancelling sale:', error);
      throw new Error('Failed to cancel sale');
    }
  }

  static async processRefund(reference: string, userId: string, refundAmount?: number, reason?: string): Promise<void> {
    try {
      const sale = await db.sales.get(reference);
      if (!sale) {
        throw new Error('Sale not found');
      }

      await this.requirePermission(userId, 'sales.refund', sale.businessId);

      const saleItems = await db.saleItems.where('saleId').equals(reference).toArray();
      const totalSale = saleItems.reduce((sum, item) => sum + item.total, 0);
      const refundValue = refundAmount || totalSale;

      if (refundValue > totalSale) {
        throw new Error('Refund amount cannot exceed sale total');
      }

      // For partial refunds, we'd need to proportionally adjust inventory
      // For simplicity, this assumes full refunds for now
      if (refundValue === totalSale) {
        for (const item of saleItems) {
          await this.createMovement({
            productId: item.productId,
            businessId: sale.businessId,
            quantity: item.quantity, // Restore stock
            type: 'devolucion',
            reason: `Reembolso - ${reason || 'Sin motivo especificado'}`,
            userId,
            reference: `REFUND-${reference}`
          });
        }
      }

      await this.logAuditAction(
        sale.businessId,
        userId,
        'sales.refund',
        'sale',
        reference,
        `Processed refund of $${refundValue} for sale ${reference}: ${reason || 'No reason provided'}`,
        { sale, items: saleItems },
        { refundAmount: refundValue, reason }
      );
    } catch (error) {
      console.error('Error processing refund:', error);
      throw new Error('Failed to process refund');
    }
  }

  static async openCashDrawer(userId: string, businessId: string, reason?: string): Promise<void> {
    try {
      await this.requirePermission(userId, 'cashier.open_drawer', businessId);

      await this.logAuditAction(
        businessId,
        userId,
        'cashier.open_drawer',
        'cashier',
        undefined,
        `Opened cash drawer: ${reason || 'No reason provided'}`
      );

      // Here you would integrate with hardware to actually open the drawer
      // For now, we just log the action
    } catch (error) {
      console.error('Error opening cash drawer:', error);
      throw new Error('Failed to open cash drawer');
    }
  }

  static async closeShift(userId: string, businessId: string, cashCount: number, notes?: string): Promise<void> {
    try {
      await this.requirePermission(userId, 'cashier.close_shift', businessId);

      // Calculate expected cash vs actual
      const salesSummary = await this.getSalesSummary(businessId, new Date()); // Today's sales
      const expectedCash = salesSummary.totalRevenue;

      await this.logAuditAction(
        businessId,
        userId,
        'cashier.close_shift',
        'shift',
        undefined,
        `Closed shift - Expected: $${expectedCash}, Counted: $${cashCount}, Difference: $${cashCount - expectedCash}`,
        { expectedCash, cashCount, salesSummary },
        { notes }
      );
    } catch (error) {
      console.error('Error closing shift:', error);
      throw new Error('Failed to close shift');
    }
  }



  // Service methods
  static async createService(serviceData: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const serviceId = await db.services.add({
        ...serviceData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return serviceId.toString();
    } catch (error) {
      console.error('Error creating service:', error);
      throw new Error('Failed to create service');
    }
  }

  static async getServicesByBusiness(businessId: string): Promise<Service[]> {
    try {
      return await db.services.where('businessId').equals(businessId).toArray();
    } catch (error) {
      console.error('Error getting services:', error);
      throw new Error('Failed to get services');
    }
  }

  static async getServicesByDepartment(departmentId: string): Promise<Service[]> {
    try {
      return await db.services.where('departmentId').equals(departmentId).toArray();
    } catch (error) {
      console.error('Error getting services by department:', error);
      throw new Error('Failed to get services by department');
    }
  }

  static async getServiceById(serviceId: string): Promise<Service | undefined> {
    try {
      return await db.services.get(serviceId);
    } catch (error) {
      console.error('Error getting service:', error);
      throw new Error('Failed to get service');
    }
  }

  static async getServiceWithUsage(serviceId: string): Promise<Service & { usageCount: number } | undefined> {
    try {
      const service = await this.getServiceById(serviceId);
      if (!service) return undefined;

      const usageCount = await this.getServiceUsageCount(serviceId);
      return { ...service, usageCount };
    } catch (error) {
      console.error('Error getting service with usage:', error);
      throw new Error('Failed to get service with usage');
    }
  }

  static async getServiceUsageCount(serviceId: string): Promise<number> {
    try {
      // For services, we need to check if there are sales that include this service
      // Since services are sold as products, we check saleItems for service products
      const service = await db.services.get(serviceId);
      if (!service) return 0;

      // Find the corresponding product for this service (if it exists)
      // For now, we'll count how many times this service ID appears in saleItems
      // This is a simplified approach - in practice, services might be handled differently
      const saleItems = await db.saleItems
        .where('productId')
        .equals(serviceId)
        .filter(item => item.total > 0) // Only count actual sales, not returns
        .toArray();

      return saleItems.length;
    } catch (error) {
      console.error('Error getting service usage count:', error);
      return 0;
    }
  }

  static async updateService(serviceId: string, updates: Partial<Omit<Service, 'id' | 'businessId' | 'createdAt'>>): Promise<void> {
    try {
      await db.services.update(serviceId, { ...updates, updatedAt: new Date() });
    } catch (error) {
      console.error('Error updating service:', error);
      throw new Error('Failed to update service');
    }
  }

  // Usage count is now derived from sales data, not stored
  // This method is kept for compatibility but doesn't modify stored data
  static async getDerivedUsageCount(serviceId: string): Promise<number> {
    return await this.getServiceUsageCount(serviceId);
  }

  static async deleteService(serviceId: string): Promise<void> {
    try {
      await db.services.delete(serviceId);
    } catch (error) {
      console.error('Error deleting service:', error);
      throw new Error('Failed to delete service');
    }
  }

  static async searchServices(businessId: string, query: string): Promise<Service[]> {
    try {
      const allServices = await this.getServicesByBusiness(businessId);
      const searchTerm = query.toLowerCase();

      return allServices.filter(service =>
        service.name.toLowerCase().includes(searchTerm) ||
        service.description.toLowerCase().includes(searchTerm)
      );
    } catch (error) {
      console.error('Error searching services:', error);
      throw new Error('Failed to search services');
    }
  }

  // Utility methods
  static async getInventorySummary(businessId: string): Promise<{
    totalProducts: number;
    totalDepartments: number;
    lowStockProducts: number;
    totalValue: number;
    totalServices: number;
  }> {
    try {
      const products = await this.getProductsByBusiness(businessId);
      const services = await this.getServicesByBusiness(businessId);
      const departments = await this.getDepartmentsByBusiness(businessId);
      const lowStockProducts = await this.getLowStockProducts(businessId);

      let totalValue = 0;
      for (const product of products) {
        const currentStock = await this.calculateStockFromMovements(product.id!);
        totalValue += product.cost * currentStock;
      }

      return {
        totalProducts: products.length,
        totalDepartments: departments.length,
        lowStockProducts: lowStockProducts.length,
        totalValue,
        totalServices: services.length
      };
    } catch (error) {
      console.error('Error getting inventory summary:', error);
      throw new Error('Failed to get inventory summary');
    }
  }
}