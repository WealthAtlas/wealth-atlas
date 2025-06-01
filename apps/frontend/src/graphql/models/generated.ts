import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  DateTime: any;
};

export type AllocatedAssetDTO = {
  readonly __typename: 'AllocatedAssetDTO';
  readonly asset: AssetDTO;
  readonly percentage: Scalars['Float'];
};

export type AssetDTO = {
  readonly __typename: 'AssetDTO';
  readonly category: Scalars['String'];
  readonly currency: Scalars['String'];
  readonly currentValue: Scalars['Float'];
  readonly description: Scalars['String'];
  readonly growthRate: Scalars['Float'];
  readonly id: Scalars['String'];
  readonly investedAmount: Scalars['Float'];
  readonly investments: ReadonlyArray<InvestmentDTO>;
  readonly maturityDate: Maybe<Scalars['DateTime']>;
  readonly name: Scalars['String'];
  readonly qty: Scalars['Float'];
  readonly riskLevel: Scalars['String'];
  readonly valueStrategy: ValueStrategy;
};

export type AssetInput = {
  readonly category: Scalars['String'];
  readonly currency: Scalars['String'];
  readonly description: Scalars['String'];
  readonly dynamicValueStrategy: InputMaybe<DynamicValueStrategyInput>;
  readonly fixedValueStrategy: InputMaybe<FixedValueStrategyInput>;
  readonly manualValueStrategy: InputMaybe<ManualValueStrategyInput>;
  readonly maturityDate: InputMaybe<Scalars['DateTime']>;
  readonly name: Scalars['String'];
  readonly riskLevel: Scalars['String'];
};

export type DynamicValueStrategy = {
  readonly __typename: 'DynamicValueStrategy';
  readonly scriptCode: Scalars['String'];
  readonly type: Scalars['String'];
  readonly updatedAt: Maybe<Scalars['DateTime']>;
  readonly value: Maybe<Scalars['Float']>;
};

export type DynamicValueStrategyInput = {
  readonly scriptCode: Scalars['String'];
  readonly type: Scalars['String'];
  readonly value: InputMaybe<Scalars['Float']>;
};

export type ExpenseInput = {
  readonly amount: Scalars['Float'];
  readonly category: Scalars['String'];
  readonly currency: Scalars['String'];
  readonly date: Scalars['DateTime'];
  readonly description: Scalars['String'];
  readonly tags: ReadonlyArray<Scalars['String']>;
};

export type FixedValueStrategy = {
  readonly __typename: 'FixedValueStrategy';
  readonly growthRate: Scalars['Float'];
  readonly type: Scalars['String'];
};

export type FixedValueStrategyInput = {
  readonly growthRate: Scalars['Float'];
  readonly type: Scalars['String'];
};

/** The frequency of SIP investment */
export enum FrequencyType {
  DAILY = 'DAILY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  WEEKLY = 'WEEKLY',
  YEARLY = 'YEARLY'
}

export type GoalDTO = {
  readonly __typename: 'GoalDTO';
  readonly allocateAsset: AllocatedAssetDTO;
  readonly allocatedAssets: ReadonlyArray<AllocatedAssetDTO>;
  readonly id: Scalars['Float'];
  readonly inflationRate: Scalars['Float'];
  readonly name: Scalars['String'];
  readonly removeAsset: Scalars['Boolean'];
  readonly targetAmount: Scalars['Float'];
  readonly targetDate: Scalars['DateTime'];
};


export type GoalDTOallocateAssetArgs = {
  assetId: Scalars['String'];
  percentage: Scalars['Float'];
};


export type GoalDTOremoveAssetArgs = {
  assetId: Scalars['String'];
};

export type GoalInput = {
  readonly inflationRate: Scalars['Float'];
  readonly name: Scalars['String'];
  readonly targetAmount: Scalars['Float'];
  readonly targetDate: Scalars['DateTime'];
};

