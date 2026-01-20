import { Injectable, NotFoundException } from "@nestjs/common"
import type { PrismaService } from "../prisma/prisma.service"
import type { CreateNotificationDto } from "./dto/create-notification.dto"

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(createNotificationDto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: createNotificationDto,
    })
  }

  async createNotification(input: {
    userId: string
    disputeId?: string
    type: string
    title: string
    message: string
  }) {
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        disputeId: input.disputeId,
        type: input.type as any,
        title: input.title,
        message: input.message,
      },
    })
  }

  async findForUser(userId: string, unreadOnly?: boolean) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: { createdAt: "desc" },
    })
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    })

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException("Notification not found")
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    })
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    })
  }

  async delete(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    })

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException("Notification not found")
    }

    return this.prisma.notification.delete({
      where: { id },
    })
  }
}
