import { Test, TestingModule } from '@nestjs/testing';
import { HackathonController } from './hackathon.controller';
import { Hackathon, HackathonEntity } from '@entities/hackathon.entity';
import { Event } from '@entities/event.entity';
import { SocketGateway } from 'modules/socket/socket.gateway';
import { ValidationPipe } from '@nestjs/common';
import { Role } from 'common/gcp';

// Mock the Hackathon entity for static query methods
jest.mock('@entities/hackathon.entity', () => {
  const originalModule = jest.requireActual('@entities/hackathon.entity');
  return {
    __esModule: true,
    ...originalModule,
    Hackathon: {
      ...originalModule.Hackathon,
      query: jest.fn(),
      relatedQuery: jest.fn(),
    },
  };
});

// Mock nanoid
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
    mockStaticHackathonQueryBuilder = {
      findOne: jest.fn().mockReturnThis(),
      patch: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      withGraphFetched: jest.fn().mockReturnThis(),
      first: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    (Hackathon.query as jest.Mock).mockReturnValue(mockStaticHackathonQueryBuilder);
    (Hackathon.relatedQuery as jest.Mock).mockReturnValue(mockStaticHackathonQueryBuilder);

    mockHackathonRepoQueryBuilder = {
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
          provide: Hackathon,
          useValue: mockHackathonRepo,
        },
        {
          provide: Event,
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
      const mockActiveHackathon = { id: 'active-hack', name: 'Active H', active: true, $parseDatabaseJson: jest.fn(function(json) { return json; }) } as unknown as Hackathon;
      const mockCheckInEvent = { id: 'check-in-id', type: 'checkIn' };

      const findOneMock = jest.fn().mockReturnThis();
      const execHackathonFindOneMock = jest.fn().mockResolvedValueOnce(mockActiveHackathon);
      (Hackathon.query as jest.Mock).mockReturnValueOnce({
        findOne: findOneMock,
        exec: execHackathonFindOneMock
      });

      const relatedQueryForMock = jest.fn().mockReturnThis();
      const relatedQueryWhereMock = jest.fn().mockReturnThis();
      const relatedQueryFirstMock = jest.fn().mockReturnThis();
      const execRelatedQueryFirstMock = jest.fn().mockResolvedValueOnce(mockCheckInEvent);
      (Hackathon.relatedQuery as jest.Mock).mockReturnValueOnce({
        for: relatedQueryForMock,
        where: relatedQueryWhereMock,
        first: relatedQueryFirstMock,
        exec: execRelatedQueryFirstMock
      });

      const params: GetAllParams = { active: true };
      const result = await controller.getAll(params);

      expect(Hackathon.query).toHaveBeenCalledTimes(1);
      expect(findOneMock).toHaveBeenCalledWith({ active: true });
      expect(execHackathonFindOneMock).toHaveBeenCalledTimes(1);

      expect(Hackathon.relatedQuery).toHaveBeenCalledWith('events');
      expect(relatedQueryForMock).toHaveBeenCalledWith(mockActiveHackathon);
      expect(relatedQueryWhereMock).toHaveBeenCalledWith('type', 'checkIn');
      expect(relatedQueryFirstMock).toHaveBeenCalledTimes(1);
      expect(execRelatedQueryFirstMock).toHaveBeenCalledTimes(1);

      expect(result).toEqual([{ ...mockActiveHackathon, checkInId: mockCheckInEvent.id }]);
    });

    it('should return active hackathon without checkInId if no check-in event found, when active is true', async () => {
      const mockActiveHackathon = { id: 'active-hack-2', name: 'Active H2', active: true, $parseDatabaseJson: jest.fn(function(json) { return json; }) } as unknown as Hackathon;

      const findOneMock = jest.fn().mockReturnThis();
      const execHackathonFindOneMock = jest.fn().mockResolvedValueOnce(mockActiveHackathon);
      (Hackathon.query as jest.Mock).mockReturnValueOnce({
        findOne: findOneMock,
        exec: execHackathonFindOneMock
      });

      const relatedQueryForMock = jest.fn().mockReturnThis();
      const relatedQueryWhereMock = jest.fn().mockReturnThis();
      const relatedQueryFirstMock = jest.fn().mockReturnThis();
      const execRelatedQueryFirstMock = jest.fn().mockResolvedValueOnce(undefined); // No check-in event
      (Hackathon.relatedQuery as jest.Mock).mockReturnValueOnce({
        for: relatedQueryForMock,
        where: relatedQueryWhereMock,
        first: relatedQueryFirstMock,
        exec: execRelatedQueryFirstMock
      });

      const params: GetAllParams = { active: true };
      const result = await controller.getAll(params);

      expect(Hackathon.query).toHaveBeenCalledTimes(1);
      expect(findOneMock).toHaveBeenCalledWith({ active: true });
      expect(execHackathonFindOneMock).toHaveBeenCalledTimes(1);

      expect(Hackathon.relatedQuery).toHaveBeenCalledWith('events');
      expect(relatedQueryForMock).toHaveBeenCalledWith(mockActiveHackathon);
      expect(relatedQueryWhereMock).toHaveBeenCalledWith('type', 'checkIn');
      expect(relatedQueryFirstMock).toHaveBeenCalledTimes(1);
      expect(execRelatedQueryFirstMock).toHaveBeenCalledTimes(1);

      expect(result).toEqual([{ ...mockActiveHackathon }]);
    });

    it('should return inactive hackathons when active is false', async () => {
      const mockInactiveHackathons = [{ id: '3', name: 'Hackathon 3', active: false }] as HackathonEntity[];

      const mockRawQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValueOnce(mockInactiveHackathons)
      };
      const mockFindAllQueryBuilder = {
        raw: jest.fn().mockReturnValue(mockRawQueryBuilder),
      };
      mockHackathonRepo.findAll.mockReturnValueOnce(mockFindAllQueryBuilder);

      const params: GetAllParams = { active: false };
      const result = await controller.getAll(params);

      expect(mockHackathonRepo.findAll).toHaveBeenCalledTimes(1);
      expect(mockFindAllQueryBuilder.raw).toHaveBeenCalledTimes(1);
      expect(mockRawQueryBuilder.where).toHaveBeenCalledWith('active', false);
      expect(mockRawQueryBuilder.exec).toHaveBeenCalledTimes(1);
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
      const staticPatchMock = jest.fn().mockReturnThis();
      const staticWhereMock = jest.fn().mockReturnThis();
      const staticExecMock = jest.fn().mockResolvedValueOnce(undefined); // patch usually returns number of affected rows or similar, controller doesn't use the result
      (Hackathon.query as jest.Mock).mockReturnValueOnce({
        patch: staticPatchMock,
        where: staticWhereMock,
        exec: staticExecMock,
      });

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
      expect(staticPatchMock).toHaveBeenCalledWith({ active: false });
      expect(staticWhereMock).toHaveBeenCalledWith('active', true);
      expect(staticExecMock).toHaveBeenCalledTimes(1);

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
      const staticPatchMock = jest.fn().mockReturnThis();
      const staticWhereMock = jest.fn().mockReturnThis();
      const staticExecMock = jest.fn().mockResolvedValueOnce(undefined); // patch query result not used by controller
      (Hackathon.query as jest.Mock).mockReturnValueOnce({
        patch: staticPatchMock,
        where: staticWhereMock,
        exec: staticExecMock,
      });

      // Mock for this.hackathonRepo.patchOne(id, { active: true }).exec()
      mockHackathonRepoQueryBuilder.exec.mockResolvedValueOnce(newlyActivatedHackathon);

      const result = await controller.markActive(hackathonIdToMarkActive);

      // Verify deactivation of others
      expect(Hackathon.query).toHaveBeenCalledTimes(1);
      expect(staticPatchMock).toHaveBeenCalledWith({ active: false });
      expect(staticWhereMock).toHaveBeenCalledWith('active', true);
      expect(staticExecMock).toHaveBeenCalledTimes(1);

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
      const findOneMock = jest.fn().mockReturnThis();
      const withGraphFetchedMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValueOnce(mockStaticHackathonData);

      (Hackathon.query as jest.Mock).mockReturnValueOnce({
        findOne: findOneMock,
        withGraphFetched: withGraphFetchedMock,
        exec: execMock,
      });

      const result = await controller.getForStatic();

      expect(Hackathon.query).toHaveBeenCalledTimes(1);
      expect(findOneMock).toHaveBeenCalledWith({ active: true });
      expect(withGraphFetchedMock).toHaveBeenCalledWith('[events.location, sponsors]');
      expect(execMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockStaticHackathonData);
    });

    it('should return undefined if no active hackathon is found for static', async () => {
      // Mock Hackathon.query().findOne().withGraphFetched().exec() to return undefined
      (Hackathon.query as jest.Mock).mockReturnValueOnce({
        findOne: jest.fn().mockReturnThis(),
        withGraphFetched: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValueOnce(undefined),
      });

      const result = await controller.getForStatic();

      expect(Hackathon.query).toHaveBeenCalledTimes(1);
      expect(Hackathon.query().findOne).toHaveBeenCalledWith({ active: true });
      expect(Hackathon.query().withGraphFetched).toHaveBeenCalledWith('[events.location, sponsors]');
      expect(Hackathon.query().exec).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });
  });
});
// Add these imports at the top if not already present
import { HackathonCreateEntity, HackathonPatchEntity, HackathonUpdateEntity } from './hackathon.controller'; // DTO from controller
import { nanoid } from 'nanoid'; // To check if it's called
