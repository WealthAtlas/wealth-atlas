import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client';
import { SIPInput, SIPDTO } from '@/graphql/models/generated';

export interface CreateSIPMutationVariables {
  assetId: string;
  input: SIPInput;
}

export interface CreateSIPMutationResult {
  createSIP: SIPDTO;
}

export const CREATE_SIP = gql`
  mutation CreateSIP($assetId: String!, $input: SIPInput!) {
    createSIP(assetId: $assetId, input: $input) {
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

export function useCreateSIPMutation() {
  return useMutation<CreateSIPMutationResult, CreateSIPMutationVariables>(CREATE_SIP);
}
