import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DatabaseModule } from "../database/database.module";
import { StatisticsController } from "./statistics.controller";
import { StatisticsService } from "./statistics.service";

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