export type InvestmentDTO = {
  readonly __typename: 'InvestmentDTO';
  readonly amount: Scalars['Float'];
  readonly date: Scalars['DateTime'];
  readonly id: Scalars['String'];
  readonly qty: Maybe<Scalars['Float']>;
  readonly valuePerQty: Scalars['Float'];
};

export type InvestmentInput = {
  readonly date: Scalars['DateTime'];
  readonly qty: InputMaybe<Scalars['Float']>;
  readonly valuePerQty: Scalars['Float'];
};

export type ManualValueStrategy = {
  readonly __typename: 'ManualValueStrategy';
  readonly type: Scalars['String'];
  readonly updatedAt: Scalars['DateTime'];
  readonly value: Scalars['Float'];
};

export type ManualValueStrategyInput = {
  readonly type: Scalars['String'];
  readonly value: Scalars['Float'];
};

export type Mutation = {
  readonly __typename: 'Mutation';
  readonly addInvestment: InvestmentDTO;
  readonly createAsset: AssetDTO;
  readonly createExpense: Scalars['Boolean'];
  readonly createGoal: GoalDTO;
  readonly createSIP: SIPDTO;
  readonly deleteInvestment: Scalars['Boolean'];
  readonly deleteSIP: Scalars['Boolean'];
  readonly loginUser: Scalars['Boolean'];
  readonly logoutUser: Scalars['Boolean'];
  readonly registerUser: Scalars['Boolean'];
  readonly updateAsset: AssetDTO;
  readonly updateGoal: GoalDTO;
  readonly updateInvestment: ReadonlyArray<InvestmentDTO>;
  readonly updateSIP: SIPDTO;
};


export type MutationaddInvestmentArgs = {
  assetId: Scalars['String'];
  input: InvestmentInput;
};


export type MutationcreateAssetArgs = {
  input: AssetInput;
};


export type MutationcreateExpenseArgs = {
  input: ExpenseInput;
};


export type MutationcreateGoalArgs = {
  input: GoalInput;
};


export type MutationcreateSIPArgs = {
  assetId: Scalars['String'];
  input: SIPInput;
};


export type MutationdeleteInvestmentArgs = {
  investmentId: Scalars['String'];
};


export type MutationdeleteSIPArgs = {
  sipId: Scalars['String'];
};


export type MutationloginUserArgs = {
  input: UserLoginInput;
};


export type MutationregisterUserArgs = {
  input: UserRegisterInput;
};


export type MutationupdateAssetArgs = {
  id: Scalars['String'];
  input: AssetInput;
};


export type MutationupdateGoalArgs = {
  goalId: Scalars['Float'];
  input: GoalInput;
};


export type MutationupdateInvestmentArgs = {
  input: InvestmentInput;
  investmentId: Scalars['String'];
};


export type MutationupdateSIPArgs = {
  input: SIPInput;
  sipId: Scalars['String'];
};

export type Query = {
  readonly __typename: 'Query';
  readonly asset: AssetDTO;
  readonly assetSIPs: ReadonlyArray<SIPDTO>;
  readonly assets: ReadonlyArray<AssetDTO>;
  readonly goals: ReadonlyArray<GoalDTO>;
  readonly user: UserDTO;
};


export type QueryassetArgs = {
  id: Scalars['String'];
};


export type QueryassetSIPsArgs = {
  assetId: Scalars['String'];
};

export type SIPDTO = {
  readonly __typename: 'SIPDTO';
  readonly amount: Scalars['Float'];
  readonly asset: AssetDTO;
  readonly assetId: Scalars['String'];
  readonly description: Maybe<Scalars['String']>;
  readonly endDate: Maybe<Scalars['DateTime']>;
  readonly frequency: FrequencyType;
  readonly id: Scalars['String'];
  readonly lastExecutedDate: Maybe<Scalars['DateTime']>;
  readonly name: Scalars['String'];
  readonly startDate: Scalars['DateTime'];
};

export type SIPInput = {
  readonly amount: Scalars['Float'];
  readonly description: InputMaybe<Scalars['String']>;
  readonly endDate: InputMaybe<Scalars['DateTime']>;
  readonly frequency: FrequencyType;
  readonly name: Scalars['String'];
  readonly startDate: Scalars['DateTime'];
};

