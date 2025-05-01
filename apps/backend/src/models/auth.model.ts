import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Auth {

  @Field()
  token: string;

  constructor(token: string) {
    this.token = token;
  }
}