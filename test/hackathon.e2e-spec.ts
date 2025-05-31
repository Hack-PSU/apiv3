// test/hackathon.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { initializeApp } from '@firebase/app';
import { User as FirebaseUser } from '@firebase/auth';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  ConfigToken,
  firebaseConfig,
  firebaseWebConfig,
  // Add other necessary configs if used by HackathonModule or its dependencies
} from 'common/config';
import { FirebaseAuthModule, Role, FirebaseConfig } from 'common/gcp'; // Assuming Role is needed, Added FirebaseConfig for type
import { GoogleCloudModule } from 'common/gcp'; // If GCP services are used by hackathon module

import { ObjectionTestingModule } from 'test/objection';
import { Hackathon } from '@entities/hackathon.entity';
import { Event } from '@entities/event.entity'; // If Event entity is involved, e.g. for check-in event creation
// Import other entities if they are direct or indirect dependencies for hackathon operations being tested

import { HackathonModule } from 'modules/hackathon/hackathon.module';
// Import other modules that HackathonModule depends on, or are needed for the app to bootstrap for these tests

import { createTestUser, deleteUser, fetchToken, promoteUser } from './utils/auth-utils';
import { Client, getClient } from './utils/request-utils';
// import * as request from 'supertest'; // Only if getClient is not sufficient
import * as request from 'supertest'; // Make sure supertest is imported
import { HackathonEntity } from '@entities/hackathon.entity'; // For response type checks
import { HackathonResponse, HackathonCreateEntity, HackathonPatchEntity, HackathonUpdateEntity, StaticActiveHackathonEntity } from 'modules/hackathon/hackathon.controller'; // Import DTOs