export type UserDTO = {
  readonly __typename: 'UserDTO';
  readonly email: Scalars['String'];
  readonly name: Scalars['String'];
};

export type UserLoginInput = {
  readonly email: Scalars['String'];
  readonly password: Scalars['String'];
};

export type UserRegisterInput = {
  readonly email: Scalars['String'];
  readonly name: Scalars['String'];
  readonly password: Scalars['String'];
};

export type ValueStrategy = DynamicValueStrategy | FixedValueStrategy | ManualValueStrategy;

export type AddInvestmentMutationVariables = Exact<{
  assetId: Scalars['String'];
  input: InvestmentInput;
}>;


export type AddInvestmentMutation = { readonly __typename: 'Mutation', readonly addInvestment: { readonly __typename: 'InvestmentDTO', readonly id: string, readonly date: any, readonly amount: number } };

export type CreateAssetMutationVariables = Exact<{
  input: AssetInput;
}>;


export type CreateAssetMutation = { readonly __typename: 'Mutation', readonly createAsset: { readonly __typename: 'AssetDTO', readonly id: string, readonly name: string, readonly description: string, readonly category: string, readonly maturityDate: any | null, readonly currency: string, readonly riskLevel: string, readonly growthRate: number, readonly currentValue: number } };

export type CreateSIPMutationVariables = Exact<{
  assetId: Scalars['String'];
  input: SIPInput;
}>;


export type CreateSIPMutation = { readonly __typename: 'Mutation', readonly createSIP: { readonly __typename: 'SIPDTO', readonly id: string, readonly assetId: string, readonly name: string, readonly amount: number, readonly frequency: FrequencyType, readonly startDate: any, readonly endDate: any | null, readonly lastExecutedDate: any | null, readonly description: string | null } };

export type DeleteInvestmentMutationVariables = Exact<{
  investmentId: Scalars['String'];
}>;


export type DeleteInvestmentMutation = { readonly __typename: 'Mutation', readonly deleteInvestment: boolean };

export type DeleteSIPMutationVariables = Exact<{
  sipId: Scalars['String'];
}>;


export type DeleteSIPMutation = { readonly __typename: 'Mutation', readonly deleteSIP: boolean };

export type GetAssetByIdQueryVariables = Exact<{
  id: Scalars['String'];
}>;


export type GetAssetByIdQuery = { readonly __typename: 'Query', readonly asset: { readonly __typename: 'AssetDTO', readonly id: string, readonly name: string, readonly description: string, readonly category: string, readonly maturityDate: any | null, readonly currency: string, readonly riskLevel: string, readonly currentValue: number, readonly valueStrategy: { readonly __typename: 'DynamicValueStrategy', readonly type: string, readonly scriptCode: string, readonly dynamicUpdatedAt: any | null } | { readonly __typename: 'FixedValueStrategy', readonly type: string, readonly growthRate: number } | { readonly __typename: 'ManualValueStrategy', readonly type: string, readonly value: number, readonly manualUpdatedAt: any } } };

export type GetAssetInvestmentsQueryVariables = Exact<{
  assetId: Scalars['String'];
}>;


export type GetAssetInvestmentsQuery = { readonly __typename: 'Query', readonly asset: { readonly __typename: 'AssetDTO', readonly investments: ReadonlyArray<{ readonly __typename: 'InvestmentDTO', readonly id: string, readonly qty: number | null, readonly valuePerQty: number, readonly date: any }> } };

export type GetAssetSIPsQueryVariables = Exact<{
  assetId: Scalars['String'];
}>;


export type GetAssetSIPsQuery = { readonly __typename: 'Query', readonly assetSIPs: ReadonlyArray<{ readonly __typename: 'SIPDTO', readonly id: string, readonly assetId: string, readonly name: string, readonly amount: number, readonly frequency: FrequencyType, readonly startDate: any, readonly endDate: any | null, readonly lastExecutedDate: any | null, readonly description: string | null }> };

