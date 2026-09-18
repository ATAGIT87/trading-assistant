import { Test, TestingModule } from "@nestjs/testing";
import { MarketDataController } from "./market-data.controller";
import { MarketDataService } from "./market-data.service";
import { MarketDataProviderService } from "./market-data-provider.service";

describe("MarketDataController", () => {
  let controller: MarketDataController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketDataController],
      providers: [
        {
          provide: MarketDataService,
          useValue: {},
        },
        {
          provide: MarketDataProviderService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<MarketDataController>(MarketDataController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});