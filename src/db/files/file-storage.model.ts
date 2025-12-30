import { FileType } from '../types/enums';

export interface FileStorage {
  id?: string;
  businessId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number; // in bytes
  fileType: FileType;
  data: Blob; // binary data
  checksum?: string; // for integrity verification
  uploadedBy: string; // userId
  uploadedAt: Date;
  metadata?: Record<string, any>; // additional metadata
}