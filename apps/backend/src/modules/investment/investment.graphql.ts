import { Field, InputType, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class InvestmentDTO {
    @Field()
    id!: string;

    @Field({ nullable: true })
    qty?: number;

    @Field({ name: 'value_per_qty' })
    valuePerQty!: number;

    @Field()
    date!: Date;

    @Field(() => Number)
    get amount(): number {
        return (this.qty ?? 0) * (this.valuePerQty ?? 0);
    }

    static fromData(data: Partial<InvestmentDTO>): InvestmentDTO {
        if (data.valuePerQty === undefined) {
            throw new Error('valuePerQty is required');
        }
        if (data.date === undefined) {
            throw new Error('date is required');
        }
        const dto = new InvestmentDTO();
        dto.id = data.id!;
        dto.qty = data.qty;
        dto.valuePerQty = data.valuePerQty;
        dto.date = data.date;
        return dto;
    }
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