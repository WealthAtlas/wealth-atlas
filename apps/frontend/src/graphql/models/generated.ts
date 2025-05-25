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
  readonly addInvestment: InvestmentDTO;
  readonly addValue: AssetValueDTO;
  readonly category: Scalars['String'];
  readonly currency: Scalars['String'];
  readonly currentValue: Scalars['Float'];
  readonly deleteInvestment: Scalars['Boolean'];
  readonly description: Scalars['String'];
  readonly growthRate: Scalars['Float'];
  readonly id: Scalars['String'];
  readonly investedAmount: Scalars['Float'];
  readonly investments: ReadonlyArray<InvestmentDTO>;
  readonly maturityDate: Maybe<Scalars['DateTime']>;
  readonly name: Scalars['String'];
  readonly qty: Scalars['Float'];
  readonly riskLevel: Scalars['String'];
  readonly updateInvestment: ReadonlyArray<InvestmentDTO>;
  readonly values: ReadonlyArray<AssetValueDTO>;
};


export type AssetDTOaddInvestmentArgs = {
  input: InvestmentInput;
};


export type AssetDTOaddValueArgs = {
  input: AssetValueInput;
};


export type AssetDTOdeleteInvestmentArgs = {
  id: Scalars['String'];
};


export type AssetDTOupdateInvestmentArgs = {
  id: Scalars['String'];
  input: InvestmentInput;
};

export type AssetInput = {
  readonly category: Scalars['String'];
  readonly currency: Scalars['String'];
  readonly description: Scalars['String'];
  readonly growthRate: InputMaybe<Scalars['Float']>;
  readonly maturityDate: InputMaybe<Scalars['DateTime']>;
  readonly name: Scalars['String'];
  readonly riskLevel: Scalars['String'];
};

export type AssetValueDTO = {
  readonly __typename: 'AssetValueDTO';
  readonly date: Scalars['DateTime'];
  readonly valuePerQty: Scalars['Float'];
};

export type AssetValueInput = {
  readonly date: Scalars['DateTime'];
  readonly valuePerQty: Scalars['Float'];
};

export type ExpenseInput = {
  readonly amount: Scalars['Float'];
  readonly category: Scalars['String'];
  readonly currency: Scalars['String'];
  readonly date: Scalars['DateTime'];
  readonly description: Scalars['String'];
  readonly tags: ReadonlyArray<Scalars['String']>;
};

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
  readonly qty: Maybe<Scalars['Float']>;
  readonly value_per_qty: Scalars['Float'];
};

export type InvestmentInput = {
  readonly date: Scalars['DateTime'];
  readonly qty: InputMaybe<Scalars['Float']>;
  readonly value_per_qty: Scalars['Float'];
};

export type Mutation = {
  readonly __typename: 'Mutation';
  readonly createAsset: Scalars['Boolean'];
  readonly createExpense: Scalars['Boolean'];
  readonly createGoal: GoalDTO;
  readonly loginUser: Scalars['Boolean'];
  readonly logoutUser: Scalars['Boolean'];
  readonly registerUser: Scalars['Boolean'];
  readonly updateGoal: GoalDTO;
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


export type MutationloginUserArgs = {
  input: UserLoginInput;
};


export type MutationregisterUserArgs = {
  input: UserRegisterInput;
};


export type MutationupdateGoalArgs = {
  goalId: Scalars['Float'];
  input: GoalInput;
};

export type Query = {
  readonly __typename: 'Query';
  readonly assets: ReadonlyArray<AssetDTO>;
  readonly goals: ReadonlyArray<GoalDTO>;
  readonly user: UserDTO;
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

export type CreateAssetMutationVariables = Exact<{
  input: AssetInput;
}>;


export type CreateAssetMutation = { readonly __typename: 'Mutation', readonly createAsset: boolean };

export type GetAssetsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAssetsQuery = { readonly __typename: 'Query', readonly assets: ReadonlyArray<{ readonly __typename: 'AssetDTO', readonly id: string, readonly name: string, readonly description: string, readonly category: string, readonly maturityDate: any | null, readonly currency: string, readonly riskLevel: string, readonly growthRate: number, readonly investedAmount: number }> };

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


export const CreateAssetDocument = gql`
    mutation CreateAsset($input: AssetInput!) {
  createAsset(input: $input)
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