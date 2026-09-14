import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { AssetType } from "../enums/asset-type.enum";
import { Timeframe } from "../enums/timeframe.enum";

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  symbol?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEnum(AssetType)
  type?: AssetType;

  @IsOptional()
@IsEnum(Timeframe)
timeframe?: Timeframe;
}
