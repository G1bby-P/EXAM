import { Controller, Get, Query, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiProduces, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { ExportFormat, RoleCode } from "../../../generated/prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AuthenticatedUser } from "../../common/types/authenticated-request";
import { ExportHistoryQueryDto } from "./dto/export-history-query.dto";
import { ExportQueryDto } from "./dto/export-query.dto";
import { ExportsService } from "./exports.service";

@ApiBearerAuth()
@ApiTags("Exports")
@Controller("exports")
@Roles(RoleCode.ADMIN, RoleCode.REVIEWER)
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get("history")
  history(@Query() query: ExportHistoryQueryDto) {
    return this.exportsService.listHistory(query);
  }

  @Get("results.xlsx")
  @ApiProduces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  async resultsExcel(@Query() query: ExportQueryDto, @CurrentUser() user: AuthenticatedUser, @Res() response: Response) {
    const file = await this.exportsService.exportResults(query, ExportFormat.EXCEL, user.id);
    this.sendFile(response, file);
  }

  @Get("results.pdf")
  @ApiProduces("application/pdf")
  async resultsPdf(@Query() query: ExportQueryDto, @CurrentUser() user: AuthenticatedUser, @Res() response: Response) {
    const file = await this.exportsService.exportResults(query, ExportFormat.PDF, user.id);
    this.sendFile(response, file);
  }

  @Get("report.xlsx")
  @ApiProduces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  async reportExcel(@Query() query: ExportQueryDto, @CurrentUser() user: AuthenticatedUser, @Res() response: Response) {
    const file = await this.exportsService.exportReport(query, ExportFormat.EXCEL, user.id);
    this.sendFile(response, file);
  }

  @Get("report.pdf")
  @ApiProduces("application/pdf")
  async reportPdf(@Query() query: ExportQueryDto, @CurrentUser() user: AuthenticatedUser, @Res() response: Response) {
    const file = await this.exportsService.exportReport(query, ExportFormat.PDF, user.id);
    this.sendFile(response, file);
  }

  @Get("history.xlsx")
  @ApiProduces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  async historyExcel(
    @Query() query: ExportHistoryQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const file = await this.exportsService.exportHistory(query, ExportFormat.EXCEL, user.id);
    this.sendFile(response, file);
  }

  @Get("history.pdf")
  @ApiProduces("application/pdf")
  async historyPdf(@Query() query: ExportHistoryQueryDto, @CurrentUser() user: AuthenticatedUser, @Res() response: Response) {
    const file = await this.exportsService.exportHistory(query, ExportFormat.PDF, user.id);
    this.sendFile(response, file);
  }

  private sendFile(
    response: Response,
    file: {
      buffer: Buffer;
      fileName: string;
      mimeType: string;
    },
  ): void {
    response.setHeader("Content-Type", file.mimeType);
    response.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`);
    response.setHeader("Content-Length", file.buffer.length);
    response.send(file.buffer);
  }
}
