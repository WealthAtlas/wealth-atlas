import { IAutoPay } from '../../../domain/entities/expenses/AutoPay';
import { database } from '../../database';

export class AutoPayRepository {
  public async create(scheduledExpense: IAutoPay): Promise<IAutoPay> {
    const id = await database.autoPays.add(scheduledExpense);
    return { ...scheduledExpense, id };
  }

  public async getById(id: number): Promise<IAutoPay> {
    return (await database.autoPays.get(id))!;
  }

  public async getAll(): Promise<IAutoPay[]> {
    return await database.autoPays.toArray();
  }

  public async update(scheduledExpense: IAutoPay): Promise<IAutoPay> {
    await database.autoPays.update(scheduledExpense.id, scheduledExpense);
    return scheduledExpense;
  }

  public async delete(id: number): Promise<void> {
    return await database.autoPays.delete(id);
  }
}
