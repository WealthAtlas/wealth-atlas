import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ExpenseEntity } from './expense.entity';
import { AggregatedExpenseDTO, ExpenseDTO, ExpenseInput } from './expense.graphql';

@Injectable()
export class ExpenseService {

  constructor(
    @InjectModel(ExpenseEntity.name) private expenseModel: Model<ExpenseEntity>
  ) {
  }

  async createExpense(userId: string, input: ExpenseInput): Promise<ExpenseDTO> {
    const expense = new this.expenseModel({
      userId: userId,
      description: input.description,
      amount: input.amount,
      category: input.category,
      currency: input.currency,
      tags: input.tags,
      date: input.date,
    });

    return expense.save().then((savedExpense) => {
      return {
        id: savedExpense._id,
        description: savedExpense.description,
        amount: savedExpense.amount,
        category: savedExpense.category,
        currency: savedExpense.currency,
        tags: savedExpense.tags,
        date: savedExpense.date,
      };
    });
  }

  async getAggregatedExpenses(
    userId: string,
    filters?: { categories?: string[]; tags?: string[] }
  ): Promise<AggregatedExpenseDTO[]> {
    const { categories, tags } = filters || {};

    const matchStage: any = { userId };

    if (categories && categories.length > 0) {
      matchStage.category = { $in: categories };
    }

    if (tags && tags.length > 0) {
      matchStage.tags = { $in: tags };
    }

    return this.expenseModel
      .aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              month: { $month: "$date" },
              year: { $year: "$date" },
              currency: "$currency",
            },
            currency: { $first: "$currency" },
            totalAmount: { $sum: "$amount" },
          },
        },
      ])
      .exec()
      .then((results) => {
        return results.map((item) => {
          return {
            month: item._id.month,
            year: item._id.year,
            currency: item.currency,
            totalAmount: item.totalAmount,
          };
        });
      });
  }

  async getExpenses(
    userId: string,
    month: string,
    year: string,
    filters?: { categories?: string[]; tags?: string[] }
  ): Promise<ExpenseDTO[]> {
    const { categories, tags } = filters || {};

    const matchStage: any = {
      userId,
      $expr: {
        $and: [
          { $eq: [{ $month: "$date" }, month] },
          { $eq: [{ $year: "$date" }, year] },
        ],
      },
    };

    if (categories && categories.length > 0) {
      matchStage.category = { $in: categories };
    }

    if (tags && tags.length > 0) {
      matchStage.tags = { $in: tags };
    }

    return this.expenseModel
      .find(matchStage)
      .exec()
      .then((expenses) => {
        return expenses.map((expense) => {
          return {
            id: expense._id,
            description: expense.description,
            amount: expense.amount,
            category: expense.category,
            currency: expense.currency,
            tags: expense.tags,
            date: expense.date,
          };
        });
      });
  }

  async deleteExpense(userId: string, expenseId: string): Promise<boolean> {
    const result = await this.expenseModel.deleteOne({ _id: expenseId, userId }).exec();
    return result.deletedCount > 0;
  }
}