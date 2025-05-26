import { Field, Float, InputType, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AssetDTO {
  @Field()
  id!: string;

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

  static fromData(document: any): AssetDTO {
    if (document.name === undefined) {
      throw new Error('name is required');
    }
    if (document.description === undefined) {
      throw new Error('description is required');
    }
    if (document.category === undefined) {
      throw new Error('category is required');
    }
    if (document.currency === undefined) {
      throw new Error('currency is required');
    }
    if (document.riskLevel === undefined) {
      throw new Error('riskLevel is required');
    }
    const dto = new AssetDTO();
    dto.id = document._id;
    dto.name = document.name;
    dto.description = document.description;
    dto.category = document.category;
    dto.maturityDate = document.maturityDate;
    dto.currency = document.currency;
    dto.riskLevel = document.riskLevel;
    return dto;
  }
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