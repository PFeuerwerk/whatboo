import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateMetaCredentialsDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  phoneNumberId?: string;

  @IsOptional()
  @IsString()
  businessAccountId?: string;
}
