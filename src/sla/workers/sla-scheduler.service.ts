import { Injectable, Logger, type OnModuleInit } from "@nestjs/common"
import type { Queue } from "bull"
import type { PrismaService } from "../../prisma/prisma.service"

@Injectable()
export class SlaSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SlaSchedulerService.name)

  private slaQueue: Queue
  private prisma: PrismaService

  constructor(slaQueue: Queue, prisma: PrismaService) {
    this.slaQueue = slaQueue
    this.prisma = prisma
  }

  async onModuleInit() {
    this.logger.log("Initializing SLA scheduler on module startup")
    await this.initializeScheduledJobs()
  }

  async initializeScheduledJobs() {
    try {
      // Clear existing scheduled jobs to prevent duplicates
      const jobs = await this.slaQueue.getRepeatable()
      for (const job of jobs) {
        await this.slaQueue.removeRepeatable(job.name, job.opts)
      }

      // Get all organizations
      const organizations = await this.prisma.organization.findMany()

      for (const org of organizations) {
        // Schedule escalation checks every 5 minutes
        await this.slaQueue.add(
          "check-escalations",
          { organizationId: org.id },
          {
            repeat: { every: 300000 }, // 5 minutes
            removeOnComplete: false,
            removeOnFail: false,
          },
        )

        // Schedule breach checks every 10 minutes
        await this.slaQueue.add(
          "check-breaches",
          { organizationId: org.id },
          {
            repeat: { every: 600000 }, // 10 minutes
            removeOnComplete: false,
            removeOnFail: false,
          },
        )

        this.logger.log(`Scheduled SLA jobs for organization: ${org.id} (${org.name})`)
      }

      this.logger.log("SLA scheduler initialization complete")
    } catch (error) {
      this.logger.error("Failed to initialize SLA scheduler:", error)
      throw error
    }
  }

  async addOrganizationJobs(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    })

    if (!org) {
      throw new Error(`Organization not found: ${organizationId}`)
    }

    await this.slaQueue.add(
      "check-escalations",
      { organizationId },
      {
        repeat: { every: 300000 },
        removeOnComplete: false,
        removeOnFail: false,
      },
    )

    await this.slaQueue.add(
      "check-breaches",
      { organizationId },
      {
        repeat: { every: 600000 },
        removeOnComplete: false,
        removeOnFail: false,
      },
    )

    this.logger.log(`Added SLA jobs for organization: ${organizationId}`)
  }
}