export type GetAssetsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAssetsQuery = { readonly __typename: 'Query', readonly assets: ReadonlyArray<{ readonly __typename: 'AssetDTO', readonly id: string, readonly name: string, readonly description: string, readonly category: string, readonly maturityDate: any | null, readonly currency: string, readonly riskLevel: string, readonly growthRate: number, readonly investedAmount: number, readonly currentValue: number, readonly valueStrategy: { readonly __typename: 'DynamicValueStrategy', readonly type: string, readonly scriptCode: string, readonly updatedAt: any | null } | { readonly __typename: 'FixedValueStrategy', readonly type: string, readonly growthRate: number } | { readonly __typename: 'ManualValueStrategy', readonly type: string } }> };

export type LoginUserMutationVariables = Exact<{
  input: UserLoginInput;
}>;


export type LoginUserMutation = { readonly __typename: 'Mutation', readonly loginUser: boolean };

export type LogoutUserMutationVariables = Exact<{ [key: string]: never; }>;


export type LogoutUserMutation = { readonly __typename: 'Mutation', readonly logoutUser: boolean };

export type RegisterUserMutationVariables = Exact<{
  input: UserRegisterInput;
}>;


export type RegisterUserMutation = { readonly __typename: 'Mutation', readonly registerUser: boolean };

export type UpdateAssetMutationVariables = Exact<{
  id: Scalars['String'];
  input: AssetInput;
}>;


export type UpdateAssetMutation = { readonly __typename: 'Mutation', readonly updateAsset: { readonly __typename: 'AssetDTO', readonly id: string, readonly name: string, readonly description: string, readonly category: string, readonly maturityDate: any | null, readonly currency: string, readonly riskLevel: string, readonly currentValue: number, readonly valueStrategy: { readonly __typename: 'DynamicValueStrategy', readonly type: string, readonly scriptCode: string, readonly dynamicUpdatedAt: any | null } | { readonly __typename: 'FixedValueStrategy', readonly type: string, readonly growthRate: number } | { readonly __typename: 'ManualValueStrategy', readonly type: string, readonly value: number, readonly manualUpdatedAt: any } } };

export type UpdateInvestmentMutationVariables = Exact<{
  investmentId: Scalars['String'];
  input: InvestmentInput;
}>;


export type UpdateInvestmentMutation = { readonly __typename: 'Mutation', readonly updateInvestment: ReadonlyArray<{ readonly __typename: 'InvestmentDTO', readonly id: string, readonly date: any, readonly amount: number }> };

export type UpdateSIPMutationVariables = Exact<{
  sipId: Scalars['String'];
  input: SIPInput;
}>;


export type UpdateSIPMutation = { readonly __typename: 'Mutation', readonly updateSIP: { readonly __typename: 'SIPDTO', readonly id: string, readonly assetId: string, readonly name: string, readonly amount: number, readonly frequency: FrequencyType, readonly startDate: any, readonly endDate: any | null, readonly lastExecutedDate: any | null, readonly description: string | null } };


export const AddInvestmentDocument = gql`
    mutation AddInvestment($assetId: String!, $input: InvestmentInput!) {
  addInvestment(assetId: $assetId, input: $input) {
    id
    date
    amount
  }
}
    `;
export type AddInvestmentMutationFn = Apollo.MutationFunction<AddInvestmentMutation, AddInvestmentMutationVariables>;

