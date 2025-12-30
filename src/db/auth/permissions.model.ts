import { Permission } from '../types/permissions';

export interface PermissionAssignment {
  id?: string;
  businessId: string;
  userId: string;
  permission: Permission;
  grantedBy: string; // userId who granted the permission
  grantedAt: Date;
}