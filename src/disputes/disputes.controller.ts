import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common"
import { AuthGuard } from "@nestjs/passport"
import { AuditInterceptor } from "../common/interceptors/audit.interceptor"
import type { DisputesService } from "./disputes.service"
import type { CreateDisputeDto } from "./dto/create-dispute.dto"
import type { TransitionDisputeDto } from "./dto/transition-dispute.dto"

@Controller("disputes")
@UseGuards(AuthGuard("jwt"))
@UseInterceptors(AuditInterceptor)
export class DisputesController {
  constructor(private disputesService: DisputesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createDispute(@Body() createDisputeDto: CreateDisputeDto, @Req() req: any) {
    return this.disputesService.createDispute(req.user.organizationId, createDisputeDto, req.user.userId)
  }

  @Get()
  async listDisputes(@Req() req: any) {
    return this.disputesService.listDisputes(req.user.organizationId)
  }

  @Get(":id")
  async getDispute(@Param("id") id: string, @Req() req: any) {
    return this.disputesService.getDisputeById(id, req.user.organizationId)
  }

  @Post(":id/transition")
  @HttpCode(HttpStatus.OK)
  async transitionDispute(@Param("id") id: string, @Body() transitionDto: TransitionDisputeDto, @Req() req: any) {
    return this.disputesService.transitionDispute(
      id,
      req.user.organizationId,
      transitionDto,
      req.user.userId,
      req.user.role,
    )
  }

  @Post(":id/assign")
  @HttpCode(HttpStatus.OK)
  async assignDispute(@Param("id") id: string, @Body() body: { assigneeId: string }, @Req() req: any) {
    return this.disputesService.assignDispute(id, req.user.organizationId, body.assigneeId, req.user.userId)
  }
}
