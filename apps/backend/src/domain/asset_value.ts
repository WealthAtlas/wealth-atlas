export class AssetValue {
    id: string;
    pricePerQty: number;
    date: Date;

    constructor(id: string, pricePerQty: number, date: Date) {
        this.id = id;
        this.pricePerQty = pricePerQty;
        this.date = date;
    }
}