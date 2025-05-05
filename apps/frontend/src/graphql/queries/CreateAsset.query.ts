import { gql } from '@apollo/client';

export const CREATE_ASSET_MUTATION = gql`
  mutation CreateAsset($email: String!, $password: String!) {
    loginUser(email: $email, password: $password)
  }
`;
