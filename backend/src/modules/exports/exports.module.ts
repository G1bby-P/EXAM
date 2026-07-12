import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DatabaseModule } from "../database/database.module";
import { StatisticsModule } from "../statistics/statistics.module";
import { ExportsController } from "./exports.controller";
import { ExportsService } from "./exports.service";

@Module({
  imports: [DatabaseModule, AuditModule, StatisticsModule],
  controllers: [ExportsController],
  providers: [ExportsService],
})
export class ExportsModule {}
