import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { Timeframe } from "../../assets/enums/timeframe.enum";

export type DemoPositionSide = "BUY" | "SELL";
export type DemoPositionStatus = "OPEN" | "WIN" | "LOSS";

@Entity()
export class DemoPosition {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  symbol!: string;

  @Column({
    type: "enum",
    enum: Timeframe,
  })
  timeframe!: Timeframe;

  @Column({
    type: "enum",
    enum: ["BUY", "SELL"],
  })
  side!: DemoPositionSide;

  @Column("decimal", { precision: 20, scale: 8 })
  entry!: number;

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
}
