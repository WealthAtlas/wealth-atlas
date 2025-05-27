import { gql } from '@apollo/client';

export const GET_ASSET_INVESTMENTS = gql`
  query GetAssetInvestments($assetId: String!) {
    asset(id: $assetId) {
        investments {
            id
            qty
            valuePerQty
            date
        }
    }
  }
`;
