import { gql } from '@apollo/client';


export const UPDATE_INVESTMENT_QUERY = gql`
  mutation UpdateInvestment($investmentId: String!, $input: InvestmentInput!) {
    updateInvestment(investmentId: $investmentId, input: $input) {
        id
        date
        amount
    }
  }
`;