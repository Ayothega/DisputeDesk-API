import { IsString, IsInt, Min, IsNotEmpty } from "class-validator"

export class CreateDisputeDto {
  @IsString()
  @IsNotEmpty()
  customerId: string

  @IsString()
  @IsNotEmpty()
  category: string

  @IsString()
  @IsNotEmpty()
  description: string

  @IsInt()
  @Min(0)
  monetaryImpact: number
}
