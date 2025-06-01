import { gql } from '@apollo/client';

export const GET_ASSET_SIPS = gql`
  query GetAssetSIPs($assetId: String!) {
    assetSIPs(assetId: $assetId) {
      id
      assetId
      name
      amount
      frequency
      startDate
      endDate
      lastExecutedDate
      description
    }
  }
`;
