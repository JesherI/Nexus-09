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