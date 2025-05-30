import { gql } from '@apollo/client';

export const UPDATE_ASSET_QUERY = gql`
  mutation UpdateAsset($id: String!, $input: AssetInput!) {
    updateAsset(id: $id, input: $input) {
      id
      name
      description
      category
      maturityDate
      currency
      riskLevel
      valueStrategy {
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
