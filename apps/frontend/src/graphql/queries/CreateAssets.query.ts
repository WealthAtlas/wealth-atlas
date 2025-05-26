import {gql} from '@apollo/client';

export const CREATE_ASSETS_MUTATION = gql`
    mutation CreateAsset($input: AssetInput!) {
        createAsset(input: $input) {
            id
            name
            description
            category
            maturityDate
            currency
            riskLevel
        }
    }
`;
