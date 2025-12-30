import { ProductType, TaxType } from '../types/enums';

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