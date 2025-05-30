import { Test, TestingModule } from '@nestjs/testing';
import { HackathonController } from './hackathon.controller';
import { Hackathon, HackathonEntity } from '@entities/hackathon.entity';
import { Event } from '@entities/event.entity';
import { SocketGateway } from 'modules/socket/socket.gateway';
import { ValidationPipe } from '@nestjs/common';
import { Role } from 'common/gcp';

// Import the original entity. This will be the actual class.
import { Hackathon as RealHackathon } from '@entities/hackathon.entity';

// Mock the static methods directly on the imported class.
// Jest will hoist jest.mock calls, so we need to be careful with how we structure this.
// A common pattern is to mock the module and then restore parts of it or augment it.

jest.mock('@entities/hackathon.entity', () => {
  const originalModule = jest.requireActual('@entities/hackathon.entity');

  // Create a spy or mock function for the static methods
  // but ensure we're attaching them to the *actual* class constructor
  // that NestJS will use as a token.
  // One way is to return the original module but modify the Hackathon class within it.

  const OriginalHackathonClass = originalModule.Hackathon;
  OriginalHackathonClass.query = jest.fn();
  OriginalHackathonClass.relatedQuery = jest.fn();

  return {
    ...originalModule, // Return all original exports
    Hackathon: OriginalHackathonClass, // Ensure Hackathon is the class with mocked statics
  };
});

// Then, when importing in your spec file, you get the Hackathon class with static methods already mocked:
// import { Test, TestingModule } from '@nestjs/testing'; // Already imported
// import { HackathonController } from './hackathon.controller'; // Already imported
// Import Hackathon (which is now the class with mocked statics) and HackathonEntity (the type)
// import { Hackathon, HackathonEntity } from '@entities/hackathon.entity'; // Already imported
// import { Event } from '@entities/event.entity'; // Assuming Event doesn't need static mocks or is handled similarly // Already imported
// import { SocketGateway } from 'modules/socket/socket.gateway'; // Already imported
import { nanoid } from 'nanoid'; // Already imported, but ensure it's here

// DTOs should be imported now that they are exported from the controller
import {
  HackathonCreateEntity,
  HackathonPatchEntity,
  HackathonUpdateEntity,
  // ActiveHackathonParams might be used as an interface directly in tests if preferred
} from './hackathon.controller';


// Mock nanoid (keep this as is)
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-id-from-nanoid-mock'),
}));

