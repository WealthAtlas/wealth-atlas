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

export type AllocatedAssetDto = {
  __typename?: 'AllocatedAssetDTO';
  asset: AssetDto;
  percentage: Scalars['Float'];
};

export type AssetDto = {
  __typename?: 'AssetDTO';
  addInvestment: InvestmentDto;
  addValue: AssetValueDto;
  category: Scalars['String'];
  currency: Scalars['String'];
  currentValue: Scalars['Float'];
  deleteInvestment: Scalars['Boolean'];
  description: Scalars['String'];
  growthRate: Scalars['Float'];
  id: Scalars['String'];
  investedAmount: Scalars['Float'];
  investments: Array<InvestmentDto>;
  maturityDate?: Maybe<Scalars['DateTime']>;
  name: Scalars['String'];
  qty: Scalars['Float'];
  riskLevel: Scalars['String'];
  updateInvestment: Array<InvestmentDto>;
  values: Array<AssetValueDto>;
};


export type AssetDtoAddInvestmentArgs = {
  input: InvestmentInput;
};


export type AssetDtoAddValueArgs = {
  input: AssetValueInput;
};


export type AssetDtoDeleteInvestmentArgs = {
  id: Scalars['String'];
};


export type AssetDtoUpdateInvestmentArgs = {
  id: Scalars['String'];
  input: InvestmentInput;
};

export type AssetInput = {
  category: Scalars['String'];
  currency: Scalars['String'];
  description: Scalars['String'];
  growthRate?: InputMaybe<Scalars['Float']>;
  maturityDate?: InputMaybe<Scalars['DateTime']>;
  name: Scalars['String'];
  riskLevel: Scalars['String'];
};

export type AssetValueDto = {
  __typename?: 'AssetValueDTO';
  date: Scalars['DateTime'];
  valuePerQty: Scalars['Float'];
};

export type AssetValueInput = {
  date: Scalars['DateTime'];
  valuePerQty: Scalars['Float'];
};

export type ExpenseInput = {
  amount: Scalars['Float'];
  category: Scalars['String'];
  currency: Scalars['String'];
  date: Scalars['DateTime'];
  description: Scalars['String'];
  tags: Array<Scalars['String']>;
};

export type GoalDto = {
  __typename?: 'GoalDTO';
  allocateAsset: AllocatedAssetDto;
  allocatedAssets: Array<AllocatedAssetDto>;
  id: Scalars['Float'];
  inflationRate: Scalars['Float'];
  name: Scalars['String'];
  removeAsset: Scalars['Boolean'];
  targetAmount: Scalars['Float'];
  targetDate: Scalars['DateTime'];
};


export type GoalDtoAllocateAssetArgs = {
  assetId: Scalars['String'];
  percentage: Scalars['Float'];
};


export type GoalDtoRemoveAssetArgs = {
  assetId: Scalars['String'];
};

export type GoalInput = {
  inflationRate: Scalars['Float'];
  name: Scalars['String'];
  targetAmount: Scalars['Float'];
  targetDate: Scalars['DateTime'];
};

export type InvestmentDto = {
  __typename?: 'InvestmentDTO';
  amount: Scalars['Float'];
  date: Scalars['DateTime'];
  qty?: Maybe<Scalars['Float']>;
  value_per_qty: Scalars['Float'];
};

export type InvestmentInput = {
  date: Scalars['DateTime'];
  qty?: InputMaybe<Scalars['Float']>;
  value_per_qty: Scalars['Float'];
};

export type Mutation = {
  __typename?: 'Mutation';
  createAsset: Scalars['Boolean'];
  createExpense: Scalars['Boolean'];
  createGoal: GoalDto;
  loginUser: Scalars['Boolean'];
  logoutUser: Scalars['Boolean'];
  registerUser: Scalars['Boolean'];
  updateGoal: GoalDto;
};


export type MutationCreateAssetArgs = {
  input: AssetInput;
};


export type MutationCreateExpenseArgs = {
  input: ExpenseInput;
};


export type MutationCreateGoalArgs = {
  input: GoalInput;
};


export type MutationLoginUserArgs = {
  input: UserLoginInput;
};


export type MutationRegisterUserArgs = {
  input: UserRegisterInput;
};


export type MutationUpdateGoalArgs = {
  goalId: Scalars['Float'];
  input: GoalInput;
};

export type Query = {
  __typename?: 'Query';
  assets: Array<AssetDto>;
  goals: Array<GoalDto>;
  user: UserDto;
};

export type UserDto = {
  __typename?: 'UserDTO';
  email: Scalars['String'];
  name: Scalars['String'];
};

export type UserLoginInput = {
  email: Scalars['String'];
  password: Scalars['String'];
};

export type UserRegisterInput = {
  email: Scalars['String'];
  name: Scalars['String'];
  password: Scalars['String'];
};

export type CreateAssetMutationVariables = Exact<{
  input: AssetInput;
}>;


export type CreateAssetMutation = { __typename?: 'Mutation', createAsset: boolean };

export type GetAssetsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAssetsQuery = { __typename?: 'Query', assets: Array<{ __typename?: 'AssetDTO', id: string, name: string, description: string, category: string, maturityDate?: any | null, currency: string, riskLevel: string, growthRate: number, investedAmount: number }> };

export type LoginUserMutationVariables = Exact<{
  input: UserLoginInput;
}>;


export type LoginUserMutation = { __typename?: 'Mutation', loginUser: boolean };

export type LogoutUserMutationVariables = Exact<{ [key: string]: never; }>;


export type LogoutUserMutation = { __typename?: 'Mutation', logoutUser: boolean };

export type RegisterUserMutationVariables = Exact<{
  input: UserRegisterInput;
}>;


export type RegisterUserMutation = { __typename?: 'Mutation', registerUser: boolean };


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