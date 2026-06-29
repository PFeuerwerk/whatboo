import { IsDateString, IsOptional } from 'class-validator';

export class OperationalReportQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}