/**
 * __useAddInvestmentMutation__
 *
 * To run a mutation, you first call `useAddInvestmentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddInvestmentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addInvestmentMutation, { data, loading, error }] = useAddInvestmentMutation({
 *   variables: {
 *      assetId: // value for 'assetId'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddInvestmentMutation(baseOptions?: Apollo.MutationHookOptions<AddInvestmentMutation, AddInvestmentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddInvestmentMutation, AddInvestmentMutationVariables>(AddInvestmentDocument, options);
      }
export type AddInvestmentMutationHookResult = ReturnType<typeof useAddInvestmentMutation>;
export type AddInvestmentMutationResult = Apollo.MutationResult<AddInvestmentMutation>;
export type AddInvestmentMutationOptions = Apollo.BaseMutationOptions<AddInvestmentMutation, AddInvestmentMutationVariables>;
export const CreateAssetDocument = gql`
    mutation CreateAsset($input: AssetInput!) {
  createAsset(input: $input) {
    id
    name
    description
    category
    maturityDate
    currency
    riskLevel
    growthRate
    currentValue
  }
}
    `;
export type CreateAssetMutationFn = Apollo.MutationFunction<CreateAssetMutation, CreateAssetMutationVariables>;

/**
 * __useCreateAssetMutation__
 *
 * To run a mutation, you first call `useCreateAssetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateAssetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createAssetMutation, { data, loading, error }] = useCreateAssetMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateAssetMutation(baseOptions?: Apollo.MutationHookOptions<CreateAssetMutation, CreateAssetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateAssetMutation, CreateAssetMutationVariables>(CreateAssetDocument, options);
      }
export type CreateAssetMutationHookResult = ReturnType<typeof useCreateAssetMutation>;
export type CreateAssetMutationResult = Apollo.MutationResult<CreateAssetMutation>;
export type CreateAssetMutationOptions = Apollo.BaseMutationOptions<CreateAssetMutation, CreateAssetMutationVariables>;
export const CreateSIPDocument = gql`
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
export type CreateSIPMutationFn = Apollo.MutationFunction<CreateSIPMutation, CreateSIPMutationVariables>;

/**
 * __useCreateSIPMutation__
 *
 * To run a mutation, you first call `useCreateSIPMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateSIPMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createSipMutation, { data, loading, error }] = useCreateSIPMutation({
 *   variables: {
 *      assetId: // value for 'assetId'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateSIPMutation(baseOptions?: Apollo.MutationHookOptions<CreateSIPMutation, CreateSIPMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateSIPMutation, CreateSIPMutationVariables>(CreateSIPDocument, options);
      }
export type CreateSIPMutationHookResult = ReturnType<typeof useCreateSIPMutation>;
export type CreateSIPMutationResult = Apollo.MutationResult<CreateSIPMutation>;
export type CreateSIPMutationOptions = Apollo.BaseMutationOptions<CreateSIPMutation, CreateSIPMutationVariables>;
export const DeleteInvestmentDocument = gql`
    mutation DeleteInvestment($investmentId: String!) {
  deleteInvestment(investmentId: $investmentId)
}
    `;
export type DeleteInvestmentMutationFn = Apollo.MutationFunction<DeleteInvestmentMutation, DeleteInvestmentMutationVariables>;

/**
 * __useDeleteInvestmentMutation__
 *
 * To run a mutation, you first call `useDeleteInvestmentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteInvestmentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteInvestmentMutation, { data, loading, error }] = useDeleteInvestmentMutation({
 *   variables: {
 *      investmentId: // value for 'investmentId'
 *   },
 * });
 */
export function useDeleteInvestmentMutation(baseOptions?: Apollo.MutationHookOptions<DeleteInvestmentMutation, DeleteInvestmentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteInvestmentMutation, DeleteInvestmentMutationVariables>(DeleteInvestmentDocument, options);
      }
export type DeleteInvestmentMutationHookResult = ReturnType<typeof useDeleteInvestmentMutation>;
export type DeleteInvestmentMutationResult = Apollo.MutationResult<DeleteInvestmentMutation>;
export type DeleteInvestmentMutationOptions = Apollo.BaseMutationOptions<DeleteInvestmentMutation, DeleteInvestmentMutationVariables>;
export const DeleteSIPDocument = gql`
    mutation DeleteSIP($sipId: String!) {
  deleteSIP(sipId: $sipId)
}
    `;
export type DeleteSIPMutationFn = Apollo.MutationFunction<DeleteSIPMutation, DeleteSIPMutationVariables>;

/**
 * __useDeleteSIPMutation__
 *
 * To run a mutation, you first call `useDeleteSIPMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteSIPMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteSipMutation, { data, loading, error }] = useDeleteSIPMutation({
 *   variables: {
 *      sipId: // value for 'sipId'
 *   },
 * });
 */