describe('HackathonController (e2e)', () => {
  let app: INestApplication;
  let client: Client;
  let execUser: FirebaseUser; // For role EXEC
  let teamUser: FirebaseUser;  // For role TEAM
  let noRoleUser: FirebaseUser; // For no specific role / general user

  let execUserToken: string;
  let teamUserToken: string;
  let noRoleUserToken: string;

  beforeAll(async () => {
    const configTestModule: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [firebaseWebConfig, firebaseConfig], // Add other configs loaded by AppModule
        }),
      ],
    }).compile();

    const configService = configTestModule.get<ConfigService>(ConfigService);

    try {
      initializeApp(configService.get(ConfigToken.FirebaseWeb));
      const { appName, ...options } = configService.get<FirebaseConfig>(ConfigToken.GCP);
      if (admin.apps.length === 0) { // Initialize Firebase Admin only if not already initialized
        admin.initializeApp(options, appName);
      }
    } catch (e) {
      if (e.code !== 'app/duplicate-app') { // Firebase Admin might already be initialized by another spec
        console.error('Firebase initialization error in hackathon.e2e-spec:', e);
        throw e;
      }
    }

    // Create users for different roles
    execUser = await createTestUser();
    await promoteUser(execUser, Role.EXEC);
    execUserToken = await fetchToken(execUser);

    teamUser = await createTestUser();
    await promoteUser(teamUser, Role.TEAM);
    teamUserToken = await fetchToken(teamUser);

    noRoleUser = await createTestUser();
    await promoteUser(noRoleUser, Role.NONE); // Or a default role if applicable
    noRoleUserToken = await fetchToken(noRoleUser);
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ // Ensure necessary configs are available
          load: [firebaseConfig, firebaseWebConfig /*, add other configs */ ],
        }),
        FirebaseAuthModule,
        // GoogleCloudModule.forRoot(...) // If needed
        ObjectionTestingModule.forFeature([Hackathon, Event /*, other entities */]),
        HackathonModule,
        // EventModule, // If EventController/Service is a direct dependency for some operations
        // SocketModule // Sockets are usually mocked or omitted in E2E if not explicitly tested
      ],
    })
    // .overrideProvider(SocketGateway).useValue({}) // If you want to mock sockets like in users.e2e-spec
    .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })); // Apply validation
    await app.init();
    client = getClient(app);
  });

  afterAll(async () => {
    await deleteUser(execUser);
    await deleteUser(teamUser);
    await deleteUser(noRoleUser);
    if (app) {
      await app.close();
    }
    // Consider admin.app().delete() if appropriate and if this is the last test suite
  });

  it('should be defined', () => { // Basic sanity check
    expect(app).toBeDefined();
    expect(client).toBeDefined();
  });

  // --- POST /hackathons ---
  describe('POST /hackathons', () => {
    const hackathonCreateData: HackathonCreateEntity = {
      name: 'Test E2E Hackathon',
      startTime: Math.floor(new Date('2025-01-01T00:00:00Z').getTime() / 1000),
      endTime: Math.floor(new Date('2025-01-03T00:00:00Z').getTime() / 1000),
    };

    it('EXEC role: should successfully create a new hackathon (201)', async () => {
      const response = await request(app.getHttpServer())
        .post('/hackathons')
        .set('Authorization', `Bearer ${execUserToken}`)
        .send(hackathonCreateData)
        .expect(201);

      const createdHackathon = response.body as HackathonResponse;
      expect(createdHackathon).toBeDefined();
      expect(createdHackathon.id).toBeDefined();
      expect(createdHackathon.name).toEqual(hackathonCreateData.name);
      expect(createdHackathon.active).toBe(true); // New hackathons are set active
      expect(createdHackathon.checkInId).toBeDefined(); // A check-in event should be created
    });

    it('TEAM role: should be forbidden to create a hackathon (403)', async () => {
      await request(app.getHttpServer())
        .post('/hackathons')
        .set('Authorization', `Bearer ${teamUserToken}`)
        .send(hackathonCreateData)
        .expect(403);
    });

    it('NONE role: should be forbidden to create a hackathon (403)', async () => {
      // Assuming that if a token is present but for a user with no specific roles (like our noRoleUser with Role.NONE),
      // and the @Roles decorator expects EXEC, it should result in 403.
      // If @Roles isn't hit due to an earlier auth guard failure for non-permissioned users, it might be 401.
      // Given the setup in users.e2e-spec.ts, custom claims are set, so 403 is more likely.
      await request(app.getHttpServer())
        .post('/hackathons')
        .set('Authorization', `Bearer ${noRoleUserToken}`)
        .send(hackathonCreateData)
        .expect(403);
    });

    it('Unauthenticated: should be unauthorized to create a hackathon (401)', async () => {
      await request(app.getHttpServer())
        .post('/hackathons')
        .send(hackathonCreateData)
        .expect(401); // No token provided
    });

    it('EXEC role: should fail to create with invalid data (e.g., missing name) (400)', async () => {
      const invalidData = { ...hackathonCreateData, name: undefined };
      await request(app.getHttpServer())
        .post('/hackathons')
        .set('Authorization', `Bearer ${execUserToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('EXEC role: should fail to create with non-numeric startTime (400)', async () => {
      const invalidData = { ...hackathonCreateData, startTime: "not-a-number" };
      await request(app.getHttpServer())
        .post('/hackathons')
        .set('Authorization', `Bearer ${execUserToken}`)
        .send(invalidData)
        .expect(400); // Due to ValidationPipe and class-validator
    });
  });

  // --- GET /hackathons ---
  describe('GET /hackathons', () => {
    let createdActiveHackathon: HackathonResponse;
    let createdInactiveHackathon: HackathonResponse; // Will be created then deactivated

    const activeHackData: HackathonCreateEntity = {
      name: 'E2E Active Hackathon',
      startTime: Math.floor(new Date('2025-02-01T00:00:00Z').getTime() / 1000),
      endTime: Math.floor(new Date('2025-02-03T00:00:00Z').getTime() / 1000),
    };
    const inactiveHackData: HackathonCreateEntity = {
      name: 'E2E Inactive Hackathon',
      startTime: Math.floor(new Date('2025-03-01T00:00:00Z').getTime() / 1000),
      endTime: Math.floor(new Date('2025-03-03T00:00:00Z').getTime() / 1000),
    };

    beforeEach(async () => {
      // To ensure `createdActiveHackathon` is active and `createdInactiveHackathon` is inactive:
      // Step 1: Create "inactive candidate"
      const respInactive = await request(app.getHttpServer())
        .post('/hackathons')
        .set('Authorization', `Bearer ${execUserToken}`)
        .send(inactiveHackData);
      expect(respInactive.status).toBe(201); // Ensure creation before assignment
      createdInactiveHackathon = respInactive.body; // This one is currently active

      // Step 2: Create "active candidate" - this will deactivate the one above
      const respActive = await request(app.getHttpServer())
        .post('/hackathons')
        .set('Authorization', `Bearer ${execUserToken}`)
        .send(activeHackData);
      expect(respActive.status).toBe(201); // Ensure creation before assignment
      createdActiveHackathon = respActive.body; // This one is now active, previous one is inactive
    });

    it('TEAM role: should get all hackathons (200)', async () => {
      const response = await client('/hackathons').withToken(teamUserToken).expect(200);
      const hackathons = response.body as HackathonEntity[];
      expect(hackathons).toBeInstanceOf(Array);
      expect(hackathons.length).toBeGreaterThanOrEqual(2); // At least the two we created
      expect(hackathons.find(h => h.id === createdActiveHackathon.id)).toBeDefined();
      expect(hackathons.find(h => h.id === createdInactiveHackathon.id)).toBeDefined();
    });

    it('TEAM role: should get only active hackathons with ?active=true (200)', async () => {
      const response = await client('/hackathons?active=true').withToken(teamUserToken).expect(200);
      const hackathons = response.body as HackathonResponse[]; // Controller returns HackathonResponse for active=true
      expect(hackathons).toBeInstanceOf(Array);
      expect(hackathons.length).toBe(1);
      expect(hackathons[0].id).toEqual(createdActiveHackathon.id);
      expect(hackathons[0].active).toBe(true);
      expect(hackathons[0].checkInId).toBeDefined();
    });

    it('TEAM role: should get only inactive hackathons with ?active=false (200)', async () => {
      const response = await client('/hackathons?active=false').withToken(teamUserToken).expect(200);
      const hackathons = response.body as HackathonEntity[];
      expect(hackathons).toBeInstanceOf(Array);
      expect(hackathons.length).toBe(1);
      expect(hackathons.find(h => h.id === createdInactiveHackathon.id)).toBeDefined();
      // The controller's active=false branch returns raw entities which might not have the 'active' field explicitly mapped by $parseDatabaseJson
      // So, we check if the active one is NOT present.
      expect(hackathons.find(h => h.id === createdActiveHackathon.id)).toBeUndefined();
    });

    it('EXEC role: should also get all hackathons (200)', async () => {
      // Similar to TEAM role, just different token
      const response = await client('/hackathons').withToken(execUserToken).expect(200);
      const hackathons = response.body as HackathonEntity[];
      expect(hackathons).toBeInstanceOf(Array);
      expect(hackathons.length).toBeGreaterThanOrEqual(2);
    });

    it('NONE role: should be forbidden to get hackathons (403)', async () => {
      await client('/hackathons').withToken(noRoleUserToken).expect(403);
    });

    it('Unauthenticated: should be unauthorized to get hackathons (401)', async () => {
      await client('/hackathons').send().expect(401);
    });
  });

  // --- GET /hackathons/:id ---
  describe('GET /hackathons/:id', () => {
    let existingHackathon: HackathonResponse; // HackathonResponse as POST returns this structure with checkInId
    const hackathonData: HackathonCreateEntity = {
      name: 'E2E GetOne Hackathon',
      startTime: Math.floor(new Date('2025-04-01T00:00:00Z').getTime() / 1000),
      endTime: Math.floor(new Date('2025-04-03T00:00:00Z').getTime() / 1000),
    };

    beforeEach(async () => {
      // Create a hackathon to be fetched
      const response = await request(app.getHttpServer())
        .post('/hackathons')
        .set('Authorization', `Bearer ${execUserToken}`)
        .send(hackathonData);
      expect(response.status).toBe(201);
      existingHackathon = response.body;
    });

    it('TEAM role: should get an existing hackathon by ID (200)', async () => {
      const response = await client(`/hackathons/${existingHackathon.id}`)
        .withToken(teamUserToken)
        .expect(200);

      const fetchedHackathon = response.body as HackathonEntity;
      expect(fetchedHackathon).toBeDefined();
      expect(fetchedHackathon.id).toEqual(existingHackathon.id);
      expect(fetchedHackathon.name).toEqual(hackathonData.name);
    });

    it('EXEC role: should also get an existing hackathon by ID (200)', async () => {
      const response = await client(`/hackathons/${existingHackathon.id}`)
        .withToken(execUserToken)
        .expect(200);

      const fetchedHackathon = response.body as HackathonEntity;
      expect(fetchedHackathon.id).toEqual(existingHackathon.id);
    });

    it('TEAM role: should return 404 for a non-existent hackathon ID', async () => {
      const nonExistentId = 'non-existent-id-123';
      // This relies on mock-knex setup to produce a 404 or equivalent.
      // The controller uses findOne(id).exec(). If this returns undefined and no error is thrown,
      // NestJS might return 200 with an empty body if not handled.
      // However, a typical REST API would return 404.
      // The DBExceptionFilter might convert specific Objection errors to 404.
      // For now, we'll expect 404, which is a common case for "not found".
      await client(`/hackathons/${nonExistentId}`).withToken(teamUserToken).expect(404);
    });

    it('NONE role: should be forbidden to get a hackathon by ID (403)', async () => {
      await client(`/hackathons/${existingHackathon.id}`)
        .withToken(noRoleUserToken)
        .expect(403);
    });

    it('Unauthenticated: should be unauthorized to get a hackathon by ID (401)', async () => {
      await client(`/hackathons/${existingHackathon.id}`)
        .send()
        .expect(401);
    });
  });

  // --- PATCH /hackathons/:id ---
  describe('PATCH /hackathons/:id', () => {
    let hackToPatch: HackathonResponse; // Store the created hackathon
    const initialHackData: HackathonCreateEntity = {
      name: 'E2E HackToPatch Original',
      startTime: Math.floor(new Date('2025-05-01T00:00:00Z').getTime() / 1000),
      endTime: Math.floor(new Date('2025-05-03T00:00:00Z').getTime() / 1000),
    };

    beforeEach(async () => {
      // Create a hackathon to be patched
      const response = await request(app.getHttpServer())
        .post('/hackathons')
        .set('Authorization', `Bearer ${execUserToken}`)
        .send(initialHackData);
      expect(response.status).toBe(201);
      hackToPatch = response.body;
    });

    it('EXEC role: should partially update an existing hackathon (200)', async () => {
      const patchData: HackathonPatchEntity = {
        name: 'E2E HackToPatch Updated Name',
        active: false, // Example: deactivating it
      };

      const response = await request(app.getHttpServer())
        .patch(`/hackathons/${hackToPatch.id}`)
        .set('Authorization', `Bearer ${execUserToken}`)
        .send(patchData)
        .expect(200);

      const updatedHackathon = response.body as HackathonEntity;
      expect(updatedHackathon).toBeDefined();
      expect(updatedHackathon.id).toEqual(hackToPatch.id);
      expect(updatedHackathon.name).toEqual(patchData.name);
      expect(updatedHackathon.active).toEqual(patchData.active);
      // Check that other fields remain from original if not patched, e.g. startTime
      // Note: The actual returned object might be fully populated by the backend.
      // The HackathonEntity doesn't enforce all fields from HackathonCreateEntity, so we check what's returned.
      // For `active` field, it might be mapped from 0/1 by $parseDatabaseJson if the entity is fetched again.
      // The PATCH endpoint returns HackathonEntity.
      expect(updatedHackathon.startTime).toEqual(initialHackData.startTime);
    });

    it('EXEC role: should return 404 for patching a non-existent hackathon ID', async () => {
      const nonExistentId = 'non-existent-patch-id-456';
      const patchData: HackathonPatchEntity = { name: 'TryToUpdateNonExistent' };
      await request(app.getHttpServer())
        .patch(`/hackathons/${nonExistentId}`)
        .set('Authorization', `Bearer ${execUserToken}`)
        .send(patchData)
        .expect(404);
    });

    it('EXEC role: should fail with invalid data (e.g., wrong type for startTime) (400)', async () => {
      const patchData = { startTime: "this-is-not-a-number" };
      await request(app.getHttpServer())
        .patch(`/hackathons/${hackToPatch.id}`)
        .set('Authorization', `Bearer ${execUserToken}`)
        .send(patchData)
        .expect(400);
    });

    it('TEAM role: should be forbidden to patch a hackathon (403)', async () => {
      const patchData: HackathonPatchEntity = { name: 'TeamTryPatch' };
      await request(app.getHttpServer())
        .patch(`/hackathons/${hackToPatch.id}`)
        .set('Authorization', `Bearer ${teamUserToken}`)
        .send(patchData)
        .expect(403);
    });

    it('NONE role: should be forbidden to patch a hackathon (403)', async () => {
      const patchData: HackathonPatchEntity = { name: 'NoneRoleTryPatch' };
      await request(app.getHttpServer())
        .patch(`/hackathons/${hackToPatch.id}`)
        .set('Authorization', `Bearer ${noRoleUserToken}`)
        .send(patchData)
        .expect(403);
    });

    it('Unauthenticated: should be unauthorized to patch a hackathon (401)', async () => {
      const patchData: HackathonPatchEntity = { name: 'UnauthTryPatch' };
      await request(app.getHttpServer())
        .patch(`/hackathons/${hackToPatch.id}`)
        .send(patchData)
        .expect(401);
    });
  });

  // --- PUT /hackathons/:id ---
  describe('PUT /hackathons/:id', () => {
    let hackToReplace: HackathonResponse;
    const initialHackData: HackathonCreateEntity = {
      name: 'E2E HackToReplace Original',
      startTime: Math.floor(new Date('2025-06-01T00:00:00Z').getTime() / 1000),
      endTime: Math.floor(new Date('2025-06-03T00:00:00Z').getTime() / 1000),
    };

    beforeEach(async () => {
      // Create a hackathon to be replaced
      const response = await request(app.getHttpServer())
        .post('/hackathons')
        .set('Authorization', `Bearer ${execUserToken}`)
        .send(initialHackData);
      expect(response.status).toBe(201);
      hackToReplace = response.body;
    });

    it('EXEC role: should fully replace an existing hackathon (200)', async () => {
      const replaceData: HackathonUpdateEntity = { // HackathonUpdateEntity requires all fields except id
        name: 'E2E HackToReplace Updated Fully',
        startTime: Math.floor(new Date('2025-06-05T00:00:00Z').getTime() / 1000),
        endTime: Math.floor(new Date('2025-06-07T00:00:00Z').getTime() / 1000),
        active: false,
      };

      const response = await request(app.getHttpServer())
        .put(`/hackathons/${hackToReplace.id}`)
        .set('Authorization', `Bearer ${execUserToken}`)
        .send(replaceData)
        .expect(200);

      const updatedHackathon = response.body as HackathonEntity;
      expect(updatedHackathon).toBeDefined();
      expect(updatedHackathon.id).toEqual(hackToReplace.id);
      expect(updatedHackathon.name).toEqual(replaceData.name);
      expect(updatedHackathon.startTime).toEqual(replaceData.startTime);
      expect(updatedHackathon.endTime).toEqual(replaceData.endTime);
      expect(updatedHackathon.active).toEqual(replaceData.active);
    });

    it('EXEC role: should return 404 for replacing a non-existent hackathon ID', async () => {
      const nonExistentId = 'non-existent-put-id-789';
      const replaceData: HackathonUpdateEntity = {
        name: 'TryToUpdateNonExistent',
        startTime: Math.floor(new Date().getTime() / 1000),
        endTime: Math.floor(new Date().getTime() / 1000) + 1000,
        active: true,
      };
      await request(app.getHttpServer())
        .put(`/hackathons/${nonExistentId}`)
        .set('Authorization', `Bearer ${execUserToken}`)
        .send(replaceData)
        .expect(404);
    });

    it('EXEC role: should fail with invalid data (e.g., missing name) (400)', async () => {
      const invalidData = { // Missing 'name' which is required by HackathonUpdateEntity (via HackathonEntity)
        startTime: Math.floor(new Date('2025-06-05T00:00:00Z').getTime() / 1000),
        endTime: Math.floor(new Date('2025-06-07T00:00:00Z').getTime() / 1000),
        active: false,
      } as any; // Cast as any to allow sending incomplete data for testing validation
      await request(app.getHttpServer())
        .put(`/hackathons/${hackToReplace.id}`)
        .set('Authorization', `Bearer ${execUserToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('TEAM role: should be forbidden to replace a hackathon (403)', async () => {
      const replaceData: HackathonUpdateEntity = { name: "TeamTryPut", startTime: 1, endTime: 2, active: true };
      await request(app.getHttpServer())
        .put(`/hackathons/${hackToReplace.id}`)
        .set('Authorization', `Bearer ${teamUserToken}`)
        .send(replaceData)
        .expect(403);
    });

    it('NONE role: should be forbidden to replace a hackathon (403)', async () => {
      const replaceData: HackathonUpdateEntity = { name: "NoneRoleTryPut", startTime: 1, endTime: 2, active: true };
      await request(app.getHttpServer())
        .put(`/hackathons/${hackToReplace.id}`)
        .set('Authorization', `Bearer ${noRoleUserToken}`)
        .send(replaceData)
        .expect(403);
    });

    it('Unauthenticated: should be unauthorized to replace a hackathon (401)', async () => {
      const replaceData: HackathonUpdateEntity = { name: "UnauthTryPut", startTime: 1, endTime: 2, active: true };
      await request(app.getHttpServer())
        .put(`/hackathons/${hackToReplace.id}`)
        .send(replaceData)
        .expect(401);
    });
  });

  // --- DELETE /hackathons/:id ---
  describe('DELETE /hackathons/:id', () => {
    let hackToDelete: HackathonResponse;
    const initialHackData: HackathonCreateEntity = {
      name: 'E2E HackToDelete',
      startTime: Math.floor(new Date('2025-07-01T00:00:00Z').getTime() / 1000),
      endTime: Math.floor(new Date('2025-07-03T00:00:00Z').getTime() / 1000),
    };

    beforeEach(async () => {
      // Create a hackathon to be deleted
      const response = await request(app.getHttpServer())
        .post('/hackathons')
        .set('Authorization', `Bearer ${execUserToken}`)
        .send(initialHackData);
      expect(response.status).toBe(201);
      hackToDelete = response.body;
    });

    it('EXEC role: should delete an existing hackathon (204) and it should then be inaccessible (404)', async () => {
      await request(app.getHttpServer())
        .delete(`/hackathons/${hackToDelete.id}`)
        .set('Authorization', `Bearer ${execUserToken}`)
        .expect(204);

      // Verify it's gone
      await client(`/hackathons/${hackToDelete.id}`)
        .withToken(execUserToken) // Use a token that has GET permission
        .expect(404);
    });

    it('EXEC role: should return 404 for deleting a non-existent hackathon ID', async () => {
      const nonExistentId = 'non-existent-delete-id-000';
      await request(app.getHttpServer())
        .delete(`/hackathons/${nonExistentId}`)
        .set('Authorization', `Bearer ${execUserToken}`)
        .expect(404); // Assuming controller/filter handles this for delete as well
    });

    it('TEAM role: should be forbidden to delete a hackathon (403)', async () => {
      await request(app.getHttpServer())
        .delete(`/hackathons/${hackToDelete.id}`)
        .set('Authorization', `Bearer ${teamUserToken}`)
        .expect(403);
    });

    it('NONE role: should be forbidden to delete a hackathon (403)', async () => {
      await request(app.getHttpServer())
        .delete(`/hackathons/${hackToDelete.id}`)
        .set('Authorization', `Bearer ${noRoleUserToken}`)
        .expect(403);
    });

    it('Unauthenticated: should be unauthorized to delete a hackathon (401)', async () => {
      await request(app.getHttpServer())
        .delete(`/hackathons/${hackToDelete.id}`)
        .expect(401);
    });
  });

  // --- PATCH /hackathons/:id/active ---
  describe('PATCH /hackathons/:id/active', () => {
    let hackToMakeActive: HackathonResponse;
    let initiallyActiveHack: HackathonResponse;

    const hack1Data: HackathonCreateEntity = {
      name: 'E2E MarkActive Test Hack 1',
      startTime: Math.floor(new Date('2025-08-01T00:00:00Z').getTime() / 1000),
      endTime: Math.floor(new Date('2025-08-03T00:00:00Z').getTime() / 1000),
    };
    const hack2Data: HackathonCreateEntity = {
      name: 'E2E MarkActive Test Hack 2',
      startTime: Math.floor(new Date('2025-09-01T00:00:00Z').getTime() / 1000),
      endTime: Math.floor(new Date('2025-09-03T00:00:00Z').getTime() / 1000),
    };

    beforeEach(async () => {
      // Reset:
      // Create H1 (hack1Data) -> H1 is active. Store as `hackToMakeActive` (it's not active yet, but we will target it)
      const respH1 = await request(app.getHttpServer())
        .post('/hackathons')
        .set('Authorization', `Bearer ${execUserToken}`)
        .send(hack1Data);
      expect(respH1.status).toBe(201);
      hackToMakeActive = respH1.body; // Currently active

      // Create H2 (hack2Data) -> H2 is active, H1 becomes inactive.
      const respH2 = await request(app.getHttpServer())
        .post('/hackathons')
        .set('Authorization', `Bearer ${execUserToken}`)
        .send(hack2Data);
      expect(respH2.status).toBe(201);
      initiallyActiveHack = respH2.body; // This is now the active one. hackToMakeActive (H1) is now inactive.
                                         // So we will try to make H1 (hackToMakeActive) active.
    });

    it('EXEC role: should mark an inactive hackathon as active (200)', async () => {
      // hackToMakeActive (H1) is currently inactive. initiallyActiveHack (H2) is active.
      // We will mark H1 as active.
      const response = await request(app.getHttpServer())
        .patch(`/hackathons/${hackToMakeActive.id}/active`)
        .set('Authorization', `Bearer ${execUserToken}`)
        .expect(200);

      const updatedHackathon = response.body as HackathonEntity;
      expect(updatedHackathon).toBeDefined();
      expect(updatedHackathon.id).toEqual(hackToMakeActive.id);
      expect(updatedHackathon.active).toBe(true);

      // Optionally, verify the previously active one (initiallyActiveHack / H2) is now inactive.
      // This requires another GET and depends on mock-knex state.
      const formerActiveResponse = await client(`/hackathons/${initiallyActiveHack.id}`)
        .withToken(execUserToken)
        .expect(200);
      expect(formerActiveResponse.body.active).toBe(false);
    });

    it('EXEC role: should return 404 for marking a non-existent hackathon ID as active', async () => {
      const nonExistentId = 'non-existent-active-id-121';
      await request(app.getHttpServer())
        .patch(`/hackathons/${nonExistentId}/active`)
        .set('Authorization', `Bearer ${execUserToken}`)
        .expect(404);
    });

    it('TEAM role: should be forbidden to mark a hackathon as active (403)', async () => {
      await request(app.getHttpServer())
        .patch(`/hackathons/${hackToMakeActive.id}/active`)
        .set('Authorization', `Bearer ${teamUserToken}`)
        .expect(403);
    });

    it('NONE role: should be forbidden to mark a hackathon as active (403)', async () => {
      await request(app.getHttpServer())
        .patch(`/hackathons/${hackToMakeActive.id}/active`)
        .set('Authorization', `Bearer ${noRoleUserToken}`)
        .expect(403);
    });

    it('Unauthenticated: should be unauthorized to mark a hackathon as active (401)', async () => {
      await request(app.getHttpServer())
        .patch(`/hackathons/${hackToMakeActive.id}/active`)
        .expect(401);
    });
  });

  // --- GET /hackathons/active/static ---
  describe('GET /hackathons/active/static', () => {
    // No specific user context needed as it's a public endpoint

    describe('when an active hackathon exists', () => {
      let activeHackForStatic: HackathonResponse;
      const hackData: HackathonCreateEntity = {
        name: 'E2E Static Active Hack',
        startTime: Math.floor(new Date('2025-10-01T00:00:00Z').getTime() / 1000),
        endTime: Math.floor(new Date('2025-10-03T00:00:00Z').getTime() / 1000),
      };

      beforeEach(async () => {
        // Ensure there's an active hackathon.
        // If other tests might have deactivated all hackathons, create one.
        // To be safe, create one and ensure it's the *only* active one if necessary,
        // or just create one (it will become active).
        const response = await request(app.getHttpServer())
          .post('/hackathons')
          .set('Authorization', `Bearer ${execUserToken}`) // Need EXEC to create
          .send(hackData);
        expect(response.status).toBe(201);
        activeHackForStatic = response.body; // This is now active
      });

      it('should get the active hackathon data for static site (200)', async () => {
        const response = await client('/hackathons/active/static')
          .send() // No token needed
          .expect(200);

        const staticData = response.body as StaticActiveHackathonEntity;
        expect(staticData).toBeDefined();
        expect(staticData.id).toEqual(activeHackForStatic.id);
        expect(staticData.name).toEqual(hackData.name);
        expect(staticData.active).toBe(true); // Should be true
        expect(staticData.events).toBeInstanceOf(Array); // withGraphFetched should provide these
        expect(staticData.sponsors).toBeInstanceOf(Array); // withGraphFetched should provide these
        // Note: The actual content of events and sponsors depends on mock-knex setup
        // for withGraphFetched. For now, just checking they are arrays.
      });
    });

    describe('when NO active hackathon exists', () => {
      beforeEach(async () => {
        // Intentionally ensure no hackathon is active.
        // This is tricky with mock-knex without direct DB manipulation or specific mock handlers.
        // One way: create a hackathon, then immediately create another one to make the first one inactive,
        // then DELETE the second one. Or, if we had a way to PATCH all to active:false.
        // Simplest for now: assume tests run isolated or mock-knex is reset.
        // The controller uses `Hackathon.query().findOne({ active: true })...`
        // If mock-knex's findOne returns undefined/null for this, what happens?
        // The `withGraphFetched` on a null object might throw error or return null.
        // If it returns null, NestJS might send 200 with null body, or 204.
        // Let's assume the endpoint should gracefully return 200 and null/empty if not found.
        // For this test, we'd ideally set up mock-knex to return no active hackathon.
        // This part of the test might be less reliable without direct mock-knex control for findOne.
        // For now, this describe block is a placeholder for that scenario.
        // To simulate, we could try to ensure all known hackathons are inactive if possible,
        // but that's hard without a direct "deactivate all" or more control over mock-knex.
        // Alternative: if a previous test correctly deactivates all, this might pass.
        // This test is more conceptual with mock-knex unless specific mock handlers are added for findOne.

        // Attempt to make all hackathons inactive for this specific test context
        // This relies on the PATCH /active endpoint and that we can fetch all hackathons first
        // This is complex and might interfere with other tests if not perfectly isolated by mock-knex transactions
        const allHacksResponse = await client('/hackathons').withToken(execUserToken).send();
        if (allHacksResponse.status === 200 && Array.isArray(allHacksResponse.body)) {
          for (const hack of allHacksResponse.body as HackathonEntity[]) {
            if (hack.active) {
              // Create a dummy hackathon to make this one inactive
              // This is a workaround. A direct PATCH to active:false would be better if available to all roles or a test utility.
              await request(app.getHttpServer())
                .post('/hackathons')
                .set('Authorization', `Bearer ${execUserToken}`)
                .send({ name: 'Deactivator', startTime: 1, endTime: 2})
                .expect(201); // This makes 'Deactivator' active and 'hack' inactive
            }
          }
           // Finally, delete the "Deactivator" if it was created. This is getting very complex.
          const finalHacks = await client('/hackathons?active=true').withToken(execUserToken).send();
          if(finalHacks.status === 200 && finalHacks.body.length > 0 && finalHacks.body[0].name === 'Deactivator') {
            await request(app.getHttpServer())
            .delete(`/hackathons/${finalHacks.body[0].id}`)
            .set('Authorization', `Bearer ${execUserToken}`)
            .expect(204);
          }
        }
      });

      it('should return 200 and null or an empty object if no active hackathon exists', async () => {
        // This test case's setup is NOT YET IMPLEMENTED due to mock-knex complexity
        // for ensuring "no active hackathon".
        // If the `findOne({active: true})` in controller returns null, and `withGraphFetched` handles it,
        // we might expect a 200 with a null body or an empty object.
        // A 404 would be better but might require specific error handling for this path.

        // To actually test this, one would need to ensure the mock DB returns no active hackathon.
        // For now, this is a known limitation of testing this path with the current mock strategy.
        // I will write it to expect 200 and a null body as a possible outcome.
        const response = await client('/hackathons/active/static')
          .send()
          .expect(200); // Or 204 if NestJS converts null to No Content

        // If it's 200, body could be null or an empty object if nothing is found
        // If controller returns `null`, response.body will be `null` if using Express.
        expect(response.body).toBeNull();
        // Or if it returns an empty object: expect(response.body).toEqual({});
        // This assertion depends on how NestJS and superagent handle a null return from controller.
        // And how `withGraphFetched` behaves with a null parent.
      });
    });
  });

});
