import { IsEmail, IsString, IsUUID, IsOptional, MinLength } from "class-validator"

export class CreateUserDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(8)
  passwordHash: string

  @IsString()
  @IsOptional()
  firstName?: string

  @IsString()
  @IsOptional()
  lastName?: string

  @IsUUID()
  organizationId: string
}
