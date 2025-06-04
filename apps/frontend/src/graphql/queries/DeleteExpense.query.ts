import { gql } from '@apollo/client';

export const DELETE_EXPENSE = gql`
  mutation DeleteExpense($expenseId: String!) {
    deleteExpense(expenseId: $expenseId)
  }
`;
