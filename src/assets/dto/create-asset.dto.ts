import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { AssetType } from "../enums/asset-type.enum";

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  symbol!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(AssetType)
  type!: AssetType;
}
