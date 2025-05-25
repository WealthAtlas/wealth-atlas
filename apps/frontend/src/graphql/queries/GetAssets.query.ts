import { gql } from '@apollo/client';

export const GET_ASSETS_QUERY = gql`
  query GetAssets {
    assets {
      id
      name
      description
      category
      maturityDate
      currency
      riskLevel
      growthRate
      investedAmount
    }
  }
`;
