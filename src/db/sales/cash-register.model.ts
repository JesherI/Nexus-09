export interface CashRegister {
  id?: string;
  businessId: string;
  deviceId: string; // unique identifier for this physical register
  location?: string; // physical location description
  isActive: boolean; // if this register is available for use
  createdAt: Date;
  updatedAt: Date;
}