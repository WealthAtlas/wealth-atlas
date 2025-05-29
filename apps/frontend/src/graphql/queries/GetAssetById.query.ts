import { gql } from '@apollo/client';

export const GET_ASSET_BY_ID_QUERY = gql`
  query GetAssetById($id: String!) {
    asset(id: $id) {
      id
      name
      description
      category
      maturityDate
      currency
      riskLevel
      valueStrategy {
        __typename
        ... on FixedValueStrategy {
          type
          growthRate
        }
        ... on DynamicValueStrategy {
          type
          scriptCode
          dynamicUpdatedAt: updatedAt
        }
        ... on ManualValueStrategy {
          type
          value
          manualUpdatedAt: updatedAt
        }
      }
      currentValue
    }
  }
`;