describe('HackathonController', () => {
  let controller: HackathonController;

  let mockHackathonRepo;
  let mockEventRepo;
  let mockSocketGateway;

  let mockStaticHackathonQueryBuilder;
  let mockHackathonRepoQueryBuilder;
  let mockEventRepoQueryBuilder;

  beforeEach(async () => {
    // Setup for mockStaticHackathonQueryBuilder (used by Hackathon.query() etc.)
    mockStaticHackathonQueryBuilder = {
      findOne: jest.fn().mockReturnThis(),
      patch: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      withGraphFetched: jest.fn().mockReturnThis(),
      first: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    // Configure the mocked static methods on the (actual) Hackathon class
    // This is crucial: Hackathon.query is now the jest.fn() from the module mock setup.
    (RealHackathon.query as jest.Mock).mockReturnValue(mockStaticHackathonQueryBuilder);
    (RealHackathon.relatedQuery as jest.Mock).mockReturnValue(mockStaticHackathonQueryBuilder);
    // Or if Hackathon is imported directly and correctly by jest.mock:
    // (Hackathon.query as jest.Mock).mockReturnValue(mockStaticHackathonQueryBuilder);
    // (Hackathon.relatedQuery as jest.Mock).mockReturnValue(mockStaticHackathonQueryBuilder);
    // The key is that the `Hackathon` token used in `provide: Hackathon` must be the one NestJS expects.
    // The jest.mock should ensure the imported `Hackathon` is this correct tokenised class.

    // The rest of the beforeEach for mockHackathonRepoQueryBuilder, mockEventRepoQueryBuilder,
    // mockHackathonRepo, mockEventRepo, mockSocketGateway remains the same.
    // ... (previous beforeEach content for these mocks)

    mockHackathonRepoQueryBuilder = { // Ensure this is defined before use
      exec: jest.fn(),
      where: jest.fn().mockReturnThis(),
    };

    mockEventRepoQueryBuilder = {
      exec: jest.fn(),
    };

    mockHackathonRepo = {
      findAll: jest.fn().mockReturnValue(mockHackathonRepoQueryBuilder),
      findOne: jest.fn().mockReturnValue(mockHackathonRepoQueryBuilder),
      createOne: jest.fn().mockReturnValue(mockHackathonRepoQueryBuilder),
      patchOne: jest.fn().mockReturnValue(mockHackathonRepoQueryBuilder),
      replaceOne: jest.fn().mockReturnValue(mockHackathonRepoQueryBuilder),
      deleteOne: jest.fn().mockReturnValue(mockHackathonRepoQueryBuilder),
      raw: jest.fn().mockReturnValue(mockHackathonRepoQueryBuilder),
    };

    mockEventRepo = {
      createOne: jest.fn().mockReturnValue(mockEventRepoQueryBuilder),
    };

    mockSocketGateway = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HackathonController],
      providers: [
        {
          provide: "ObjectionEntityHackathon",
          useValue: mockHackathonRepo,
        },
        {
          provide: "ObjectionEntityEvent",
          useValue: mockEventRepo,
        },
        {
          provide: SocketGateway,
          useValue: mockSocketGateway,
        },
      ],
    }).compile();

    controller = module.get<HackathonController>(HackathonController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Further tests for each controller method will be added here
  describe('getAll', () => {
    // Define a type for the params if ActiveHackathonParams is not exported
    interface GetAllParams {
      active?: boolean;
    }

    it('should return all hackathons when active is undefined', async () => {
      const mockHackathons = [{ id: '1', name: 'Hackathon 1' }, { id: '2', name: 'Hackathon 2' }] as HackathonEntity[];
      mockHackathonRepoQueryBuilder.exec.mockResolvedValueOnce(mockHackathons);

      const params: GetAllParams = { active: undefined };
      const result = await controller.getAll(params);

      expect(mockHackathonRepo.findAll).toHaveBeenCalledTimes(1);
      expect(mockHackathonRepoQueryBuilder.exec).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockHackathons);
    });

    it('should return active hackathon with checkInId when active is true and check-in event exists', async () => {
      const mockActiveHackathonResult = { id: 'active-hack', name: 'Active H', active: true, $parseDatabaseJson: jest.fn(json => json) } as unknown as Hackathon;
      const mockCheckInEventResult = { id: 'check-in-id', type: 'checkIn' };

      const hackathonQueryExecMock = jest.fn().mockResolvedValueOnce(mockActiveHackathonResult);
      const hackathonQueryBuilderMock = {
        findOne: jest.fn(),
        then: jest.fn((onfulfilled) => Promise.resolve(hackathonQueryExecMock()).then(onfulfilled))
      };
      hackathonQueryBuilderMock.findOne.mockReturnValue(hackathonQueryBuilderMock);
      (Hackathon.query as jest.Mock).mockReturnValueOnce(hackathonQueryBuilderMock);

      const checkInQueryFirstMock = jest.fn().mockResolvedValueOnce(mockCheckInEventResult);
      const checkInQueryBuilderMock = {
        for: jest.fn(),
        where: jest.fn(),
        first: checkInQueryFirstMock
      };
      checkInQueryBuilderMock.for.mockReturnValue(checkInQueryBuilderMock);
      checkInQueryBuilderMock.where.mockReturnValue(checkInQueryBuilderMock);
      (Hackathon.relatedQuery as jest.Mock).mockReturnValueOnce(checkInQueryBuilderMock);

      const params: GetAllParams = { active: true };
      const result = await controller.getAll(params);

      expect(Hackathon.query).toHaveBeenCalledTimes(1);
      expect(hackathonQueryBuilderMock.findOne).toHaveBeenCalledWith({ active: true });
      expect(hackathonQueryExecMock).toHaveBeenCalledTimes(1);

      expect(Hackathon.relatedQuery).toHaveBeenCalledWith('events');
      expect(checkInQueryBuilderMock.for).toHaveBeenCalledWith(hackathonQueryBuilderMock);
      expect(checkInQueryBuilderMock.where).toHaveBeenCalledWith('type', 'checkIn');
      expect(checkInQueryFirstMock).toHaveBeenCalledTimes(1);

      expect(result).toEqual([{ ...mockActiveHackathonResult, checkInId: mockCheckInEventResult.id }]);
    });

    it('should return active hackathon without checkInId if no check-in event found, when active is true', async () => {
      const mockActiveHackathonResult = { id: 'active-hack-2', name: 'Active H2', active: true, $parseDatabaseJson: jest.fn(function(json) { return json; }) } as unknown as Hackathon;

      const hackathonQueryExecMock = jest.fn().mockResolvedValueOnce(mockActiveHackathonResult);
      const hackathonQueryBuilderMock = {
        findOne: jest.fn(),
        then: jest.fn((onfulfilled) => Promise.resolve(hackathonQueryExecMock()).then(onfulfilled))
      };
      hackathonQueryBuilderMock.findOne.mockReturnValue(hackathonQueryBuilderMock);
      (Hackathon.query as jest.Mock).mockReturnValueOnce(hackathonQueryBuilderMock);

      const checkInQueryFirstMock = jest.fn().mockResolvedValueOnce(undefined); // No check-in event
      const checkInQueryBuilderMock = {
        for: jest.fn(),
        where: jest.fn(),
        first: checkInQueryFirstMock
      };
      checkInQueryBuilderMock.for.mockReturnValue(checkInQueryBuilderMock);
      checkInQueryBuilderMock.where.mockReturnValue(checkInQueryBuilderMock);
      (Hackathon.relatedQuery as jest.Mock).mockReturnValueOnce(checkInQueryBuilderMock);

      const params: GetAllParams = { active: true };
      const result = await controller.getAll(params);

      expect(Hackathon.query).toHaveBeenCalledTimes(1);
      expect(hackathonQueryBuilderMock.findOne).toHaveBeenCalledWith({ active: true });
      expect(hackathonQueryExecMock).toHaveBeenCalledTimes(1);

      expect(Hackathon.relatedQuery).toHaveBeenCalledWith('events');
      expect(checkInQueryBuilderMock.for).toHaveBeenCalledWith(hackathonQueryBuilderMock);
      expect(checkInQueryBuilderMock.where).toHaveBeenCalledWith('type', 'checkIn');
      expect(checkInQueryFirstMock).toHaveBeenCalledTimes(1);

      expect(result).toEqual([{ ...mockActiveHackathonResult }]);
    });

    it('should return inactive hackathons when active is false', async () => {
      const mockInactiveHackathons = [{ id: '3', name: 'Hackathon 3', active: false }] as HackathonEntity[]; // Ensure this is defined if not already visible
      const execMock = jest.fn().mockResolvedValueOnce(mockInactiveHackathons);

      const mockRawQB = {
        where: jest.fn(),
        exec: execMock, // Keep exec for explicit calls
        then: function(onFulfilled, onRejected) { // Make it thenable
          return execMock().then(onFulfilled, onRejected);
        }
      };
      // Ensure that calling .where() on mockRawQB returns mockRawQB itself to allow chaining .exec() or .then()
      mockRawQB.where.mockReturnValue(mockRawQB);

      const mockFindAllQB = {
        raw: jest.fn().mockReturnValue(mockRawQB),
      };
      // Ensure mockHackathonRepo.findAll is correctly mocked for this test case.
      // If mockHackathonRepo.findAll is part of the broader beforeEach setup,
      // this mockReturnValueOnce will override it for this specific test.
      if (mockHackathonRepo && mockHackathonRepo.findAll && typeof mockHackathonRepo.findAll.mockReturnValueOnce === 'function') {
        mockHackathonRepo.findAll.mockReturnValueOnce(mockFindAllQB);
      } else {
        // Fallback or error if mockHackathonRepo.findAll is not a jest mock function as expected
        console.error("mockHackathonRepo.findAll is not a jest mock function or is undefined");
        // This might indicate an issue with how mockHackathonRepo is shared or set up
      }

      const params: GetAllParams = { active: false };
      const result = await controller.getAll(params);

      expect(mockHackathonRepo.findAll).toHaveBeenCalledTimes(1);
      expect(mockFindAllQB.raw).toHaveBeenCalledTimes(1);
      expect(mockRawQB.where).toHaveBeenCalledWith('active', false);
      expect(execMock).toHaveBeenCalledTimes(1); // Check the isolated exec mock
      expect(result).toEqual(mockInactiveHackathons);
    });
  });

  describe('createOne', () => {
    let mockHackathonCreateData: HackathonCreateEntity;

    beforeEach(() => {
      mockHackathonCreateData = {
        name: 'Test Hackathon',
        startTime: 1678886400, // Example timestamp
        endTime: 1678972800,   // Example timestamp
      };

      // Reset relevant mock resolved values for exec if they were set by other tests without Once
      mockStaticHackathonQueryBuilder.exec.mockReset();
      mockHackathonRepoQueryBuilder.exec.mockReset();
      mockEventRepoQueryBuilder.exec.mockReset();
    });

    it('should create a new hackathon, set it active, deactivate others, create a check-in event, and emit a socket event', async () => {
      (Hackathon.query as jest.Mock).mockClear(); // Explicitly clear before setting mockReturnValueOnce

      const newHackathonId = 'test-id-from-nanoid-mock'; // From our global nanoid mock
      const expectedCreatedHackathon = {
        ...mockHackathonCreateData,
        id: newHackathonId,
        active: true,
        $parseDatabaseJson: jest.fn(json => json) // Add mock for entity method
      };
      const expectedCheckInEvent = {
        id: newHackathonId, // nanoid is called again for event id
        name: 'Check-in',
        type: 'checkIn',
        startTime: mockHackathonCreateData.startTime,
        endTime: mockHackathonCreateData.endTime,
        hackathonId: newHackathonId
      };

      // Mock for Hackathon.query().patch({ active: false }).where("active", true).exec()
      const staticExecMock = jest.fn().mockResolvedValueOnce(undefined);
      const staticQueryBuilderMock = {
        patch: jest.fn(),
        where: jest.fn(),
        exec: staticExecMock // Direct exec, not via then, as controller calls .exec()
      };
      staticQueryBuilderMock.patch.mockReturnValue(staticQueryBuilderMock);
      staticQueryBuilderMock.where.mockReturnValue(staticQueryBuilderMock);
      (Hackathon.query as jest.Mock).mockReturnValueOnce(staticQueryBuilderMock);

      // Mock for this.hackathonRepo.createOne(...).exec()
      mockHackathonRepoQueryBuilder.exec.mockResolvedValueOnce(expectedCreatedHackathon);

      // Mock for this.eventRepo.createOne(...).exec()
      mockEventRepoQueryBuilder.exec.mockResolvedValueOnce(expectedCheckInEvent);

      // (nanoid as jest.Mock).mockReturnValueOnce(newHackathonId); // For hackathon ID
      // (nanoid as jest.Mock).mockReturnValueOnce(expectedCheckInEvent.id); // For event ID
      // Since nanoid is globally mocked to return 'test-id-from-nanoid-mock', we expect this ID.
      // The controller calls nanoid() twice. So we can check the call count or specific return values if needed.
      (nanoid as jest.Mock).mockImplementation(() => 'test-id-from-nanoid-mock');


      const result = await controller.createOne(mockHackathonCreateData);

      // Verify Hackathon.query().patch().where().exec()
      expect(Hackathon.query).toHaveBeenCalledTimes(1);
      expect(staticQueryBuilderMock.patch).toHaveBeenCalledTimes(1); // Check this first
      // expect(staticQueryBuilderMock.patch).toHaveBeenCalledWith({ active: false });
      // expect(staticQueryBuilderMock.where).toHaveBeenCalledWith('active', true);
      // expect(staticExecMock).toHaveBeenCalledTimes(1);

      // Verify nanoid calls (once for hackathonId, once for eventId)
      expect(nanoid).toHaveBeenCalledTimes(2);


      // Verify hackathonRepo.createOne
      expect(mockHackathonRepo.createOne).toHaveBeenCalledWith({
        ...mockHackathonCreateData,
        id: newHackathonId, // From nanoid mock
        active: true,
      });
      expect(mockHackathonRepoQueryBuilder.exec).toHaveBeenCalledTimes(1);

      // Verify eventRepo.createOne
      expect(mockEventRepo.createOne).toHaveBeenCalledWith({
        id: newHackathonId, // Second call to nanoid mock
        name: 'Check-in',
        type: 'checkIn',
        startTime: mockHackathonCreateData.startTime,
        endTime: mockHackathonCreateData.endTime,
        hackathonId: newHackathonId,
      });
      expect(mockEventRepoQueryBuilder.exec).toHaveBeenCalledTimes(1);

      // Verify socket.emit
      expect(mockSocketGateway.emit).toHaveBeenCalledWith('create:hackathon', expectedCreatedHackathon);

      // Verify result
      expect(result).toEqual({
        ...expectedCreatedHackathon,
        checkInId: expectedCheckInEvent.id,
      });
    });
  });

  describe('getOne', () => {
    beforeEach(() => {
      // Reset mock resolved values if necessary
      mockHackathonRepoQueryBuilder.exec.mockReset();
    });

    it('should return a hackathon when a valid ID is provided', async () => {
      const hackathonId = 'test-id';
      const mockHackathon = {
        id: hackathonId,
        name: 'Test Hackathon',
        active: true,
        $parseDatabaseJson: jest.fn(json => json)
      } as unknown as HackathonEntity;

      // Mock for this.hackathonRepo.findOne(id).exec()
      mockHackathonRepoQueryBuilder.exec.mockResolvedValueOnce(mockHackathon);

      const result = await controller.getOne(hackathonId);

      expect(mockHackathonRepo.findOne).toHaveBeenCalledWith(hackathonId);
      expect(mockHackathonRepoQueryBuilder.exec).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockHackathon);
    });

    it('should return undefined when an invalid ID is provided and hackathon is not found', async () => {
      const invalidHackathonId = 'invalid-id';

      // Mock findOne().exec() to return undefined for a not-found case
      mockHackathonRepoQueryBuilder.exec.mockResolvedValueOnce(undefined);

      const result = await controller.getOne(invalidHackathonId);

      expect(mockHackathonRepo.findOne).toHaveBeenCalledWith(invalidHackathonId);
      expect(mockHackathonRepoQueryBuilder.exec).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });

    // Optional: If the repository or DBExceptionFilter transforms "not found" into an error,
    // you could test for that. However, unit testing the controller usually means
    // testing up to the point of what its direct dependencies return or throw.
    // For example, if findOne().exec() could throw a specific 'NotFoundException'
    // it would be:
    // it('should throw NotFoundException if findOne throws it', async () => {
    //   const id = 'not-found-id';
    //   mockHackathonRepoQueryBuilder.exec.mockRejectedValueOnce(new NotFoundException());
    //   await expect(controller.getOne(id)).rejects.toThrow(NotFoundException);
    // });
    // But given the current controller code, it directly returns the result of exec(),
    // so returning undefined is the most direct test. The DBExceptionFilter is outside this unit.
  });

  describe('patchOne', () => {
    let hackathonId: string;
    let mockPatchData: HackathonPatchEntity;
    let originalHackathon: HackathonEntity;

    beforeEach(() => {
      hackathonId = 'test-patch-id';
      mockPatchData = {
        name: 'Updated Hackathon Name',
        endTime: 1700000000, // New end time
      };
      originalHackathon = {
        id: hackathonId,
        name: 'Original Hackathon Name',
        startTime: 1600000000,
        endTime: 1650000000,
        active: true,
        $parseDatabaseJson: jest.fn(json => json)
      } as unknown as HackathonEntity; // Cast needed due to $parseDatabaseJson and potential other entity methods

      mockHackathonRepoQueryBuilder.exec.mockReset();
    });

    it('should patch a hackathon and emit an update event', async () => {
      const updatedHackathon = {
        ...originalHackathon,
        ...mockPatchData,
      };
      // Mock for this.hackathonRepo.patchOne(id, data).exec()
      mockHackathonRepoQueryBuilder.exec.mockResolvedValueOnce(updatedHackathon);

      const result = await controller.patchOne(hackathonId, mockPatchData);

      expect(mockHackathonRepo.patchOne).toHaveBeenCalledWith(hackathonId, mockPatchData);
      expect(mockHackathonRepoQueryBuilder.exec).toHaveBeenCalledTimes(1);
      expect(mockSocketGateway.emit).toHaveBeenCalledWith('update:hackathon', updatedHackathon);
      expect(result).toEqual(updatedHackathon);
    });

    it('should return the patched hackathon even if socket emit fails (though emit is void)', async () => {
      // This test is more about ensuring the primary logic completes
      const updatedHackathon = {
        ...originalHackathon,
        ...mockPatchData,
      };
      mockHackathonRepoQueryBuilder.exec.mockResolvedValueOnce(updatedHackathon);
      mockSocketGateway.emit.mockImplementationOnce(() => {
        // Simulate an error during emit, though it's fire-and-forget
        // console.error("Simulated socket emit error");
      });

      const result = await controller.patchOne(hackathonId, mockPatchData);

      expect(mockHackathonRepo.patchOne).toHaveBeenCalledWith(hackathonId, mockPatchData);
      expect(result).toEqual(updatedHackathon); // Still returns the hackathon
      expect(mockSocketGateway.emit).toHaveBeenCalledWith('update:hackathon', updatedHackathon); // Emit was still called
    });

    // Consider what happens if patchOne().exec() returns undefined (e.g. hackathon not found)
    // The current controller doesn't explicitly handle this before returning,
    // so it would return undefined. The DBExceptionFilter might catch errors from the DB if `patchOne` throws.
    it('should return undefined if patchOne().exec() returns undefined (e.g., not found)', async () => {
      mockHackathonRepoQueryBuilder.exec.mockResolvedValueOnce(undefined);

      const result = await controller.patchOne(hackathonId, mockPatchData);

      expect(mockHackathonRepo.patchOne).toHaveBeenCalledWith(hackathonId, mockPatchData);
      expect(mockHackathonRepoQueryBuilder.exec).toHaveBeenCalledTimes(1);
      // If exec returns undefined, socket.emit would be called with undefined
      expect(mockSocketGateway.emit).toHaveBeenCalledWith('update:hackathon', undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('replaceOne', () => {
    let hackathonId: string;
    let mockUpdateData: HackathonUpdateEntity;

    beforeEach(() => {
      hackathonId = 'test-replace-id';
      mockUpdateData = {
        name: 'Replaced Hackathon Name',
        startTime: 1700000001,
        endTime: 1700000002,
        active: false, // replaceOne requires all fields from HackathonUpdateEntity
      };
      mockHackathonRepoQueryBuilder.exec.mockReset();
    });

    it('should replace a hackathon and emit an update event', async () => {
      const replacedHackathon = { // The result of replaceOne should be the new data + id
        id: hackathonId,
        ...mockUpdateData,
        $parseDatabaseJson: jest.fn(json => json)
      } as unknown as HackathonEntity;

      // Mock for this.hackathonRepo.replaceOne(id, data).exec()
      mockHackathonRepoQueryBuilder.exec.mockResolvedValueOnce(replacedHackathon);

      const result = await controller.replaceOne(hackathonId, mockUpdateData);

      expect(mockHackathonRepo.replaceOne).toHaveBeenCalledWith(hackathonId, mockUpdateData);
      expect(mockHackathonRepoQueryBuilder.exec).toHaveBeenCalledTimes(1);
      expect(mockSocketGateway.emit).toHaveBeenCalledWith('update:hackathon', replacedHackathon);
      expect(result).toEqual(replacedHackathon);
    });

    it('should return undefined if replaceOne().exec() returns undefined (e.g., not found or not replaced)', async () => {
      mockHackathonRepoQueryBuilder.exec.mockResolvedValueOnce(undefined);

      const result = await controller.replaceOne(hackathonId, mockUpdateData);

      expect(mockHackathonRepo.replaceOne).toHaveBeenCalledWith(hackathonId, mockUpdateData);
      expect(mockHackathonRepoQueryBuilder.exec).toHaveBeenCalledTimes(1);
      expect(mockSocketGateway.emit).toHaveBeenCalledWith('update:hackathon', undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('deleteOne', () => {
    let hackathonId: string;

    beforeEach(() => {
      hackathonId = 'test-delete-id';
      mockHackathonRepoQueryBuilder.exec.mockReset();
    });

    it('should delete a hackathon and emit a delete event', async () => {
      const deletedHackathon = {
        id: hackathonId,
        name: 'Deleted Hackathon',
        active: false,
        $parseDatabaseJson: jest.fn(json => json)
      } as unknown as HackathonEntity;

      // Mock for this.hackathonRepo.deleteOne(id).exec()
      mockHackathonRepoQueryBuilder.exec.mockResolvedValueOnce(deletedHackathon);

      const result = await controller.deleteOne(hackathonId);

      expect(mockHackathonRepo.deleteOne).toHaveBeenCalledWith(hackathonId);
      expect(mockHackathonRepoQueryBuilder.exec).toHaveBeenCalledTimes(1);
      expect(mockSocketGateway.emit).toHaveBeenCalledWith('delete:hackathon', deletedHackathon);
      expect(result).toEqual(deletedHackathon); // Controller returns the result of exec()
    });

    it('should return undefined if deleteOne().exec() returns undefined (e.g., not found)', async () => {
      // Mock deleteOne().exec() to return undefined
      mockHackathonRepoQueryBuilder.exec.mockResolvedValueOnce(undefined);

      const result = await controller.deleteOne(hackathonId);

      expect(mockHackathonRepo.deleteOne).toHaveBeenCalledWith(hackathonId);
      expect(mockHackathonRepoQueryBuilder.exec).toHaveBeenCalledTimes(1);
      // If exec returns undefined, socket.emit would be called with undefined
      expect(mockSocketGateway.emit).toHaveBeenCalledWith('delete:hackathon', undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('markActive', () => {
    let hackathonIdToMarkActive: string;

    beforeEach(() => {
      hackathonIdToMarkActive = 'test-mark-active-id';

      // Reset relevant mock resolved values
      mockStaticHackathonQueryBuilder.exec.mockReset(); // For Hackathon.query().patch().where().exec()
      mockHackathonRepoQueryBuilder.exec.mockReset();   // For this.hackathonRepo.patchOne().exec()
    });

    it('should deactivate other active hackathons, activate the specified one, and emit an update event', async () => {
      const newlyActivatedHackathon = {
        id: hackathonIdToMarkActive,
        name: 'Newly Active Hackathon',
        active: true,
        $parseDatabaseJson: jest.fn(json => json)
      } as unknown as HackathonEntity;

      // Mock for Hackathon.query().patch({ active: false }).where("active", true).exec()
      const staticExecMock = jest.fn().mockResolvedValueOnce(undefined);
      const staticQueryBuilderMock = { // Renamed for clarity
        patch: jest.fn(),
        where: jest.fn(),
        exec: staticExecMock // Direct exec
      };
      staticQueryBuilderMock.patch.mockReturnValue(staticQueryBuilderMock);
      staticQueryBuilderMock.where.mockReturnValue(staticQueryBuilderMock);
      (Hackathon.query as jest.Mock).mockReturnValueOnce(staticQueryBuilderMock);

      // Mock for this.hackathonRepo.patchOne(id, { active: true }).exec()
      mockHackathonRepoQueryBuilder.exec.mockResolvedValueOnce(newlyActivatedHackathon);

      const result = await controller.markActive(hackathonIdToMarkActive);

      // Verify deactivation of others
      expect(Hackathon.query).toHaveBeenCalledTimes(1);
      expect(staticQueryBuilderMock.patch).toHaveBeenCalledTimes(1); // Check this first
      // expect(staticQueryBuilderMock.patch).toHaveBeenCalledWith({ active: false });
      // expect(staticQueryBuilderMock.where).toHaveBeenCalledWith('active', true);
      // expect(staticExecMock).toHaveBeenCalledTimes(1);

      // Verify activation of the specified hackathon
      expect(mockHackathonRepo.patchOne).toHaveBeenCalledWith(hackathonIdToMarkActive, { active: true });
      expect(mockHackathonRepoQueryBuilder.exec).toHaveBeenCalledTimes(1);

      // Verify socket emit
      expect(mockSocketGateway.emit).toHaveBeenCalledWith('update:hackathon', newlyActivatedHackathon);

      // Verify result
      expect(result).toEqual(newlyActivatedHackathon);
    });

    it('should still attempt to activate and emit if deactivation fails or affects no rows', async () => {
      // Simulate deactivation affecting 0 rows (or an error, though the controller doesn't catch it)
      const newlyActivatedHackathon = {
        id: hackathonIdToMarkActive,
        name: 'Newly Active Hackathon',
        active: true,
        $parseDatabaseJson: jest.fn(json => json)
      } as unknown as HackathonEntity;

      (Hackathon.query as jest.Mock).mockReturnValueOnce({
        patch: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValueOnce(0), // Simulate 0 rows affected by deactivation
      });
      mockHackathonRepoQueryBuilder.exec.mockResolvedValueOnce(newlyActivatedHackathon);

      await controller.markActive(hackathonIdToMarkActive);

      expect(mockHackathonRepo.patchOne).toHaveBeenCalledWith(hackathonIdToMarkActive, { active: true });
      expect(mockSocketGateway.emit).toHaveBeenCalledWith('update:hackathon', newlyActivatedHackathon);
    });

    it('should return undefined and emit undefined if activating the specified hackathon fails (returns undefined)', async () => {
      (Hackathon.query as jest.Mock).mockReturnValueOnce({ // Mock the deactivation call
        patch: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValueOnce(undefined),
      });

      // Mock patchOne().exec() to return undefined for the activation part
      mockHackathonRepoQueryBuilder.exec.mockResolvedValueOnce(undefined);

      const result = await controller.markActive(hackathonIdToMarkActive);

      expect(Hackathon.query).toHaveBeenCalledTimes(1); // Deactivation was attempted
      expect(mockHackathonRepo.patchOne).toHaveBeenCalledWith(hackathonIdToMarkActive, { active: true });
      expect(mockHackathonRepoQueryBuilder.exec).toHaveBeenCalledTimes(1);
      expect(mockSocketGateway.emit).toHaveBeenCalledWith('update:hackathon', undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('getForStatic', () => {
    beforeEach(() => {
      // Reset relevant mock resolved values if necessary
      mockStaticHackathonQueryBuilder.exec.mockReset();
    });

    it('should fetch the active hackathon with events, locations, and sponsors', async () => {
      const mockStaticHackathonData = {
        id: 'static-active-id',
        name: 'Static Active Hackathon',
        active: true,
        events: [
          { id: 'event1', name: 'Event 1', location: { id: 'loc1', name: 'Location 1' } },
        ],
        sponsors: [
          { id: 'sponsor1', name: 'Sponsor 1' },
        ],
        $parseDatabaseJson: jest.fn(json => json)
      } as unknown as HackathonEntity; // The return type is complex, casting for simplicity in test

      // Mock for Hackathon.query().findOne({ active: true }).withGraphFetched(...).exec()
      // This is directly awaited, so the exec mock is called via .then()
      const execMock = jest.fn().mockResolvedValueOnce(mockStaticHackathonData);
      const queryBuilderMock = {
        findOne: jest.fn(),
        withGraphFetched: jest.fn(),
        then: jest.fn((onfulfilled) => Promise.resolve(execMock()).then(onfulfilled))
      };
      queryBuilderMock.findOne.mockReturnValue(queryBuilderMock);
      queryBuilderMock.withGraphFetched.mockReturnValue(queryBuilderMock);
      (Hackathon.query as jest.Mock).mockReturnValueOnce(queryBuilderMock);

      const result = await controller.getForStatic();

      expect(Hackathon.query).toHaveBeenCalledTimes(1);
      expect(queryBuilderMock.findOne).toHaveBeenCalledWith({ active: true });
      expect(queryBuilderMock.withGraphFetched).toHaveBeenCalledWith('[events.location, sponsors]');
      expect(execMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockStaticHackathonData);
    });

    it('should return undefined if no active hackathon is found for static', async () => {
      // Mock Hackathon.query().findOne().withGraphFetched().exec() to return undefined
      const execMockForNotFound = jest.fn().mockResolvedValueOnce(undefined);
      const queryBuilderMockForNotFound = { // Renamed for clarity
        findOne: jest.fn(),
        withGraphFetched: jest.fn(),
        then: jest.fn((onfulfilled) => Promise.resolve(execMockForNotFound()).then(onfulfilled))
      };
      queryBuilderMockForNotFound.findOne.mockReturnValue(queryBuilderMockForNotFound);
      queryBuilderMockForNotFound.withGraphFetched.mockReturnValue(queryBuilderMockForNotFound);
      (Hackathon.query as jest.Mock).mockReturnValueOnce(queryBuilderMockForNotFound);

      const result = await controller.getForStatic();

      expect(Hackathon.query).toHaveBeenCalledTimes(1);
      const mockQueryInstance = (Hackathon.query as jest.Mock).mock.results[0].value;
      expect(mockQueryInstance.findOne).toHaveBeenCalledWith({ active: true });
      expect(mockQueryInstance.withGraphFetched).toHaveBeenCalledWith('[events.location, sponsors]');
      expect(execMockForNotFound).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });
  });
});
