import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsDateString,
  IsNumber,
} from "class-validator";
import { Timeframe } from "../../assets/enums/timeframe.enum";

export class CreateMarketCandleDto {
  @IsString()
  @IsNotEmpty()
  symbol!: string;

  @IsEnum(Timeframe)
  timeframe!: Timeframe;

  @IsDateString()
  time!: string;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  open!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  high!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  low!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  close!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  volume!: number;
}
