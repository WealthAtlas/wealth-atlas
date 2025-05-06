import { gql } from '@apollo/client';

export const REGISTER_USER_MUTATION = gql`
  mutation RegisterUser($input: UserRegisterInput!) {
        registerUser(input: $input)
    }
`;
