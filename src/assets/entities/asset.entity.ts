import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { AssetType } from "../enums/asset-type.enum";
import { Timeframe } from "../enums/timeframe.enum";
@Entity()
export class Asset {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  symbol!: string;

  @Column()
  name!: string;

  @Column({
    type: "enum",
    enum: AssetType,
  })
  type!: AssetType;

  @Column({ default: true })
  isActive!: boolean;

  @Column({
  type: 'enum',
  enum: Timeframe,
  default: Timeframe.ONE_HOUR,
})
timeframe!: Timeframe;
}
