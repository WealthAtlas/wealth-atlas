import { Field, InputType, ObjectType } from "@nestjs/graphql";

@ObjectType()
@InputType()
export class InvestmentDTO {
    @Field()
    amount!: number;

    @Field()
    date!: Date;
}