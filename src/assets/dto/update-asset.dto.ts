import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { AssetType } from "../enums/asset-type.enum";

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
}
