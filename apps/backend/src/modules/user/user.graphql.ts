import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserDTO {
  @Field()
  name!: string;

  @Field()
  email!: string;
}
