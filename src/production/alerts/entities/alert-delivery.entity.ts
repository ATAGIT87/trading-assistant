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
  // Existing varchar column also stores durable Demo pending/sent event keys.
  action!:
    | "CCXT_SIGNAL_COMMITTED"
    | Extract<SignalAction, "BUY" | "SELL">
    | `DEMO_${"OPEN" | "CLOSE"}_${"PENDING" | "SENT"}:${number}`;

  @Column({ type: "jsonb", nullable: true })
  payload!: { reason: string; currentPrice?: number } | null;

  @CreateDateColumn()
  sentAt!: Date;
}
