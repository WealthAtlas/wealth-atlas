import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AssetDTO {
  @Field()
  id!: string;

}
