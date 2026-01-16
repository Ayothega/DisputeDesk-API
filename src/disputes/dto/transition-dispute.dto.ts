import { IsEnum, IsOptional, IsString, IsNotEmpty } from "class-validator"
import { DisputeStatus } from "../enums/dispute-status.enum"

export class TransitionDisputeDto {
  @IsEnum(DisputeStatus)
  @IsNotEmpty()
  toState: DisputeStatus

  @IsString()
  @IsOptional()
  reason?: string
}
