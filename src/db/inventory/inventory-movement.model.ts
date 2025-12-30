import { MovementType } from '../types/enums';

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