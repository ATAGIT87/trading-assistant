import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { Timeframe } from "../../assets/enums/timeframe.enum";

@Entity()
export class MarketCandle {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  symbol!: string;

  @Column({
    type: "enum",
    enum: Timeframe,
  })
  timeframe!: Timeframe;

  @Column({ type: "timestamptz" })
  time!: Date;

  @Column({ type: "decimal", precision: 20, scale: 8 })
  open!: string;

  @Column({ type: "decimal", precision: 20, scale: 8 })
  high!: string;

  @Column({ type: "decimal", precision: 20, scale: 8 })
  low!: string;

  @Column({ type: "decimal", precision: 20, scale: 8 })
  close!: string;

  @Column({ type: "decimal", precision: 30, scale: 8 })
  volume!: string;
}
