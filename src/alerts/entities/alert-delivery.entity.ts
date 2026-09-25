import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";

import { Timeframe } from "../../assets/enums/timeframe.enum";
import { SignalAction } from "../../signals/signal.types";

@Entity()
@Unique(["symbol", "timeframe", "candleTime", "action"])
export class AlertDelivery {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  symbol!: string;

  @Column({ type: "enum", enum: Timeframe })
  timeframe!: Timeframe;

  @Column({ type: "timestamptz" })
  candleTime!: Date;

  @Column({ type: "varchar" })
  action!: Extract<SignalAction, "BUY" | "SELL">;

  @CreateDateColumn()
  sentAt!: Date;
}
