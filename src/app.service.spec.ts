import { AppService } from "./app.service";

describe("AppService", () => {
  let appService: AppService;

  beforeEach(() => {
    appService = new AppService();
  });

  it('should return "Hello World!"', () => {
    expect(appService.getHello()).toBe("Hello World!");
  });
});
