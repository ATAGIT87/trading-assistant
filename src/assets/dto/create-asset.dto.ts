import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
} from "class-validator";
import { AssetType } from "../enums/asset-type.enum";
import { Timeframe } from "../enums/timeframe.enum";

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  symbol!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(AssetType)
  type!: AssetType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(Timeframe)
  timeframe?: Timeframe;
}
