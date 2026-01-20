import { Controller, Get, Param, UseGuards, Req } from "@nestjs/common"
import { AuthGuard } from "@nestjs/passport"
import type { AuditService } from "./audit.service"

@Controller("audit")
@UseGuards(AuthGuard("jwt"))
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  getLogs(userId?: string, disputeId?: string, @Req() req?: any) {
    return this.auditService.getLogs(req?.user?.organizationId || "", { userId, disputeId })
  }

  @Get(":id")
  getLogById(@Param("id") id: string, @Req() req?: any) {
    return this.auditService.getLogById(id, req?.user?.organizationId || "")
  }
}
