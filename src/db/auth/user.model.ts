import { UserType } from '../types/enums';

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