export function useDeleteSIPMutation(baseOptions?: Apollo.MutationHookOptions<DeleteSIPMutation, DeleteSIPMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteSIPMutation, DeleteSIPMutationVariables>(DeleteSIPDocument, options);
      }
export type DeleteSIPMutationHookResult = ReturnType<typeof useDeleteSIPMutation>;
export type DeleteSIPMutationResult = Apollo.MutationResult<DeleteSIPMutation>;
export type DeleteSIPMutationOptions = Apollo.BaseMutationOptions<DeleteSIPMutation, DeleteSIPMutationVariables>;
export const GetAssetByIdDocument = gql`
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

/**
 * __useGetAssetByIdQuery__
 *
 * To run a query within a React component, call `useGetAssetByIdQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAssetByIdQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAssetByIdQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetAssetByIdQuery(baseOptions: Apollo.QueryHookOptions<GetAssetByIdQuery, GetAssetByIdQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetAssetByIdQuery, GetAssetByIdQueryVariables>(GetAssetByIdDocument, options);
      }
export function useGetAssetByIdLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetAssetByIdQuery, GetAssetByIdQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetAssetByIdQuery, GetAssetByIdQueryVariables>(GetAssetByIdDocument, options);
        }
export type GetAssetByIdQueryHookResult = ReturnType<typeof useGetAssetByIdQuery>;
export type GetAssetByIdLazyQueryHookResult = ReturnType<typeof useGetAssetByIdLazyQuery>;
export type GetAssetByIdQueryResult = Apollo.QueryResult<GetAssetByIdQuery, GetAssetByIdQueryVariables>;
export const GetAssetInvestmentsDocument = gql`
    query GetAssetInvestments($assetId: String!) {
  asset(id: $assetId) {
    investments {
      id
      qty
      valuePerQty
      date
    }
  }
}
    `;

/**
 * __useGetAssetInvestmentsQuery__
 *
 * To run a query within a React component, call `useGetAssetInvestmentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAssetInvestmentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAssetInvestmentsQuery({
 *   variables: {
 *      assetId: // value for 'assetId'
 *   },
 * });
 */
export function useGetAssetInvestmentsQuery(baseOptions: Apollo.QueryHookOptions<GetAssetInvestmentsQuery, GetAssetInvestmentsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetAssetInvestmentsQuery, GetAssetInvestmentsQueryVariables>(GetAssetInvestmentsDocument, options);
      }
export function useGetAssetInvestmentsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetAssetInvestmentsQuery, GetAssetInvestmentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetAssetInvestmentsQuery, GetAssetInvestmentsQueryVariables>(GetAssetInvestmentsDocument, options);
        }
export type GetAssetInvestmentsQueryHookResult = ReturnType<typeof useGetAssetInvestmentsQuery>;
export type GetAssetInvestmentsLazyQueryHookResult = ReturnType<typeof useGetAssetInvestmentsLazyQuery>;
export type GetAssetInvestmentsQueryResult = Apollo.QueryResult<GetAssetInvestmentsQuery, GetAssetInvestmentsQueryVariables>;
export const GetAssetSIPsDocument = gql`
    query GetAssetSIPs($assetId: String!) {
  assetSIPs(assetId: $assetId) {
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

/**
 * __useGetAssetSIPsQuery__
 *
 * To run a query within a React component, call `useGetAssetSIPsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAssetSIPsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAssetSIPsQuery({
 *   variables: {
 *      assetId: // value for 'assetId'
 *   },
 * });
 */
export function useGetAssetSIPsQuery(baseOptions: Apollo.QueryHookOptions<GetAssetSIPsQuery, GetAssetSIPsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetAssetSIPsQuery, GetAssetSIPsQueryVariables>(GetAssetSIPsDocument, options);
      }
export function useGetAssetSIPsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetAssetSIPsQuery, GetAssetSIPsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetAssetSIPsQuery, GetAssetSIPsQueryVariables>(GetAssetSIPsDocument, options);
        }
