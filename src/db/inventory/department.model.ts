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