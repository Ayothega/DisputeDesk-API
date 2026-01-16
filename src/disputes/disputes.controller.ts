import { Controller, Get, Post, Param, Query, Body, Req, HttpCode, HttpStatus } from "@nestjs/common"
import type { DisputesService } from "./disputes.service"
import type { CreateDisputeDto } from "./dto/create-dispute.dto"
import type { TransitionDisputeDto } from "./dto/transition-dispute.dto"
import type { DisputeStatus } from "./enums/dispute-status.enum"

// This example assumes you have a guard that injects user context
@Controller("disputes")
export class DisputesController {
  constructor(private disputesService: DisputesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createDispute(@Body() createDisputeDto: CreateDisputeDto, @Req() req: any) {
    return this.disputesService.createDispute(req.user.organizationId, createDisputeDto, req.user.id)
  }

  @Get()
  async listDisputes(
    @Query("status") status?: DisputeStatus,
    @Query("slaOverdue") slaOverdue?: boolean,
    @Req() req,
  ) {
    const filters = {
      status: status ? (status as DisputeStatus) : undefined,
      slaOverdue: slaOverdue === "true",
    }
    return this.disputesService.listDisputes(req.user.organizationId, filters)
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
      req.user.id,
      req.user.role,
    )
  }
}
