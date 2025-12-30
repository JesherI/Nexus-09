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