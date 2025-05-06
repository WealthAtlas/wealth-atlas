import { gql } from '@apollo/client';

export const CREATE_ASSETS_MUTATION = gql`
  mutation CreateAsset($input: CreateAssetInput!) {
    createAsset(input: $input)
  }
`;
