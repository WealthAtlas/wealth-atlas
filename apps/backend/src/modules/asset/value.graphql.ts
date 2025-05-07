import { Field, Float, InputType, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AssetValueDTO {

  @Field()
  valuePerQty!: number;

  @Field()
  date!: Date;
}

@InputType()
export class AssetValueInput {
  
  @Field()
  valuePerQty!: number;

  @Field()
  date!: Date;
}