import { Test, TestingModule } from "@nestjs/testing";
import { MarketDataService } from "./market-data.service";
import { MarketCandleStorageService } from "./market-candle-storage.service";
import { MarketDataAnalysisService } from "./market-data-analysis.service";
import { MarketDataProviderService } from "./market-data-provider.service";

describe("MarketDataService", () => {
  let service: MarketDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketDataService,
        {
          provide: MarketCandleStorageService,
          useValue: {},
        },
        {
          provide: MarketDataAnalysisService,
          useValue: {},
        },
        {
          provide: MarketDataProviderService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<MarketDataService>(MarketDataService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
