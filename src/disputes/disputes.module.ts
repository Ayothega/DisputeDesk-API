import { Module } from "@nestjs/common"
import { DisputesController } from "./disputes.controller"
import { DisputesService } from "./disputes.service"
import { DisputeStateMachine } from "./dispute-state.machine"
import { PrismaService } from "../prisma/prisma.service"

@Module({
  controllers: [DisputesController],
  providers: [DisputesService, DisputeStateMachine, PrismaService],
  exports: [DisputesService, DisputeStateMachine],
})
export class DisputesModule {}
