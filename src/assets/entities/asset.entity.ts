import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { AssetType } from "../enums/asset-type.enum";
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
}
