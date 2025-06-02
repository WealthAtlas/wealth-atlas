import { gql } from '@apollo/client';

export const GET_AGGREGATED_EXPENSES = gql`
  query GetAggregatedExpenses($categories: [String!], $tags: [String!]) {
    aggregatedExpenses(categories: $categories, tags: $tags) {
      month
      year
      currency
      totalAmount
    }
  }
`;

export const GET_MONTHLY_EXPENSES = gql`
  query GetMonthlyExpenses($month: String!, $year: String!, $categories: [String!], $tags: [String!]) {
    monthlyExpenses(month: $month, year: $year, categories: $categories, tags: $tags) {
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
