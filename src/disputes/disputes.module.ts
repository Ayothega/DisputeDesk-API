import { Module } from "@nestjs/common"
import { DisputesController } from "./disputes.controller"
import { DisputesService } from "./disputes.service"
import { DisputeStateMachine } from "./dispute-state.machine"
import { PrismaModule } from "../prisma/prisma.module"
import { AuditModule } from "../audit/audit.module"

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [DisputesController],
  providers: [DisputesService, DisputeStateMachine],
  exports: [DisputesService, DisputeStateMachine],
})
export class DisputesModule {}
