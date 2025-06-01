import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService, CreateProductDto, CreateInventoryHistoryDto } from './inventory.service';
import { InventoryModule } from './inventory.module';
import { ObjectionModule } from 'common/objection';
import { Product } from 'entities/product.entity';
import { InventoryHistory, InventoryEventType } from 'entities/inventory-history.entity';
import { ConfigModule } from '@nestjs/config';
import { Knex } from 'knex';
import { getKnex } from 'common/objection'; // Utility to get Knex instance
import { nanoid } from 'nanoid';

// IMPORTANT: These tests are designed to run against a REAL database.
// Ensure your test environment is configured correctly and consider data cleanup strategies.

describe('InventoryService (Integration)', () => {
  let service: InventoryService;
  let module: TestingModule;
  let knex: Knex;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }), // Ensure ConfigService is available
        InventoryModule, // Imports Product, InventoryHistory repos via ObjectionModule.forFeature
      ],
      // Providers are usually not needed here if InventoryModule exports InventoryService
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    knex = getKnex(); // Get the Knex instance from the Objection setup

    // Optional: Clean up tables before all tests or specific test data
    // await knex('inventory_history').del();
    // await knex('products').del();
  });

  afterAll(async () => {
    // Optional: Clean up data created during tests
    // await knex('inventory_history').del();
    // await knex('products').del();
    await module.close();
    await knex.destroy(); // Close the database connection
  });

  // --- Product Tests ---
  describe('Product Management', () => {
    let createdProductId: string;

    it('should create a product', async () => {
      const productData: CreateProductDto = {
        name: 'Test Product Service ' + nanoid(5),
        description: 'A product created by service test',
        quantity: 10,
        category: 'Test Category',
      };
      const product = await service.createProduct(productData);
      expect(product).toBeDefined();
      expect(product.id).toBeDefined();
      expect(product.name).toEqual(productData.name);
      expect(product.quantity).toEqual(productData.quantity);
      createdProductId = product.id;
    });

    it('should find a product by ID', async () => {
      expect(createdProductId).toBeDefined(); // Ensure previous test created a product
      const product = await service.findOneProduct(createdProductId);
      expect(product).toBeDefined();
      expect(product.id).toEqual(createdProductId);
    });

    it('should update a product', async () => {
      expect(createdProductId).toBeDefined();
      const newName = 'Updated Test Product ' + nanoid(5);
      const updatedProduct = await service.updateProduct(createdProductId, { name: newName, quantity: 15 });
      expect(updatedProduct).toBeDefined();
      expect(updatedProduct.name).toEqual(newName);
      expect(updatedProduct.quantity).toEqual(15);
    });

    // Add more tests for findAllProducts, removeProduct, and photo uploads if time permits
    // For photo uploads, actual file handling in tests is complex.
    // It might involve mocking Express.Multer.File or focusing on the service logic after file parsing.
  });

  // --- InventoryHistory Tests ---
  describe('Inventory History Management', () => {
    let testProductId: string;
    let createdHistoryId: string;

    beforeAll(async () => {
      // Create a product to associate history with
      const product = await service.createProduct({ name: 'History Test Product', quantity: 50 });
      testProductId = product.id;
    });

    it('should create an inventory history record and update product quantity', async () => {
      const initialProduct = await service.findOneProduct(testProductId);
      const initialQuantity = initialProduct.quantity;

      const historyData: CreateInventoryHistoryDto = {
        productId: testProductId,
        inventoryEventType: InventoryEventType.ADD,
        quantityChanged: 5,
        notes: 'Service test history record',
      };
      const history = await service.createInventoryHistory(historyData);
      expect(history).toBeDefined();
      expect(history.id).toBeDefined();
      expect(history.productId).toEqual(testProductId);
      expect(history.quantityChanged).toEqual(5);
      createdHistoryId = history.id;

      const updatedProduct = await service.findOneProduct(testProductId);
      expect(updatedProduct.quantity).toEqual(initialQuantity + 5);
    });

    it('should find an inventory history record by ID', async () => {
      expect(createdHistoryId).toBeDefined();
      const history = await service.findOneInventoryHistory(createdHistoryId);
      expect(history).toBeDefined();
      expect(history.id).toEqual(createdHistoryId);
    });

    it('should find inventory histories for a product', async () => {
      const histories = await service.findInventoryHistoriesForProduct(testProductId);
      expect(histories).toBeInstanceOf(Array);
      expect(histories.length).toBeGreaterThanOrEqual(1);
      expect(histories.some(h => h.id === createdHistoryId)).toBe(true);
    });

    // Add more tests for updateInventoryHistory, removeInventoryHistory if needed
  });
});
