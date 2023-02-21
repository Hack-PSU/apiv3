import { Test } from "@nestjs/testing";
import { LocationController } from "modules/location/location.controller";
import { ObjectionTestingModule } from "test/objection";
import { Location } from "entities/location.entity";
import { SocketModule } from "modules/socket/socket.module";
import * as mock from "mock-knex";

describe("LocationController", () => {
  let locationController: LocationController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ObjectionTestingModule.forFeature([Location]), SocketModule],
      controllers: [LocationController],
    }).compile();

    locationController = moduleRef.get<LocationController>(LocationController);
  });

  it("should mock location query", async () => {
    const tracker = mock.getTracker();
    tracker.install();

    tracker.on("query", (query) => {
      query.response([
        {
          id: 1,
          name: "New Location",
        },
      ]);
    });

    console.log(await locationController.getAll());

    tracker.uninstall();
  });
});
