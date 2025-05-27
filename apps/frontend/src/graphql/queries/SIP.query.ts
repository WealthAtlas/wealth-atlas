import { gql } from '@apollo/client';

export const GET_SIPS_BY_ASSET = gql`
  query GetSIPsByAsset($assetId: String!) {
    sipsByAsset(assetId: $assetId) {
      id
      name
      amount
      frequency
      startDate
      endDate
      lastExecutedDate
      active
      description
      asset {
        id
        name
        category
        riskLevel
      }
    }
  }
`;

export const GET_ALL_SIPS = gql`
  query GetAllSIPs {
    allSIPs {
      id
      name
      amount
      frequency
      startDate
      endDate
      lastExecutedDate
      active
      description
      asset {
        id
        name
        category
        riskLevel
      }
    }
  }
`;

export const CREATE_SIP = gql`
  mutation CreateSIP($assetId: String!, $input: SIPInput!) {
    createSIP(assetId: $assetId, input: $input) {
      id
      name
      amount
      frequency
      startDate
      endDate
      active
      description
    }
  }
`;

export const UPDATE_SIP = gql`
  mutation UpdateSIP($sipId: String!, $input: UpdateSIPInput!) {
    updateSIP(sipId: $sipId, input: $input) {
      id
      name
      amount
      frequency
      startDate
      endDate
      active
      description
    }
  }
`;

export const DELETE_SIP = gql`
  mutation DeleteSIP($sipId: String!) {
    deleteSIP(sipId: $sipId)
  }
`;

export const TOGGLE_SIP_ACTIVE = gql`
  mutation ToggleSIPActive($sipId: String!, $active: Boolean!) {
    toggleSIPActive(sipId: $sipId, active: $active) {
      id
      active
    }
  }
`;

export const EXECUTE_SIP = gql`
  mutation ExecuteSIP($sipId: String!) {
    executeSIP(sipId: $sipId)
  }
`;
