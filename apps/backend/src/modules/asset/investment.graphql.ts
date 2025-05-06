import { Field, InputType, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class InvestmentDTO {
    @Field()
    amount!: number;

    @Field()
    date!: Date;
}

@InputType()
export class InvestmentInput {
    @Field()
    amount!: number;

    @Field()
    date!: Date;
}