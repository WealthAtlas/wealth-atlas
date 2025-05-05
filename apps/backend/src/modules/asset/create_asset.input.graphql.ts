import { InputType, Field } from "@nestjs/graphql";

@InputType()
export class CreateAssetInput {
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

    @Field({ nullable: true })
    growthRate?: number;
}