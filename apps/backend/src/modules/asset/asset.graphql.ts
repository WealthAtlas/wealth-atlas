import { Field, Float, InputType, ObjectType, createUnionType } from '@nestjs/graphql';

@ObjectType('FixedValueStrategy')
export class FixedValueStrategyDTO {
  @Field()
  type!: string;

  @Field(() => Float)
  growthRate!: number;
}

@ObjectType('DynamicValueStrategy')
export class DynamicValueStrategyDTO {
  @Field()
  type!: string;

  @Field()
  scriptCode!: string;

  @Field(() => Float, { nullable: true })
  value?: number;

  @Field({ nullable: true })
  updatedAt?: Date;
}

@ObjectType('ManualValueStrategy')
export class ManualValueStrategyDTO {
  @Field()
  type!: string;

  @Field(() => Float)
  value!: number;

  @Field()
  updatedAt!: Date;
}

export const ValueStrategyUnion = createUnionType({
  name: 'ValueStrategy',
  types: () => [FixedValueStrategyDTO, DynamicValueStrategyDTO, ManualValueStrategyDTO],
  resolveType(value) {
    if (value.type === 'fixed') {
      return FixedValueStrategyDTO;
    }
    if (value.type === 'dynamic') {
      return DynamicValueStrategyDTO;
    }
    if (value.type === 'manual') {
      return ManualValueStrategyDTO;
    }
    return null;
  },
});

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

  @Field(() => ValueStrategyUnion)
  valueStrategy!: typeof ValueStrategyUnion;

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
    if (document.valueStrategy === undefined) {
      throw new Error('valueStrategy is required');
    }
    const dto = new AssetDTO();
    dto.id = document._id;
    dto.name = document.name;
    dto.description = document.description;
    dto.category = document.category;
    dto.maturityDate = document.maturityDate;
    dto.currency = document.currency;
    dto.riskLevel = document.riskLevel;
    dto.valueStrategy = document.valueStrategy;
    return dto;
  }
}

@InputType('FixedValueStrategyInput')
export class FixedValueStrategyInput {
  @Field()
  type!: string;

  @Field(() => Float)
  growthRate!: number;
}

@InputType('DynamicValueStrategyInput')
export class DynamicValueStrategyInput {
  @Field()
  type!: string;

  @Field()
  scriptCode!: string;

  @Field(() => Float, { nullable: true })
  value?: number;
}

@InputType('ManualValueStrategyInput')
export class ManualValueStrategyInput {
  @Field()
  type!: string;

  @Field(() => Float)
  value!: number;
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
  
  @Field(() => FixedValueStrategyInput, { nullable: true })
  fixedValueStrategy?: FixedValueStrategyInput;

  @Field(() => DynamicValueStrategyInput, { nullable: true })
  dynamicValueStrategy?: DynamicValueStrategyInput;

  @Field(() => ManualValueStrategyInput, { nullable: true })
  manualValueStrategy?: ManualValueStrategyInput;
}