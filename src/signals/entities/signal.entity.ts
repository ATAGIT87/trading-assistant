import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { Timeframe } from "../../assets/enums/timeframe.enum";

@Entity()
@Unique(["symbol", "timeframe", "candleTime"])
export class Signal {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  symbol!: string;

  @Column({
    type: "enum",
    enum: Timeframe,
  })
  timeframe!: Timeframe;

  @Column()
  candleTime!: Date;

  @Column()
  action!: string;

  @Column("decimal")
  confidence!: number;

  @Column("decimal")
  entryPrice!: number;

  @Column("decimal", { nullable: true })
  stopLoss!: number | null;

  @Column("decimal", { nullable: true })
  takeProfit!: number | null;

  @Column()
  trend!: string;

  @Column("decimal")
  rsi!: number;

  @Column("decimal")
  adx!: number;

  @Column()
  marketCondition!: string;

  @Column()
  isStrongSetup!: boolean;

  @Column()
  reason!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
