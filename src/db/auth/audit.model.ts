export interface AuditLog {
  id?: string;
  businessId: string;
  userId: string;
  action: string; // permission or action performed
  resourceType: string; // 'product', 'sale', 'user', etc.
  resourceId?: string; // ID of the affected resource
  details?: string; // additional details about the action
  oldValue?: string; // JSON string of old values for updates
  newValue?: string; // JSON string of new values for updates
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}