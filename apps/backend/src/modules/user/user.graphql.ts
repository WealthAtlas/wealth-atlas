import { Field, ObjectType, InputType } from '@nestjs/graphql';

@ObjectType()
export class UserDTO {
  @Field()
  name!: string;

  @Field()
  email!: string;
}


@InputType()
export class UserRegisterInput {
  @Field()
  name!: string;

  @Field()
  email!: string;

  @Field()
  password!: string;
}

@InputType()
export class UserLoginInput {
  @Field()
  email!: string;

  @Field()
  password!: string;
}