import { gql } from '@apollo/client';

export const ADD_INVESTMENT_MUTATION = gql`
  mutation AddInvestment($assetId: String!, $input: InvestmentInput!) {
    addInvestment(assetId: $assetId, input: $input) {
      id
      date
      amount
    }
  }
`;
