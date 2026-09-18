import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AssetsService } from "./assets.service";
import { Asset } from "./entities/asset.entity";

describe("AssetsService", () => {
  let service: AssetsService;

  const assetRepositoryMock = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    preload: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        {
          provide: getRepositoryToken(Asset),
          useValue: assetRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});