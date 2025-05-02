import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class AuthDTO {
    @Field()
    token!: string;
}