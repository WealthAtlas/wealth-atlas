import { Field, Float, InputType, ObjectType } from '@nestjs/graphql';
import { AssetDTO } from '../asset/asset.graphql';

@ObjectType()
export class GoalDTO {
  @Field()
  id!: number;

  @Field()
  name!: string;

  @Field()
  targetAmount!: number;

  @Field(() => Float)
  inflationRate!: number;

  @Field()
  targetDate!: Date;
}

@ObjectType()
export class AllocatedAssetDTO {
  @Field()
  asset!: AssetDTO;

  @Field(() => Float)
  percentage!: number;
}

@InputType()
export class GoalInput {

  @Field()
  name!: string;

  @Field()
  targetAmount!: number;

  @Field(() => Float)
  inflationRate!: number;

  @Field()
  targetDate!: Date;
}