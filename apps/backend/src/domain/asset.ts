import { Money } from "@wealth-atlas/shared";
import { AssetValue } from "./asset_value";
import { Investment } from "./investment";


export class Asset {
    id: number;
    name: string;
    description: string;
    category: string;
    investments: Investment[];
    values: AssetValue[];
    maturityDate?: Date;
    currency: string;
    riskLevel: string;
    growthRate?: number;

    constructor(
        id: number,
        name: string,
        description: string,
        category: string,
        investments: Investment[],
        values: AssetValue[],
        maturityDate: Date | undefined,
        currency: string,
        riskLevel: string,
        growthRate: number | undefined
    ) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.category = category;
        this.investments = investments;
        this.values = values;
        this.maturityDate = maturityDate;
        this.currency = currency;
        this.riskLevel = riskLevel;
        this.growthRate = growthRate;
    }

    currentValue(): Money {
        return this.valueAt(new Date());
    }

    valueAt(date: Date): Money {
        if (this.investments.length === 0) {
            console.info("No investments found");
            return new Money(0.0, this.currency);
        }

        let dateToBeConsidered = date;
        if (this.maturityDate && date > this.maturityDate) {
            dateToBeConsidered = this.maturityDate;
        }

        // Calculate total investment
        const totalInvestment = this.investments.reduce((sum, investment) => {
            return sum + investment.pricePerQty.amount * (investment.quantity ?? 0.0);
        }, 0);

        // Calculate the time period in years from now to the given date
        const currentDate = new Date();
        const years = (dateToBeConsidered.getTime() - currentDate.getTime()) / (365 * 24 * 60 * 60 * 1000);

        // Calculate future value using the growth rate
        const futureValue = totalInvestment * Math.pow(1 + this.getGrowthRate(), years);

        return new Money(futureValue, this.currency);
    }

    getGrowthRate(): number {
        if (this.growthRate !== undefined) {
            return this.growthRate;
        }

        if (this.investments.length === 0 || this.values.length === 0) {
            console.info("Insufficient data to calculate growth rate");
            return 0.0;
        }

        // Calculate the weighted average of the invested amounts
        const totalWeightedInvestment = this.investments.reduce((sum, investment) => {
            const investmentValue = investment.pricePerQty.amount * (investment.quantity ?? 0.0);
            const daysSinceInvestment = investment.date.getTime();
            return sum + investmentValue * daysSinceInvestment;
        }, 0);

        const totalInvestment = this.investments.reduce((sum, investment) => {
            return sum + investment.pricePerQty.amount * (investment.quantity ?? 0.0);
        }, 0);

        const weightedAverageDate = totalWeightedInvestment / totalInvestment;

        // Convert weighted average date to Date
        const weightedDate = new Date(weightedAverageDate);

        // Get the latest value
        const latestValue = this.values.reduce((max, value) => {
            return max && max.date > value.date ? max : value;
        }, this.values[0]);

        if (!latestValue) {
            console.info("No latest value found");
            return 0.0;
        }

        const totalQuantity = this.investments.reduce((sum, investment) => {
            return sum + (investment.quantity ?? 0.0);
        }, 0);

        const finalValue = latestValue.pricePerQty * totalQuantity;

        // Calculate the time period in years
        const years = (latestValue.date.getTime() - weightedDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
        if (years <= 0) {
            console.info("Invalid time period for growth rate calculation");
            return 0.0;
        }

        // Apply the CAGR formula
        return Math.pow(finalValue / totalInvestment, 1 / years) - 1;
    }
}