import { gql } from '@apollo/client';

export const CREATE_EXPENSE = gql`
  mutation CreateExpense($input: ExpenseInput!) {
    createExpense(input: $input) {
      id
      description
      amount
      currency
      category
      tags
      date
    }
  }
`;
