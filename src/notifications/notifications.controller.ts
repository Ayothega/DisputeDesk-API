import { Controller, Get, Post, Delete, Param, Query, UseGuards } from "@nestjs/common"
import { AuthGuard } from "@nestjs/passport"
import type { NotificationsService } from "./notifications.service"
import type { Request } from "express"

@Controller("notifications")
@UseGuards(AuthGuard("jwt"))
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  findForUser(@Query("unreadOnly") unreadOnly?: boolean, req: Request) {
    return this.notificationsService.findForUser(req.user.userId, unreadOnly)
  }

  @Post(":id/read")
  markAsRead(@Param("id") id: string, req: Request) {
    return this.notificationsService.markAsRead(id, req.user.userId)
  }

  @Post("read-all")
  markAllAsRead(req: Request) {
    return this.notificationsService.markAllAsRead(req.user.userId)
  }

  @Delete(":id")
  delete(@Param("id") id: string, req: Request) {
    return this.notificationsService.delete(id, req.user.userId)
  }
}
