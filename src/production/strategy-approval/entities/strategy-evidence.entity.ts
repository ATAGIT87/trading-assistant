import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

import { Timeframe } from "../../assets/enums/timeframe.enum";
import type { StrategyEvidenceResult } from "../evidence-result";

@Entity("backtest_run")
export class StrategyEvidence {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  symbol!: string;

  @Column({ type: "enum", enum: Timeframe })
  timeframe!: Timeframe;

  @Column()
  strategyVersion!: string;

  @Column({ type: "jsonb" })
  result!: StrategyEvidenceResult;

  @CreateDateColumn()
  createdAt!: Date;
}
