import { Money } from '@wealth-atlas/shared';

export class Investment {
    quantity?: number;
    pricePerQty: Money;
    date: Date;

    constructor(
        quantity: number | undefined,
        pricePerQty: Money,
        date: Date
    ) {
        this.quantity = quantity;
        this.pricePerQty = pricePerQty;
        this.date = date;
    }
}