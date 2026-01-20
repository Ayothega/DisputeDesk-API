import { IsString, IsUUID, IsOptional, IsEnum, IsNotEmpty } from "class-validator"
import { NotificationType } from "../enums/notification-type.enum"

export class CreateNotificationDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string

  @IsUUID()
  @IsOptional()
  disputeId?: string

  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType

  @IsString()
  @IsNotEmpty()
  title: string

  @IsString()
  @IsNotEmpty()
  message: string
}
