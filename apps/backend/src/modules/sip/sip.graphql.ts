import { Field, Float, InputType, ObjectType, registerEnumType } from "@nestjs/graphql";

export enum FrequencyType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly'
}

registerEnumType(FrequencyType, {
  name: 'FrequencyType',
  description: 'The frequency of SIP investment',
});

@ObjectType()
export class SIPDTO {
  @Field()
  id!: string;
  
  @Field()
  assetId!: string;

  @Field()
  name!: string;

  @Field(() => Float)
  amount!: number;

  @Field(() => FrequencyType)
  frequency!: FrequencyType;

  @Field()
  startDate!: Date;

  @Field({ nullable: true })
  endDate?: Date;

  @Field({ nullable: true })
  lastExecutedDate?: Date;

  @Field({ nullable: true })
  description?: string;

  static fromData(document: any): SIPDTO {
    if (!document) {
      throw new Error('Document is required');
    }
    if (document.assetId === undefined) {
      throw new Error('assetId is required');
    }
    if (document.name === undefined) {
      throw new Error('name is required');
    }
    if (document.amount === undefined) {
      throw new Error('amount is required');
    }
    if (document.frequency === undefined) {
      throw new Error('frequency is required');
    }
    if (document.startDate === undefined) {
      throw new Error('startDate is required');
    }

    const dto = new SIPDTO();
    dto.id = document._id;
    dto.assetId = document.assetId;
    dto.name = document.name;
    dto.amount = document.amount;
    dto.frequency = document.frequency;
    dto.startDate = document.startDate;
    dto.endDate = document.endDate;
    dto.lastExecutedDate = document.lastExecutedDate;
    dto.description = document.description;
    return dto;
  }
}

@InputType()
export class SIPInput {
  @Field()
  name!: string;

  @Field(() => Float)
  amount!: number;

  @Field(() => FrequencyType)
  frequency!: FrequencyType;

  @Field()
  startDate!: Date;

  @Field({ nullable: true })
  endDate?: Date;

  @Field({ nullable: true })
  description?: string;
}