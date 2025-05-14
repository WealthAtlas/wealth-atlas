import { Field, Float, InputType, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AggregatedExpenseDTO {
  @Field()
  month!: string;

  @Field()
  year!: string;

  @Field()
  currency!: string;

  @Field(() => Float)
  totalAmount!: number;
}

@ObjectType()
export class ExpenseDTO {
  @Field()
  id!: number;

  @Field()
  description!: string;

  @Field()
  amount!: number

  @Field()
  currency!: string

  @Field()
  category!: string;

  @Field(() => [String])
  tags!: string[];

  @Field()
  date!: Date;
}

@InputType()
export class ExpenseInput {
  @Field()
  description!: string;

  @Field()
  amount!: number

  @Field()
  category!: string;

  @Field()
  currency!: string

  @Field(() => [String])
  tags!: string[];

  @Field()
  date!: Date;
}