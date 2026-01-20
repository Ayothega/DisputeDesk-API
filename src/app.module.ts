import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { BullModule } from "@nestjs/bull"
import { AuthModule } from "./auth/auth.module"
import { UsersModule } from "./users/users.module"
import { OrganizationsModule } from "./organizations/organizations.module"
import { DisputesModule } from "./disputes/disputes.module"
import { AuditModule } from "./audit/audit.module"
import { SLAModule } from "./sla/sla.module"
import { NotificationsModule } from "./notifications/notifications.module"
import { PrismaModule } from "./prisma/prisma.module"

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: Number.parseInt(process.env.REDIS_PORT || "6379", 10),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    DisputesModule,
    AuditModule,
    SLAModule,
    NotificationsModule,
  ],
})
export class AppModule {}
