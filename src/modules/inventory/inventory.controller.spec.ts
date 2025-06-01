import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController, CreateProductDto } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryModule } from './inventory.module';
import { ConfigModule } from '@nestjs/config';
import { Role, RolesAuthGuard } from 'common/gcp'; // Assuming RolesAuthGuard is used or can be mocked/bypassed
import { APP_GUARD } from '@nestjs/core';
import { Knex } from 'knex';
import { getKnex } from 'common/objection';
import { nanoid } from 'nanoid';
import { User } from 'entities/user.entity'; // For mocking req.user

// Mock for RolesAuthGuard - in real tests, this might need more sophisticated handling
// or be part of a global setup if all controllers are tested this way.
const mockRolesAuthGuard = {
  canActivate: jest.fn((context) => {
    // const request = context.switchToHttp().getRequest();
    // Simulate that the user has the required role for simplicity
    // In a real scenario, you might want to set req.user and check roles properly
    // request.user = { sub: 'test-user-id', role: Role.TEAM }; // Example user
    return true; // Assume authorized for controller tests
  }),
};


describe('InventoryController (Integration)', () => {
  let controller: InventoryController;
  let service: InventoryService; // To verify calls if needed, though less common in true integration tests
  let module: TestingModule;
  let knex: Knex;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        InventoryModule,
      ],
      // Controller and Service are provided by InventoryModule
      // If RolesAuthGuard is applied globally, we might need to override it here.
    })
    // .overrideGuard(RolesAuthGuard) // If RolesAuthGuard is a global guard
    // .useValue(mockRolesAuthGuard)   // Replace with mock
    .compile();

    controller = module.get<InventoryController>(InventoryController);
    service = module.get<InventoryService>(InventoryService); // Get service instance
    knex = getKnex();

    // Optional: Clean up tables before all tests
    // await knex('inventory_history').del();
    // await knex('products').del();
  });

  afterAll(async () => {
    // await knex('inventory_history').del();
    // await knex('products').del();
    await module.close();
    await knex.destroy();
  });

  describe('Product Endpoints', () => {
    let createdProductIdByController: string;

    it('POST /products - should create a product', async () => {
      const productData: CreateProductDto = {
        name: 'Test Product Controller ' + nanoid(5),
        description: 'Product via controller test',
        quantity: 20,
        category: 'Controller Test',
      };

      // If file upload is mandatory and complex to mock, this test might need adjustment
      // For now, assuming photo is optional or service handles undefined photo
      const product = await controller.createProduct(productData, undefined); // No file for simplicity

      expect(product).toBeDefined();
      expect(product.id).toBeDefined();
      expect(product.name).toEqual(productData.name);
      createdProductIdByController = product.id;

      // Verify it's in the database via service
      const dbProduct = await service.findOneProduct(product.id);
      expect(dbProduct).toBeDefined();
      expect(dbProduct.name).toEqual(productData.name);
    });

    it('GET /products/:id - should retrieve a product', async () => {
      expect(createdProductIdByController).toBeDefined();
      const product = await controller.findOneProduct(createdProductIdByController);
      expect(product).toBeDefined();
      expect(product.id).toEqual(createdProductIdByController);
    });

    it('GET /products - should retrieve all products', async () => {
      const products = await controller.findAllProducts();
      expect(products).toBeInstanceOf(Array);
      expect(products.length).toBeGreaterThanOrEqual(1);
      expect(products.some(p => p.id === createdProductIdByController)).toBe(true);
    });

    it('PATCH /products/:id - should update a product', async () => {
        expect(createdProductIdByController).toBeDefined();
        const newName = 'Updated Controller Product ' + nanoid(5);
        const updatedProduct = await controller.updateProduct(createdProductIdByController, { name: newName }, undefined);
        expect(updatedProduct).toBeDefined();
        expect(updatedProduct.name).toEqual(newName);

        const dbProduct = await service.findOneProduct(createdProductIdByController);
        expect(dbProduct.name).toEqual(newName);
    });

    // Add tests for history endpoints similarly
  });

  describe('Inventory History Endpoints', () => {
    let testProductIdForController: string;
    let createdHistoryIdByController: string;

    beforeAll(async () => {
        // Create a product to associate history with, directly via service for setup
        const product = await service.createProduct({ name: 'History Test Product for Controller', quantity: 70 });
        testProductIdForController = product.id;
    });

    it('POST /history - should create an inventory history record', async () => {
        const historyData = {
            productId: testProductIdForController,
            inventoryEventType: InventoryEventType.REMOVE,
            quantityChanged: 3,
            notes: 'Controller test history',
        };
        const history = await controller.createInventoryHistory(historyData);
        expect(history).toBeDefined();
        expect(history.id).toBeDefined();
        expect(history.productId).toEqual(testProductIdForController);
        createdHistoryIdByController = history.id;

        const dbHistory = await service.findOneInventoryHistory(history.id);
        expect(dbHistory).toBeDefined();
    });

    it('GET /history/product/:productId - should get histories for a product', async () => {
        const histories = await controller.findInventoryHistoriesForProduct(testProductIdForController);
        expect(histories).toBeInstanceOf(Array);
        expect(histories.some(h => h.id === createdHistoryIdByController)).toBe(true);
    });

    it('GET /history/:id - should get a specific history record', async () => {
        const history = await controller.findOneInventoryHistory(createdHistoryIdByController);
        expect(history).toBeDefined();
        expect(history.id).toEqual(createdHistoryIdByController);
    });
  });
});
