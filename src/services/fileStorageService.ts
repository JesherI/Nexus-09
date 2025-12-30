import { db, FileStorage, FileType } from '../database';
import { InventoryServices } from './inventoryServices';

export interface FileUploadResult {
  fileId: string;
  fileName: string;
  size: number;
  mimeType: string;
}

export class FileStorageService {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];

  private static readonly ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  // Upload file from File object
  static async uploadFile(
    file: File,
    businessId: string,
    userId: string,
    fileType: FileType = 'image',
    metadata?: Record<string, any>
  ): Promise<FileUploadResult> {
    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Validate file type
    if (fileType === 'image' && !this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error(`Invalid image type. Allowed types: ${this.ALLOWED_IMAGE_TYPES.join(', ')}`);
    }

    if (fileType === 'document' && !this.ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
      throw new Error(`Invalid document type. Allowed types: ${this.ALLOWED_DOCUMENT_TYPES.join(', ')}`);
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop() || '';
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().substring(0, 8);
    const fileName = `${timestamp}_${randomId}.${fileExtension}`;

    // Calculate checksum for integrity
    const checksum = await this.calculateChecksum(file);

    // Create file storage record
    const fileId = await db.fileStorage.add({
      businessId,
      fileName,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      fileType,
      data: file, // Store the File/Blob directly
      checksum,
      uploadedBy: userId,
      uploadedAt: new Date(),
      metadata
    });

    await InventoryServices.logAuditAction(
      businessId,
      userId,
      'files.upload',
      'file',
      fileId.toString(),
      `Uploaded ${fileType}: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`,
      undefined,
      { fileName, size: file.size, mimeType: file.type, fileType }
    );

    return {
      fileId: fileId.toString(),
      fileName,
      size: file.size,
      mimeType: file.type
    };
  }

  // Upload file from Base64 string (for migration/compatibility)
  static async uploadFromBase64(
    base64Data: string,
    fileName: string,
    mimeType: string,
    businessId: string,
    userId: string,
    fileType: FileType = 'image'
  ): Promise<FileUploadResult> {
    // Convert base64 to blob
    const blob = this.base64ToBlob(base64Data, mimeType);

    // Create a File object from the blob
    const file = new File([blob], fileName, { type: mimeType });

    return await this.uploadFile(file, businessId, userId, fileType);
  }

  // Get file data
  static async getFile(fileId: string, businessId?: string): Promise<FileStorage | null> {
    const file = await db.fileStorage.get(fileId);
    if (!file) return null;

    // Check business access if specified
    if (businessId && file.businessId !== businessId) {
      throw new Error('Access denied to file');
    }

    return file;
  }

  // Get file as blob URL for display
  static async getFileUrl(fileId: string, businessId?: string): Promise<string | null> {
    const file = await this.getFile(fileId, businessId);
    if (!file) return null;

    // Create object URL for the blob
    return URL.createObjectURL(file.data);
  }

  // Download file
  static async downloadFile(fileId: string, businessId?: string): Promise<void> {
    const file = await this.getFile(fileId, businessId);
    if (!file) {
      throw new Error('File not found');
    }

    // Create download link
    const url = URL.createObjectURL(file.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.originalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Delete file
  static async deleteFile(fileId: string, businessId: string, userId: string): Promise<void> {
    const file = await this.getFile(fileId, businessId);
    if (!file) {
      throw new Error('File not found');
    }

    await InventoryServices.requirePermission(userId, 'files.delete', businessId);

    // Revoke any existing object URLs for this file
    // Note: In a real implementation, you'd track and clean up URLs

    await db.fileStorage.delete(fileId);

    await InventoryServices.logAuditAction(
      businessId,
      userId,
      'files.delete',
      'file',
      fileId,
      `Deleted file: ${file.originalName}`,
      { fileName: file.originalName, size: file.size },
      undefined
    );
  }

  // List files for business
  static async listFiles(
    businessId: string,
    userId: string,
    fileType?: FileType,
    limit: number = 50
  ): Promise<FileStorage[]> {
    await InventoryServices.requirePermission(userId, 'files.read', businessId);

    let query = db.fileStorage.where('businessId').equals(businessId);

    if (fileType) {
      query = query.and(file => file.fileType === fileType);
    }

    return await query.reverse().limit(limit).toArray();
  }

  // Get storage usage
  static async getStorageUsage(businessId: string, userId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    byType: Record<FileType, { count: number; size: number }>;
  }> {
    await InventoryServices.requirePermission(userId, 'files.read', businessId);

    const files = await db.fileStorage.where('businessId').equals(businessId).toArray();

    const usage = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      byType: {} as Record<FileType, { count: number; size: number }>
    };

    // Group by type
    const types = ['image', 'document', 'other'] as FileType[];
    types.forEach(type => {
      const typeFiles = files.filter(f => f.fileType === type);
      usage.byType[type] = {
        count: typeFiles.length,
        size: typeFiles.reduce((sum, file) => sum + file.size, 0)
      };
    });

    return usage;
  }

  // Compress image if needed
  static async compressImage(file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file); // Return original if compression fails
          }
        }, file.type, quality);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // Utility methods
  private static base64ToBlob(base64: string, mimeType: string): Blob {
    // Remove data URL prefix if present
    const base64Data = base64.replace(/^data:[^;]+;base64,/, '');

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  private static async calculateChecksum(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Cleanup method for memory management
  static cleanupObjectUrls(): void {
    // In a real implementation, you'd track created URLs and clean them up
    // For now, this is a placeholder
  }
}