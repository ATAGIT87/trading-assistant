import { IsNotEmpty, IsString, IsEnum } from 'class-validator';

export class CreateMarketCandleDto {
  @IsString()
  @IsNotEmpty()
  symbol!: string;
}