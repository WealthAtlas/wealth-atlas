import { Field, Float, InputType, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AssetDTO {
  @Field()
  id!: number;

  @Field()
  name!: string;

  @Field()
  description!: string;

  @Field()
  category!: string;

  @Field({ nullable: true })
  maturityDate?: Date;

  @Field()
  currency!: string;

  @Field()
  riskLevel!: string;

  @Field(() => Float, { nullable: true })
  growthRate?: number;
}

@InputType()
export class AssetInput {
  @Field()
  name!: string;

  @Field()
  description!: string;

  @Field()
  category!: string;

  @Field({ nullable: true })
  maturityDate?: Date;

  @Field()
  currency!: string;

  @Field()
  riskLevel!: string;

  @Field(() => Float, { nullable: true })
  growthRate?: number;
}