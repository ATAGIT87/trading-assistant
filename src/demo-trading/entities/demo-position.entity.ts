import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { Timeframe } from "../../assets/enums/timeframe.enum";

export type DemoPositionSide = "BUY";
export type DemoPositionStatus = "OPEN" | "WIN" | "LOSS";
export type DemoPositionMode = "APPROVED" | "EXPERIMENTAL";

@Entity()
@Index(
  "UQ_demo_position_strategy_signal",
  ["strategyVersion", "symbol", "timeframe", "openedAt"],
  { unique: true },
)
export class DemoPosition {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  symbol!: string;

  @Column({ type: "varchar", nullable: true })
  strategyVersion!: string | null;

  @Column({
    type: "enum",
    enum: ["APPROVED", "EXPERIMENTAL"],
    default: "APPROVED",
  })
  mode!: DemoPositionMode;

  @Column({
    type: "enum",
    enum: Timeframe,
  })
  timeframe!: Timeframe;

  @Column({
    type: "enum",
    // Keep the database enum compatible with existing Demo rows. The
    // application-level Spot policy permits only BUY openings; removing the
    // legacy enum value belongs in an explicit reviewed migration.
    enum: ["BUY", "SELL"],
  })
  side!: DemoPositionSide;

  @Column("decimal", { precision: 20, scale: 8 })
  entry!: number;

  @Column("decimal", { precision: 20, scale: 8, default: 0 }) quantity!: number;
  @Column("decimal", { precision: 20, scale: 8, default: 0 }) investedAmount!: number;
  @Column("decimal", { precision: 20, scale: 8, default: 0 }) entryFee!: number;
  @Column("decimal", { precision: 20, scale: 8, default: 0 }) exitFee!: number;
  /** Quote-currency P/L: EUR for the current Kraken Spot Demo. */
  @Column("decimal", { precision: 20, scale: 8, nullable: true }) realizedPnlQuote!: number | null;

  @Column("decimal", { precision: 20, scale: 8 })
  stopLoss!: number;

  @Column("decimal", { precision: 20, scale: 8 })
  takeProfit!: number;

  @Column("decimal", { precision: 10, scale: 4, nullable: true })
  riskReward!: number | null;

  @Column({
    type: "enum",
    enum: ["OPEN", "WIN", "LOSS"],
    default: "OPEN",
  })
  status!: DemoPositionStatus;

  @Column({ type: "timestamptz" })
  openedAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  closedAt!: Date | null;

  @Column("decimal", { precision: 20, scale: 8, nullable: true })
  exitPrice!: number | null;

  @Column("decimal", { precision: 12, scale: 4, nullable: true })
  resultR!: number | null;

  @Column({ type: "varchar", nullable: true })
  exitReason!: "STOP_LOSS" | "TAKE_PROFIT" | "TIME_EXIT" | null;
}
