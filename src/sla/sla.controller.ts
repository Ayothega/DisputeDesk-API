import { Controller, Get, Post, Put, Delete, Param, Body, Req, UseGuards } from "@nestjs/common"
import { AuthGuard } from "@nestjs/passport"
import type { SLAService } from "./sla.service"
import type { CreateSLADto } from "./dto/create-sla.dto"

@Controller("slas")
@UseGuards(AuthGuard("jwt"))
export class SLAController {
  constructor(private slaService: SLAService) {}

  @Post()
  create(@Body() createSLADto: CreateSLADto, @Req() req: any) {
    return this.slaService.create(req.user.organizationId, createSLADto)
  }

  @Get()
  findAll(@Req() req: any) {
    return this.slaService.findAll(req.user.organizationId)
  }

  @Get(":id")
  findOne(@Param("id") id: string, @Req() req: any) {
    return this.slaService.findById(id, req.user.organizationId)
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() data: any, @Req() req: any) {
    return this.slaService.update(id, req.user.organizationId, data)
  }

  @Delete(":id")
  delete(@Param("id") id: string, @Req() req: any) {
    return this.slaService.delete(id, req.user.organizationId)
  }
}
