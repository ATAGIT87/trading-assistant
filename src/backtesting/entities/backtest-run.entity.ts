import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

import { Timeframe } from "../../assets/enums/timeframe.enum";
import type { BacktestResult } from "../interfaces/backtest-result.interface";

@Entity()
export class BacktestRun {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  symbol!: string;

  @Column({ type: "enum", enum: Timeframe })
  timeframe!: Timeframe;

  @Column()
  strategyVersion!: string;

  @Column({ type: "jsonb" })
  result!: BacktestResult;

  @CreateDateColumn()
  createdAt!: Date;
}
