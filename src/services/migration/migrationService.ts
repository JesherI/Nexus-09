import { db } from '../database';
import { FileStorageService } from './fileStorageService';

export class MigrationService {
  // Migrate all existing base64 images to blob storage
  static async migrateAllImages(): Promise<{
    migratedUsers: number;
    migratedProducts: number;
    migratedBusinesses: number;
    migratedDepartments: number;
    migratedServices: number;
    errors: string[];
  }> {
    const results = {
      migratedUsers: 0,
      migratedProducts: 0,
      migratedBusinesses: 0,
      migratedDepartments: 0,
      migratedServices: 0,
      errors: [] as string[]
    };

    try {
      // Migrate user profile images
      const users = await db.users.where('profileImage').notEqual('').toArray();
      for (const user of users) {
        if (user.profileImage && user.profileImage.startsWith('data:')) {
          try {
            const result = await FileStorageService.uploadFromBase64(
              user.profileImage,
              `user_${user.id}_profile.jpg`,
              'image/jpeg',
              user.businessId || 'default',
              'system'
            );

            await db.users.update(user.id!, { profileImageId: result.fileId });
            results.migratedUsers++;
          } catch (error) {
            results.errors.push(`User ${user.id}: ${error}`);
          }
        }
      }

      // Migrate product images
      const products = await db.products.where('image').notEqual('').toArray();
      for (const product of products) {
        if (product.image && product.image.startsWith('data:')) {
          try {
            const result = await FileStorageService.uploadFromBase64(
              product.image,
              `product_${product.id}.jpg`,
              'image/jpeg',
              product.businessId,
              'system'
            );

            await db.products.update(product.id!, { imageId: result.fileId });
            results.migratedProducts++;
          } catch (error) {
            results.errors.push(`Product ${product.id}: ${error}`);
          }
        }
      }

      // Migrate business logos
      const businesses = await db.businesses.where('logo').notEqual('').toArray();
      for (const business of businesses) {
        if (business.logo && business.logo.startsWith('data:')) {
          try {
            const result = await FileStorageService.uploadFromBase64(
              business.logo,
              `business_${business.id}_logo.jpg`,
              'image/jpeg',
              business.id!,
              'system'
            );

            await db.businesses.update(business.id!, { logoId: result.fileId });
            results.migratedBusinesses++;
          } catch (error) {
            results.errors.push(`Business ${business.id}: ${error}`);
          }
        }
      }

      // Migrate department icons
      const departments = await db.departments.where('icon').notEqual('').toArray();
      for (const department of departments) {
        if (department.icon && department.icon.startsWith('data:')) {
          try {
            const result = await FileStorageService.uploadFromBase64(
              department.icon,
              `department_${department.id}_icon.jpg`,
              'image/jpeg',
              department.businessId,
              'system'
            );

            await db.departments.update(department.id!, { iconId: result.fileId });
            results.migratedDepartments++;
          } catch (error) {
            results.errors.push(`Department ${department.id}: ${error}`);
          }
        }
      }

      // Migrate service images
      const services = await db.services.where('image').notEqual('').toArray();
      for (const service of services) {
        if (service.image && service.image.startsWith('data:')) {
          try {
            const result = await FileStorageService.uploadFromBase64(
              service.image,
              `service_${service.id}.jpg`,
              'image/jpeg',
              service.businessId,
              'system'
            );

            await db.services.update(service.id!, { imageId: result.fileId });
            results.migratedServices++;
          } catch (error) {
            results.errors.push(`Service ${service.id}: ${error}`);
          }
        }
      }

    } catch (error) {
      results.errors.push(`Migration failed: ${error}`);
    }

    return results;
  }

  // Clean up old base64 data after migration
  static async cleanupOldBase64Data(): Promise<void> {
    // Remove old base64 fields from migrated records
    // This is optional as the fields can remain for backward compatibility

    const users = await db.users.where('profileImageId').notEqual('').toArray();
    for (const user of users) {
      if (user.profileImage) {
        await db.users.update(user.id!, { profileImage: undefined });
      }
    }

    const products = await db.products.where('imageId').notEqual('').toArray();
    for (const product of products) {
      if (product.image) {
        await db.products.update(product.id!, { image: undefined });
      }
    }

    const businesses = await db.businesses.where('logoId').notEqual('').toArray();
    for (const business of businesses) {
      if (business.logo) {
        await db.businesses.update(business.id!, { logo: undefined });
      }
    }

    const departments = await db.departments.where('iconId').notEqual('').toArray();
    for (const department of departments) {
      if (department.icon) {
        await db.departments.update(department.id!, { icon: undefined });
      }
    }

    const services = await db.services.where('imageId').notEqual('').toArray();
    for (const service of services) {
      if (service.image) {
        await db.services.update(service.id!, { image: undefined });
      }
    }
  }

  // Get migration status
  static async getMigrationStatus(): Promise<{
    usersToMigrate: number;
    productsToMigrate: number;
    businessesToMigrate: number;
    departmentsToMigrate: number;
    servicesToMigrate: number;
    totalStorageUsed: number;
  }> {
    const [
      users,
      products,
      businesses,
      departments,
      services,
      files
    ] = await Promise.all([
      db.users.where('profileImage').notEqual('').toArray(),
      db.products.where('image').notEqual('').toArray(),
      db.businesses.where('logo').notEqual('').toArray(),
      db.departments.where('icon').notEqual('').toArray(),
      db.services.where('image').notEqual('').toArray(),
      db.fileStorage.toArray()
    ]);

    const totalStorageUsed = files.reduce((sum, file) => sum + file.size, 0);

    return {
      usersToMigrate: users.filter(u => u.profileImage?.startsWith('data:')).length,
      productsToMigrate: products.filter(p => p.image?.startsWith('data:')).length,
      businessesToMigrate: businesses.filter(b => b.logo?.startsWith('data:')).length,
      departmentsToMigrate: departments.filter(d => d.icon?.startsWith('data:')).length,
      servicesToMigrate: services.filter(s => s.image?.startsWith('data:')).length,
      totalStorageUsed
    };
  }
}