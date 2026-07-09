import { IsArray, IsMongoId } from 'class-validator';

export class BulkUserIdsDto {
  @IsArray() @IsMongoId({ each: true }) ids: string[];
}