export type GetAssetSIPsQueryHookResult = ReturnType<typeof useGetAssetSIPsQuery>;
export type GetAssetSIPsLazyQueryHookResult = ReturnType<typeof useGetAssetSIPsLazyQuery>;
export type GetAssetSIPsQueryResult = Apollo.QueryResult<GetAssetSIPsQuery, GetAssetSIPsQueryVariables>;
export const GetAssetsDocument = gql`
    query GetAssets {
  assets {
    id
    name
    description
    category
    maturityDate
    currency
    riskLevel
    growthRate
    investedAmount
    valueStrategy {
      ... on FixedValueStrategy {
        type
        growthRate
      }
      ... on DynamicValueStrategy {
        type
        scriptCode
        updatedAt
      }
      ... on ManualValueStrategy {
        type
      }
    }
    currentValue
  }
}
    `;

/**
 * __useGetAssetsQuery__
 *
 * To run a query within a React component, call `useGetAssetsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAssetsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAssetsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetAssetsQuery(baseOptions?: Apollo.QueryHookOptions<GetAssetsQuery, GetAssetsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetAssetsQuery, GetAssetsQueryVariables>(GetAssetsDocument, options);
      }
export function useGetAssetsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetAssetsQuery, GetAssetsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetAssetsQuery, GetAssetsQueryVariables>(GetAssetsDocument, options);
        }
export type GetAssetsQueryHookResult = ReturnType<typeof useGetAssetsQuery>;
export type GetAssetsLazyQueryHookResult = ReturnType<typeof useGetAssetsLazyQuery>;
export type GetAssetsQueryResult = Apollo.QueryResult<GetAssetsQuery, GetAssetsQueryVariables>;
export const LoginUserDocument = gql`
    mutation LoginUser($input: UserLoginInput!) {
  loginUser(input: $input)
}
    `;
export type LoginUserMutationFn = Apollo.MutationFunction<LoginUserMutation, LoginUserMutationVariables>;

/**
 * __useLoginUserMutation__
 *
 * To run a mutation, you first call `useLoginUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLoginUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [loginUserMutation, { data, loading, error }] = useLoginUserMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useLoginUserMutation(baseOptions?: Apollo.MutationHookOptions<LoginUserMutation, LoginUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LoginUserMutation, LoginUserMutationVariables>(LoginUserDocument, options);
      }
export type LoginUserMutationHookResult = ReturnType<typeof useLoginUserMutation>;
export type LoginUserMutationResult = Apollo.MutationResult<LoginUserMutation>;
export type LoginUserMutationOptions = Apollo.BaseMutationOptions<LoginUserMutation, LoginUserMutationVariables>;
export const LogoutUserDocument = gql`
    mutation LogoutUser {
  logoutUser
}
    `;
export type LogoutUserMutationFn = Apollo.MutationFunction<LogoutUserMutation, LogoutUserMutationVariables>;

/**
 * __useLogoutUserMutation__
 *
 * To run a mutation, you first call `useLogoutUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLogoutUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [logoutUserMutation, { data, loading, error }] = useLogoutUserMutation({
 *   variables: {
 *   },
 * });
 */
export function useLogoutUserMutation(baseOptions?: Apollo.MutationHookOptions<LogoutUserMutation, LogoutUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LogoutUserMutation, LogoutUserMutationVariables>(LogoutUserDocument, options);
      }
export type LogoutUserMutationHookResult = ReturnType<typeof useLogoutUserMutation>;
export type LogoutUserMutationResult = Apollo.MutationResult<LogoutUserMutation>;
export type LogoutUserMutationOptions = Apollo.BaseMutationOptions<LogoutUserMutation, LogoutUserMutationVariables>;
export const RegisterUserDocument = gql`
    mutation RegisterUser($input: UserRegisterInput!) {
  registerUser(input: $input)
}
    `;
export type RegisterUserMutationFn = Apollo.MutationFunction<RegisterUserMutation, RegisterUserMutationVariables>;

