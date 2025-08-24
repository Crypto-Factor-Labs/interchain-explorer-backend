import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListTransactionsDto {
  @IsOptional() @IsString()
  sender?: string;

  @IsOptional() @IsString()
  operator?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  take: number = 25;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  skip: number = 0;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  includeParts: boolean = false;
}
