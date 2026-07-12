import { Controller, Get, Query, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiProduces, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { RoleCode } from "../../../generated/prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AuthenticatedUser } from "../../common/types/authenticated-request";
import { StatisticsQueryDto } from "./dto/statistics-query.dto";
import { StatisticsService } from "./statistics.service";

@ApiBearerAuth()
@ApiTags("Statistics")
@Controller("statistics")
@Roles(RoleCode.ADMIN, RoleCode.REVIEWER)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get("dashboard")
  dashboard(@Query() query: StatisticsQueryDto) {
    return this.statisticsService.dashboard(query);
  }

  @Get("report.csv")
  @ApiProduces("text/csv")
  async reportCsv(
    @Query() query: StatisticsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const csv = await this.statisticsService.reportCsv(query, user.id);
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", `attachment; filename="${csv.fileName}"`);
    return csv.content;
  }
}
