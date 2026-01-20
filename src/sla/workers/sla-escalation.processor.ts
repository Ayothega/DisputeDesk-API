import { Processor, Process } from "@nestjs/bull"
import type { Job } from "bull"
import { Injectable, Logger } from "@nestjs/common"
import type { DisputesService } from "../../disputes/disputes.service"
import type { PrismaService } from "../../prisma/prisma.service"
import type { NotificationsService } from "../../notifications/notifications.service"
import { DisputeStatus } from "@prisma/client"

@Injectable()
@Processor("sla-escalation")
export class SlaEscalationProcessor {
  private readonly logger = new Logger(SlaEscalationProcessor.name)

  constructor(
    private disputesService: DisputesService,
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  @Process("check-escalations")
  async handleEscalationCheck(job: Job<{ organizationId: string }>) {
    this.logger.debug(`Processing escalation check for org: ${job.data.organizationId}`)

    const organization = await this.prisma.organization.findUnique({
      where: { id: job.data.organizationId },
    })

    if (!organization) {
      throw new Error(`Organization not found: ${job.data.organizationId}`)
    }

    // Find disputes that need escalation based on SLA
    const disputes = await this.prisma.dispute.findMany({
      where: {
        organizationId: job.data.organizationId,
        status: DisputeStatus.IN_PROGRESS,
        sla: {
          isNot: null,
        },
      },
      include: {
        sla: true,
        assignedTo: true,
      },
    })

    for (const dispute of disputes) {
      if (!dispute.sla) continue

      const createdAtMs = dispute.createdAt.getTime()
      const nowMs = Date.now()
      const ageHours = (nowMs - createdAtMs) / (1000 * 60 * 60)

      // Check if escalation threshold is reached
      if (ageHours >= dispute.sla.escalationHours) {
        this.logger.log(`Escalating dispute ${dispute.id} - SLA threshold reached`)

        try {
          await this.disputesService.systemTransitionDispute(
            dispute.id,
            DisputeStatus.ESCALATED,
            `SLA escalation threshold (${dispute.sla.escalationHours}h) reached`,
          )

          // Notify supervisor
          if (dispute.assignedTo) {
            await this.notificationsService.createNotification({
              userId: dispute.assignedTo.id,
              disputeId: dispute.id,
              type: "SLA_WARNING",
              title: "SLA Escalation",
              message: `Dispute #${dispute.externalId} has been automatically escalated due to SLA threshold`,
            })
          }
        } catch (error) {
          this.logger.error(`Failed to escalate dispute ${dispute.id}:`, error)
          throw error
        }
      }
    }

    return { processed: disputes.length }
  }

  @Process("check-breaches")
  async handleBreachCheck(job: Job<{ organizationId: string }>) {
    this.logger.debug(`Processing breach check for org: ${job.data.organizationId}`)

    const disputes = await this.prisma.dispute.findMany({
      where: {
        organizationId: job.data.organizationId,
        status: {
          in: [DisputeStatus.OPEN, DisputeStatus.IN_PROGRESS],
        },
        sla: {
          isNot: null,
        },
      },
      include: {
        sla: true,
        assignedTo: true,
      },
    })

    for (const dispute of disputes) {
      if (!dispute.sla) continue

      const createdAtMs = dispute.createdAt.getTime()
      const nowMs = Date.now()
      const ageHours = (nowMs - createdAtMs) / (1000 * 60 * 60)

      // Check if breach threshold is exceeded
      if (ageHours >= dispute.sla.resolutionHours) {
        this.logger.warn(`SLA BREACH for dispute ${dispute.id} - resolution deadline exceeded`)

        // Notify all supervisors in organization
        const supervisors = await this.prisma.user.findMany({
          where: {
            organizationId: job.data.organizationId,
            role: "SUPERVISOR",
          },
        })

        for (const supervisor of supervisors) {
          await this.notificationsService.createNotification({
            userId: supervisor.id,
            disputeId: dispute.id,
            type: "SLA_BREACH",
            title: "SLA Breach Alert",
            message: `Dispute #${dispute.externalId} has exceeded SLA resolution deadline`,
          })
        }
      }
    }

    return { processed: disputes.length }
  }
}
