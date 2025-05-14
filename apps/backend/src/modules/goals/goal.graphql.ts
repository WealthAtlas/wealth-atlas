import { Field, Float, InputType, ObjectType } from '@nestjs/graphql';

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