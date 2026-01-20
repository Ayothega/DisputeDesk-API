import { IsString, IsDecimal, IsNotEmpty, IsOptional } from "class-validator"

export class CreateDisputeDto {
  @IsString()
  @IsNotEmpty()
  externalId: string

  @IsString()
  @IsNotEmpty()
  reason: string

  @IsDecimal()
  @IsNotEmpty()
  amount: number

  @IsString()
  @IsOptional()
  currency?: string
}
