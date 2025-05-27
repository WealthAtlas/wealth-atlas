import { Field, InputType, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class InvestmentDTO {
    @Field()
    id!: string;

    @Field({ nullable: true })
    qty?: number;

    @Field()
    valuePerQty!: number;

    @Field()
    date!: Date;

    @Field(() => Number)
    get amount(): number {
        return (this.qty ?? 0) * (this.valuePerQty ?? 0);
    }

    static fromData(document: any): InvestmentDTO {
        if (document.valuePerQty === undefined) {
            throw new Error('valuePerQty is required');
        }
        if (document.date === undefined) {
            throw new Error('date is required');
        }
        const dto = new InvestmentDTO();
        dto.id = document._id!;
        dto.qty = document.qty;
        dto.valuePerQty = document.valuePerQty;
        dto.date = document.date;
        return dto;
    }
}

@InputType()
export class InvestmentInput {
    @Field({ nullable: true })
    qty?: number;

    @Field()
    valuePerQty!: number;

    @Field()
    date!: Date;
}