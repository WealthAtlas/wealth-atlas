import * as Types from '../models/generated';

export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  DateTime: any;
};

export type CreateAssetInput = {
  category: Scalars['String'];
  currency: Scalars['String'];
  description: Scalars['String'];
  growthRate?: InputMaybe<Scalars['Float']>;
  maturityDate?: InputMaybe<Scalars['DateTime']>;
  name: Scalars['String'];
  riskLevel: Scalars['String'];
};

export type Mutation = {
  __typename?: 'Mutation';
  createAsset: Scalars['Boolean'];
  loginUser: Scalars['Boolean'];
  registerUser: Scalars['Boolean'];
};


export type MutationCreateAssetArgs = {
  input: CreateAssetInput;
};


export type MutationLoginUserArgs = {
  email: Scalars['String'];
  password: Scalars['String'];
};


export type MutationRegisterUserArgs = {
  email: Scalars['String'];
  name: Scalars['String'];
  password: Scalars['String'];
};

export type Query = {
  __typename?: 'Query';
  user: UserDto;
};

export type UserDto = {
  __typename?: 'UserDTO';
  email: Scalars['String'];
  name: Scalars['String'];
};

export type LoginUserMutationVariables = Types.Exact<{
  email: Types.Scalars['String'];
  password: Types.Scalars['String'];
}>;


export type LoginUserMutation = { __typename?: 'Mutation', loginUser: boolean };
