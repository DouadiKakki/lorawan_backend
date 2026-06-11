import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class SendDownlinkDto {
  @IsNumber() @Min(1) @Max(223) fPort: number;
  @IsString() payload: string;
  @IsOptional() @IsBoolean() confirmed?: boolean;
  @IsOptional() @IsNumber() @Min(0) @Max(15) retries?: number;
}
