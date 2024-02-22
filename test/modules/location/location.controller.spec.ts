import { Test } from "@nestjs/testing";
import { LocationController } from "../../../src/modules/location/location.controller";
import { Location } from "../../../src/entities/location.entity";
import { SocketGateway } from "../../../src/modules/socket/socket.gateway";
import { ObjectionBaseEntityProvider } from "../../../src/common/objection/objection.constants";

// Mock for the repository, with exec method mocked for all relevant repository methods
const mockLocationRepository = {
  findAll: jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue([{ id: 1, name: "Test Location" }]),
  }),
  findOne: jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue({ id: 1, name: "Specific Location" }),
  }),
  replaceOne: jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue({ id: 1, name: "Updated Location" }),
  }),
  patchOne: jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue({ id: 1, name: "Patched Location" }),
  }),
  createOne: jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue({ id: 1, name: "New Location" }),
  }),
  deleteOne: jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue({}), // adjust based on actual delete behavior
  }),
};

// Mock for the SocketGateway, assuming it's used in your controller
const mockSocketGateway = {
  emit: jest.fn(),
};

describe("LocationController", () => {
  let controller: LocationController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [LocationController],
      providers: [
        {
          // I didn't know how the inject repository works so  just used the underlying implementation to mock it
          provide: `${ObjectionBaseEntityProvider}${Location.name}`,
          useValue: mockLocationRepository,
        },
        {
          provide: SocketGateway,
          useValue: mockSocketGateway,
        },
      ],
    }).compile();

    controller = moduleRef.get<LocationController>(LocationController);
  });

  it("should return all locations", async () => {
    const expectedResult = [{ id: 1, name: "Test Location" }];
    mockLocationRepository.findAll().exec.mockResolvedValue(expectedResult);

    const result = await controller.getAll();

    expect(result).toEqual(expectedResult);
    expect(mockLocationRepository.findAll).toHaveBeenCalled();
    expect(mockLocationRepository.findAll().exec).toHaveBeenCalled();
  });

  it("should create and return a location", async () => {
    const newLocation = { name: "New Location" };
    const createdLocation = { id: 1, ...newLocation };
    mockLocationRepository.createOne().exec.mockResolvedValue(createdLocation);

    const result = await controller.createOne(newLocation);

    expect(result).toEqual(createdLocation);
    expect(mockLocationRepository.createOne).toHaveBeenCalledWith(newLocation);
    expect(mockLocationRepository.createOne().exec).toHaveBeenCalled();
  });

  it("should return a single location by ID", async () => {
    const locationId = 1;
    const location = { id: locationId, name: "Specific Location" };
    mockLocationRepository.findOne().exec.mockResolvedValue(location);

    const result = await controller.getOne(locationId);

    expect(result).toEqual(location);
    expect(mockLocationRepository.findOne).toHaveBeenCalledWith(locationId);
    expect(mockLocationRepository.findOne().exec).toHaveBeenCalled();
  });

  it("should patch and return the location", async () => {
    const locationId = 1;
    const patchData = { name: "Updated Location" };
    const updatedLocation = { id: locationId, ...patchData };
    mockLocationRepository.patchOne().exec.mockResolvedValue(updatedLocation);

    const result = await controller.patchOne(locationId, patchData);

    expect(result).toEqual(updatedLocation);
    expect(mockLocationRepository.patchOne).toHaveBeenCalledWith(
      locationId,
      patchData,
    );
    expect(mockLocationRepository.patchOne().exec).toHaveBeenCalled();
  });

  it("should replace and return the location", async () => {
    const locationId = 1;
    const newData = { name: "Replaced Location" };
    const replacedLocation = { id: locationId, ...newData };
    mockLocationRepository
      .replaceOne()
      .exec.mockResolvedValue(replacedLocation);

    const result = await controller.replaceOne(locationId, newData);

    expect(result).toEqual(replacedLocation);
    expect(mockLocationRepository.replaceOne).toHaveBeenCalledWith(
      locationId,
      newData,
    );
    expect(mockLocationRepository.replaceOne().exec).toHaveBeenCalled();
  });

  it("should delete the location", async () => {
    const locationId = 1;
    mockLocationRepository.deleteOne().exec.mockResolvedValue({});

    await controller.deleteOne(locationId);

    expect(mockLocationRepository.deleteOne).toHaveBeenCalledWith(locationId);
    expect(mockLocationRepository.deleteOne().exec).toHaveBeenCalled();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
