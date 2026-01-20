import { Module } from "@nestjs/common"
import { BullModule } from "@nestjs/bull"
import { SLAService } from "./sla.service"
import { SLAController } from "./sla.controller"
import { PrismaModule } from "../prisma/prisma.module"
import { DisputesModule } from "../disputes/disputes.module"
import { NotificationsModule } from "../notifications/notifications.module"
import { SlaEscalationProcessor } from "./workers/sla-escalation.processor"
import { SlaSchedulerService } from "./workers/sla-scheduler.service"

@Module({
  imports: [
    PrismaModule,
    DisputesModule,
    NotificationsModule,
    BullModule.registerQueue({
      name: "sla-escalation",
    }),
  ],
  providers: [SLAService, SlaEscalationProcessor, SlaSchedulerService],
  controllers: [SLAController],
  exports: [SLAService, SlaSchedulerService],
})
export class SLAModule {}
