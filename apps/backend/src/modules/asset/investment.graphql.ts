import { Field, InputType, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class InvestmentDTO {
    @Field({ nullable: true })
    qty?: number;

    @Field({ name: 'value_per_qty' })
    valuePerQty!: number;

    @Field()
    date!: Date;
}

@InputType()
export class InvestmentInput {
    @Field({ nullable: true })
    qty?: number;

    @Field({ name: 'value_per_qty' })
    valuePerQty!: number;

    @Field()
    date!: Date;
}