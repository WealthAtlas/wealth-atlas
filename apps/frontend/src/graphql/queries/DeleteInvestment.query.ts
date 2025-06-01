import { gql } from '@apollo/client';


export const DELETE_INVESTMENT_QUERY = gql`
  mutation DeleteInvestment($investmentId: String!) {
    deleteInvestment(investmentId: $investmentId)
  }
`;
