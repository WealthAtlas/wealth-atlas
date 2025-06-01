import { gql } from '@apollo/client';

export const DELETE_SIP_QUERY = gql`
  mutation DeleteSIP($sipId: String!) {
    deleteSIP(sipId: $sipId)
  }
`;