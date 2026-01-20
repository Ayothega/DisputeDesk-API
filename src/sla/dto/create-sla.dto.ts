import { IsString, IsInt, Min, IsNotEmpty } from "class-validator"

export class CreateSLADto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsInt()
  @Min(1)
  resolutionHours: number

  @IsInt()
  @Min(1)
  escalationHours: number
}
