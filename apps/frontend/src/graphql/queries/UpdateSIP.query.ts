import { gql } from '@apollo/client';

export const UPDATE_SIP_QUERY = gql`
  mutation UpdateSIP($sipId: String!, $input: SIPInput!) {
    updateSIP(sipId: $sipId, input: $input) {
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