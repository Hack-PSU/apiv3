import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository, Repository } from 'common/objection';
import { Product, ProductEntity } from 'entities/product.entity';
import { InventoryHistory, InventoryHistoryEntity, InventoryEventType } from 'entities/inventory-history.entity';
import { ConfigService } from '@nestjs/config';
import { ResumeBucketConfig } from 'common/gcp'; // Using ResumeBucketConfig as an example, will adjust if a specific inventory bucket config exists
import { ConfigToken } from 'common/config';
import * as admin from 'firebase-admin';
import { nanoid } from 'nanoid';

// Placeholder DTOs - these would typically be in separate files
export class CreateProductDto {
  name: string;
  description?: string;
  category?: string;
  quantity: number;
  userId?: string;
  locationId?: number;
  notes?: string;
}

export class UpdateProductDto extends CreateProductDto {}

export class CreateInventoryHistoryDto {
  productId: string;
  inventoryEventType: InventoryEventType;
  quantityChanged: number;
  fromUserId?: string;
  toUserId?: string;
  fromLocationId?: number;
  toLocationId?: number;
  notes?: string;
}

export class UpdateInventoryHistoryDto extends CreateInventoryHistoryDto {}


@Injectable()
export class InventoryService {
  private photoBucketName: string; // To be configured for product photos

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(InventoryHistory)
    private readonly inventoryHistoryRepo: Repository<InventoryHistory>,
    private readonly configService: ConfigService,
  ) {
    // Attempt to get a specific bucket for inventory photos, fallback to a generic one or resume bucket if not defined
    // This will likely need adjustment based on actual bucket configuration for product images
    try {
      const bucketConfig = this.configService.get<ResumeBucketConfig>(ConfigToken.BUCKET);
      this.photoBucketName = bucketConfig?.resume_bucket || 'default-inventory-photo-bucket'; // Fallback if specific config not found
    } catch (error) {
      console.warn('Inventory photo bucket configuration not found, using fallback. Please configure properly.', error);
      this.photoBucketName = 'default-inventory-photo-bucket'; // Default fallback
    }
  }

  private get photoBucket() {
    if (!this.photoBucketName) {
      throw new Error('Photo bucket name is not configured');
    }
    return admin.storage().bucket(this.photoBucketName);
  }

  private getPhotoFileName(productId: string, extension: string = 'jpg'): string {
    return `product_${productId}_${nanoid()}.${extension}`;
  }

  private getAuthenticatedPhotoUrl(filename: string): string {
    return `https://storage.cloud.google.com/${this.photoBucketName}/${filename}`;
  }

  async uploadProductPhoto(
    productId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const extension = file.originalname.split('.').pop() || 'jpg';
    const filename = this.getPhotoFileName(productId, extension);
    const blob = this.photoBucket.file(filename);

    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    return new Promise((resolve, reject) => {
      blobStream.on('error', (err) => reject(err));
      blobStream.on('finish', async () => {
        try {
          await blob.makePublic(); // Make the file publicly accessible
          resolve(this.getAuthenticatedPhotoUrl(filename));
        } catch (err) {
          reject(err);
        }
      });
      blobStream.end(file.buffer);
    });
  }

  // --- Product Methods ---
  async createProduct(createProductDto: CreateProductDto, photoFile?: Express.Multer.File): Promise<Product> {
    const productId = nanoid();
    let photoUrl: string | undefined = undefined;

    if (photoFile) {
      photoUrl = await this.uploadProductPhoto(productId, photoFile);
    }

    return this.productRepo.createOne({
      id: productId,
      ...createProductDto,
      photoUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
     }).exec();
  }

  async findAllProducts(): Promise<Product[]> {
    return this.productRepo.findAll().exec();
  }

  async findOneProduct(id: string): Promise<Product> {
    const product = await this.productRepo.findOne(id).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async updateProduct(id: string, updateProductDto: UpdateProductDto, photoFile?: Express.Multer.File): Promise<Product> {
    const existingProduct = await this.findOneProduct(id); // Ensures product exists

    let photoUrl = existingProduct.photoUrl;
    if (photoFile) {
      // Potentially delete old photo if replacing, then upload new one
      // For simplicity, just uploading new one and overwriting URL
      photoUrl = await this.uploadProductPhoto(id, photoFile);
    }

    return this.productRepo.patchOne(id, {
      ...updateProductDto,
      photoUrl,
      updatedAt: new Date(),
    }).exec();
  }

  async removeProduct(id: string): Promise<Product> {
    // Consider deleting associated photo from GCS as well
    return this.productRepo.deleteOne(id).exec();
  }

  // --- InventoryHistory Methods ---
  async createInventoryHistory(createInventoryHistoryDto: CreateInventoryHistoryDto): Promise<InventoryHistory> {
    const historyId = nanoid();
    // Basic validation or side effects (e.g., updating product quantity) could go here
    // For now, just creating the history record

    const product = await this.productRepo.findOne(createInventoryHistoryDto.productId).exec();
    if(!product) {
        throw new NotFoundException(`Product with ID ${createInventoryHistoryDto.productId} not found, cannot create history.`);
    }

    // Update product quantity based on history event
    let newQuantity = product.quantity;
    switch (createInventoryHistoryDto.inventoryEventType) {
        case InventoryEventType.ADD:
            newQuantity += createInventoryHistoryDto.quantityChanged;
            break;
        case InventoryEventType.REMOVE:
        case InventoryEventType.CHECKOUT:
            newQuantity -= createInventoryHistoryDto.quantityChanged;
            break;
        // RETURN, TRANSFER, OTHER might have more complex logic or not directly impact simple quantity in the same way
    }

    if (newQuantity < 0) {
        throw new Error('Inventory quantity cannot be negative.');
    }

    await this.productRepo.patchOne(product.id, { quantity: newQuantity, updatedAt: new Date() }).exec();

    return this.inventoryHistoryRepo.createOne({
        id: historyId,
        ...createInventoryHistoryDto,
        timestamp: Date.now(),
    }).exec();
  }

  async findAllInventoryHistories(): Promise<InventoryHistory[]> {
    return this.inventoryHistoryRepo.findAll().exec();
  }

  async findOneInventoryHistory(id: string): Promise<InventoryHistory> {
    const history = await this.inventoryHistoryRepo.findOne(id).exec();
    if (!history) {
      throw new NotFoundException(`InventoryHistory with ID ${id} not found`);
    }
    return history;
  }

  async findInventoryHistoriesForProduct(productId: string): Promise<InventoryHistory[]> {
    return this.inventoryHistoryRepo.findAll().raw().where('productId', productId);
  }

  // Update and Remove for InventoryHistory might be less common or restricted
  // For now, providing basic implementations

  async updateInventoryHistory(id: string, updateInventoryHistoryDto: UpdateInventoryHistoryDto): Promise<InventoryHistory> {
    // Business logic for updating history might be complex (e.g., recalculating product quantities)
    // Keeping it simple: just patch the record. Consider implications carefully.
    await this.findOneInventoryHistory(id); // Ensures history record exists
    return this.inventoryHistoryRepo.patchOne(id, updateInventoryHistoryDto).exec();
  }

  async removeInventoryHistory(id: string): Promise<InventoryHistory> {
    // Similar to update, deleting history can have cascading effects or may be disallowed.
    // Keeping it simple.
    return this.inventoryHistoryRepo.deleteOne(id).exec();
  }
}
