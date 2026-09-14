import { AssetsService } from "./assets.service";
import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Patch,
  Delete,
} from "@nestjs/common";
import { CreateAssetDto } from "./dto/create-asset.dto";
import { UpdateAssetDto } from "./dto/update-asset.dto";

@Controller("assets")
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  findAll() {
    return this.assetsService.findAll();
  }

  @Get('active')
  findActive() {
  return this.assetsService.findActive();
}
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.assetsService.findOne(Number(id));
  }

  @Post()
  create(@Body() dto: CreateAssetDto) {
    return this.assetsService.create(dto.symbol, dto.name, dto.type, dto.isActive);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateAssetDto) {
    return this.assetsService.update(Number(id), dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.assetsService.remove(Number(id));
  }
}