/**
 * __useRegisterUserMutation__
 *
 * To run a mutation, you first call `useRegisterUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRegisterUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [registerUserMutation, { data, loading, error }] = useRegisterUserMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRegisterUserMutation(baseOptions?: Apollo.MutationHookOptions<RegisterUserMutation, RegisterUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RegisterUserMutation, RegisterUserMutationVariables>(RegisterUserDocument, options);
      }
export type RegisterUserMutationHookResult = ReturnType<typeof useRegisterUserMutation>;
export type RegisterUserMutationResult = Apollo.MutationResult<RegisterUserMutation>;
export type RegisterUserMutationOptions = Apollo.BaseMutationOptions<RegisterUserMutation, RegisterUserMutationVariables>;
export const UpdateAssetDocument = gql`
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
export type UpdateAssetMutationFn = Apollo.MutationFunction<UpdateAssetMutation, UpdateAssetMutationVariables>;

/**
 * __useUpdateAssetMutation__
 *
 * To run a mutation, you first call `useUpdateAssetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateAssetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateAssetMutation, { data, loading, error }] = useUpdateAssetMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateAssetMutation(baseOptions?: Apollo.MutationHookOptions<UpdateAssetMutation, UpdateAssetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateAssetMutation, UpdateAssetMutationVariables>(UpdateAssetDocument, options);
      }
export type UpdateAssetMutationHookResult = ReturnType<typeof useUpdateAssetMutation>;
export type UpdateAssetMutationResult = Apollo.MutationResult<UpdateAssetMutation>;
export type UpdateAssetMutationOptions = Apollo.BaseMutationOptions<UpdateAssetMutation, UpdateAssetMutationVariables>;
export const UpdateInvestmentDocument = gql`
    mutation UpdateInvestment($investmentId: String!, $input: InvestmentInput!) {
  updateInvestment(investmentId: $investmentId, input: $input) {
    id
    date
    amount
  }
}
    `;
export type UpdateInvestmentMutationFn = Apollo.MutationFunction<UpdateInvestmentMutation, UpdateInvestmentMutationVariables>;

/**
 * __useUpdateInvestmentMutation__
 *
 * To run a mutation, you first call `useUpdateInvestmentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateInvestmentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateInvestmentMutation, { data, loading, error }] = useUpdateInvestmentMutation({
 *   variables: {
 *      investmentId: // value for 'investmentId'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateInvestmentMutation(baseOptions?: Apollo.MutationHookOptions<UpdateInvestmentMutation, UpdateInvestmentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateInvestmentMutation, UpdateInvestmentMutationVariables>(UpdateInvestmentDocument, options);
      }
export type UpdateInvestmentMutationHookResult = ReturnType<typeof useUpdateInvestmentMutation>;
export type UpdateInvestmentMutationResult = Apollo.MutationResult<UpdateInvestmentMutation>;
export type UpdateInvestmentMutationOptions = Apollo.BaseMutationOptions<UpdateInvestmentMutation, UpdateInvestmentMutationVariables>;
export const UpdateSIPDocument = gql`
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
export type UpdateSIPMutationFn = Apollo.MutationFunction<UpdateSIPMutation, UpdateSIPMutationVariables>;

/**
 * __useUpdateSIPMutation__
 *
 * To run a mutation, you first call `useUpdateSIPMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateSIPMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateSipMutation, { data, loading, error }] = useUpdateSIPMutation({
 *   variables: {
 *      sipId: // value for 'sipId'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateSIPMutation(baseOptions?: Apollo.MutationHookOptions<UpdateSIPMutation, UpdateSIPMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateSIPMutation, UpdateSIPMutationVariables>(UpdateSIPDocument, options);
      }
export type UpdateSIPMutationHookResult = ReturnType<typeof useUpdateSIPMutation>;
export type UpdateSIPMutationResult = Apollo.MutationResult<UpdateSIPMutation>;
export type UpdateSIPMutationOptions = Apollo.BaseMutationOptions<UpdateSIPMutation, UpdateSIPMutationVariables>;