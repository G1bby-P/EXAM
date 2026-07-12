import { BadRequestException, Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import {
  ExportFormat,
  ExportStatus,
  ExportType,
  Prisma,
  ResultStatus,
} from "../../../generated/prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";
import { StatisticsService } from "../statistics/statistics.service";
import { ExportHistoryQueryDto } from "./dto/export-history-query.dto";
import { ExportQueryDto } from "./dto/export-query.dto";

interface ExportedFile {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}

interface ResultExportRow {
  id: string;
  status: ResultStatus;
  score: Prisma.Decimal;
  maxScore: Prisma.Decimal;
  percentage: Prisma.Decimal;
  passed: boolean;
  createdAt: Date;
  user: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  examVersion: {
    title: string;
    exam: {
      title: string;
      course: { title: string } | null;
      topic: { title: string } | null;
    };
  };
  attempt: {
    startedAt: Date;
    submittedAt: Date | null;
  };
}

interface ExportHistoryRow {
  id: string;
  exportType: ExportType;
  format: ExportFormat;
  status: ExportStatus;
  fileName: string;
  rowCount: number;
  createdAt: Date;
  actor: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

type DashboardExport = Awaited<ReturnType<StatisticsService["dashboard"]>>;

const excelMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const pdfMimeType = "application/pdf";

@Injectable()
export class ExportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly statistics: StatisticsService,
  ) {}

  async listHistory(query: ExportHistoryQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.ExportHistoryWhereInput = {
      exportType: query.exportType,
      format: query.format,
      status: query.status,
      fileName: query.search ? { contains: query.search, mode: "insensitive" } : undefined,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.exportHistory.findMany({
        where,
        include: { actor: { select: { id: true, email: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.exportHistory.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async exportResults(query: ExportQueryDto, format: ExportFormat, actorUserId?: string): Promise<ExportedFile> {
    const fileName = this.fileName("resultados", format);
    const filters = this.serializeFilters(query);
    try {
      const rows = await this.getResultRows(query);
      const file =
        format === ExportFormat.EXCEL
          ? await this.resultsExcel(rows, fileName)
          : await this.resultsPdf(rows, fileName, filters);
      await this.recordExport(ExportType.RESULTS, format, fileName, filters, rows.length, actorUserId);
      return file;
    } catch (error) {
      await this.recordFailedExport(ExportType.RESULTS, format, fileName, filters, error, actorUserId);
      throw error;
    }
  }

  async exportReport(query: ExportQueryDto, format: ExportFormat, actorUserId?: string): Promise<ExportedFile> {
    const fileName = this.fileName("reporte-estadistico", format);
    const filters = this.serializeFilters(query);
    try {
      const dashboard = await this.statistics.dashboard(query);
      const file =
        format === ExportFormat.EXCEL
          ? await this.reportExcel(dashboard, fileName)
          : await this.reportPdf(dashboard, fileName);
      await this.recordExport(
        ExportType.REPORT,
        format,
        fileName,
        filters,
        dashboard.summary.totalResults,
        actorUserId,
      );
      return file;
    } catch (error) {
      await this.recordFailedExport(ExportType.REPORT, format, fileName, filters, error, actorUserId);
      throw error;
    }
  }

  async exportHistory(query: ExportHistoryQueryDto, format: ExportFormat, actorUserId?: string): Promise<ExportedFile> {
    const filters = this.serializeHistoryFilters(query);
    const fileName = this.fileName("historial-exportaciones", format);
    try {
      const rows = await this.getHistoryRows(query);
      const file =
        format === ExportFormat.EXCEL
          ? await this.historyExcel(rows, fileName)
          : await this.historyPdf(rows, fileName);
      await this.recordExport(ExportType.HISTORY, format, fileName, filters, rows.length, actorUserId);
      return file;
    } catch (error) {
      await this.recordFailedExport(ExportType.HISTORY, format, fileName, filters, error, actorUserId);
      throw error;
    }
  }

  private async getResultRows(query: ExportQueryDto): Promise<ResultExportRow[]> {
    return this.prisma.result.findMany({
      where: this.resultWhere(query),
      select: {
        id: true,
        status: true,
        score: true,
        maxScore: true,
        percentage: true,
        passed: true,
        createdAt: true,
        user: { select: { email: true, firstName: true, lastName: true } },
        examVersion: {
          select: {
            title: true,
            exam: {
              select: {
                title: true,
                course: { select: { title: true } },
                topic: { select: { title: true } },
              },
            },
          },
        },
        attempt: { select: { startedAt: true, submittedAt: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  private async getHistoryRows(query: ExportHistoryQueryDto): Promise<ExportHistoryRow[]> {
    return this.prisma.exportHistory.findMany({
      where: {
        exportType: query.exportType,
        format: query.format,
        status: query.status,
        fileName: query.search ? { contains: query.search, mode: "insensitive" } : undefined,
      },
      include: { actor: { select: { email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  private resultWhere(query: ExportQueryDto): Prisma.ResultWhereInput {
    return {
      createdAt: this.dateFilter(query.from, query.to),
      examVersionId: query.examVersionId,
      userId: query.userId,
      status: query.status,
      examVersion: this.examVersionFilter(query),
    };
  }

  private examVersionFilter(query: ExportQueryDto): Prisma.ExamVersionWhereInput | undefined {
    const exam = {
      id: query.examId,
      courseId: query.courseId,
      topicId: query.topicId,
    } satisfies Prisma.ExamWhereInput;
    const cleanExam = Object.fromEntries(Object.entries(exam).filter(([, value]) => value !== undefined)) as Prisma.ExamWhereInput;
    return Object.keys(cleanExam).length === 0 ? undefined : { exam: cleanExam };
  }

  private dateFilter(fromValue?: string, toValue?: string): Prisma.DateTimeFilter | undefined {
    const from = fromValue ? this.boundaryDate(fromValue, false) : undefined;
    const to = toValue ? this.boundaryDate(toValue, true) : undefined;
    if (from && to && from > to) throw new BadRequestException("The from date cannot be after the to date.");
    if (!from && !to) return undefined;
    return { gte: from, lte: to };
  }

  private boundaryDate(value: string, endOfDay: boolean): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException(`Invalid date: ${value}.`);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      date.setUTCHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
    }
    return date;
  }

  private async resultsExcel(rows: ResultExportRow[], fileName: string): Promise<ExportedFile> {
    const workbook = this.createWorkbook("Resultados");
    const sheet = workbook.addWorksheet("Resultados");
    sheet.columns = [
      { header: "Alumno", key: "student", width: 32 },
      { header: "Correo", key: "email", width: 36 },
      { header: "Curso", key: "course", width: 28 },
      { header: "Tema", key: "topic", width: 28 },
      { header: "Examen", key: "exam", width: 34 },
      { header: "Version", key: "version", width: 28 },
      { header: "Estado", key: "status", width: 18 },
      { header: "Puntaje", key: "score", width: 12 },
      { header: "Maximo", key: "maxScore", width: 12 },
      { header: "Porcentaje", key: "percentage", width: 14 },
      { header: "Aprobado", key: "passed", width: 12 },
      { header: "Fecha", key: "createdAt", width: 24 },
      { header: "Duracion min", key: "duration", width: 14 },
    ];
    rows.forEach((row) => {
      sheet.addRow({
        student: this.fullName(row.user.firstName, row.user.lastName),
        email: row.user.email,
        course: row.examVersion.exam.course?.title ?? "",
        topic: row.examVersion.exam.topic?.title ?? "",
        exam: row.examVersion.exam.title,
        version: row.examVersion.title,
        status: row.status,
        score: this.toNumber(row.score),
        maxScore: this.toNumber(row.maxScore),
        percentage: this.toNumber(row.percentage),
        passed: row.passed ? "Si" : "No",
        createdAt: row.createdAt.toISOString(),
        duration: this.durationMinutes(row),
      });
    });
    this.styleSheet(sheet);
    return { buffer: await this.workbookBuffer(workbook), fileName, mimeType: excelMimeType };
  }

  private async reportExcel(dashboard: DashboardExport, fileName: string): Promise<ExportedFile> {
    const workbook = this.createWorkbook("Reporte estadistico");
    const summary = workbook.addWorksheet("Resumen");
    summary.columns = [
      { header: "Metrica", key: "metric", width: 32 },
      { header: "Valor", key: "value", width: 18 },
    ];
    Object.entries(dashboard.summary).forEach(([metric, value]) => summary.addRow({ metric, value }));
    this.styleSheet(summary);

    this.addMetricSheet(workbook, "Estados", dashboard.charts.statusDistribution);
    this.addMetricSheet(workbook, "Aprobacion", dashboard.charts.passFail);
    this.addRankingSheet(workbook, "Ranking alumnos", dashboard.rankings.students);
    this.addRankingSheet(workbook, "Ranking examenes", dashboard.rankings.exams);
    this.addRankingSheet(workbook, "Tendencia", dashboard.charts.trend);
    return { buffer: await this.workbookBuffer(workbook), fileName, mimeType: excelMimeType };
  }

  private async historyExcel(rows: ExportHistoryRow[], fileName: string): Promise<ExportedFile> {
    const workbook = this.createWorkbook("Historial de exportaciones");
    const sheet = workbook.addWorksheet("Historial");
    sheet.columns = [
      { header: "Fecha", key: "createdAt", width: 24 },
      { header: "Usuario", key: "actor", width: 34 },
      { header: "Tipo", key: "exportType", width: 18 },
      { header: "Formato", key: "format", width: 14 },
      { header: "Estado", key: "status", width: 16 },
      { header: "Archivo", key: "fileName", width: 42 },
      { header: "Filas", key: "rowCount", width: 12 },
    ];
    rows.forEach((row) =>
      sheet.addRow({
        createdAt: row.createdAt.toISOString(),
        actor: row.actor?.email ?? "Sistema",
        exportType: row.exportType,
        format: row.format,
        status: row.status,
        fileName: row.fileName,
        rowCount: row.rowCount,
      }),
    );
    this.styleSheet(sheet);
    return { buffer: await this.workbookBuffer(workbook), fileName, mimeType: excelMimeType };
  }

  private async resultsPdf(rows: ResultExportRow[], fileName: string, filters: Prisma.InputJsonObject): Promise<ExportedFile> {
    const buffer = await this.pdfBuffer((doc) => {
      this.pdfTitle(doc, "Resultados exportados", filters);
      this.pdfTable(
        doc,
        ["Alumno", "Examen", "%", "Estado", "Fecha"],
        rows.map((row) => [
          this.fullName(row.user.firstName, row.user.lastName) || row.user.email,
          row.examVersion.exam.title,
          `${this.toNumber(row.percentage)}%`,
          row.status,
          row.createdAt.toISOString().slice(0, 10),
        ]),
        [120, 170, 46, 78, 70],
      );
    });
    return { buffer, fileName, mimeType: pdfMimeType };
  }

  private async reportPdf(dashboard: DashboardExport, fileName: string): Promise<ExportedFile> {
    const buffer = await this.pdfBuffer((doc) => {
      this.pdfTitle(doc, "Reporte estadistico", dashboard.filters as Prisma.InputJsonObject);
      const summaryRows = Object.entries(dashboard.summary).map(([metric, value]) => [metric, String(value)]);
      this.pdfSection(doc, "Resumen");
      this.pdfTable(doc, ["Metrica", "Valor"], summaryRows, [300, 120]);
      this.pdfSection(doc, "Ranking de examenes");
      this.pdfTable(
        doc,
        ["Examen", "Resultados", "Promedio", "Aprobacion"],
        dashboard.rankings.exams.map((item) => [
          item.label,
          String(item.count),
          `${item.averagePercentage}%`,
          `${item.passRate}%`,
        ]),
        [220, 80, 80, 90],
      );
      this.pdfSection(doc, "Ranking de alumnos");
      this.pdfTable(
        doc,
        ["Alumno", "Resultados", "Promedio", "Aprobacion"],
        dashboard.rankings.students.map((item) => [
          item.label,
          String(item.count),
          `${item.averagePercentage}%`,
          `${item.passRate}%`,
        ]),
        [220, 80, 80, 90],
      );
    });
    return { buffer, fileName, mimeType: pdfMimeType };
  }

  private async historyPdf(rows: ExportHistoryRow[], fileName: string): Promise<ExportedFile> {
    const buffer = await this.pdfBuffer((doc) => {
      this.pdfTitle(doc, "Historial de exportaciones", {});
      this.pdfTable(
        doc,
        ["Fecha", "Usuario", "Tipo", "Formato", "Filas"],
        rows.map((row) => [
          row.createdAt.toISOString().slice(0, 10),
          row.actor?.email ?? "Sistema",
          row.exportType,
          row.format,
          String(row.rowCount),
        ]),
        [78, 170, 82, 70, 50],
      );
    });
    return { buffer, fileName, mimeType: pdfMimeType };
  }

  private createWorkbook(subject: string) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Exam Platform";
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.subject = subject;
    return workbook;
  }

  private addMetricSheet(workbook: ExcelJS.Workbook, name: string, rows: Array<Record<string, unknown>>) {
    const sheet = workbook.addWorksheet(name);
    sheet.columns = [
      { header: "Etiqueta", key: "label", width: 34 },
      { header: "Valor", key: "value", width: 14 },
      { header: "Porcentaje", key: "percentage", width: 14 },
    ];
    rows.forEach((row) =>
      sheet.addRow({
        label: row.label,
        value: row.value ?? row.count ?? "",
        percentage: row.percentage ?? row.averagePercentage ?? "",
      }),
    );
    this.styleSheet(sheet);
  }

  private addRankingSheet(workbook: ExcelJS.Workbook, name: string, rows: Array<Record<string, unknown>>) {
    const sheet = workbook.addWorksheet(name);
    sheet.columns = [
      { header: "Etiqueta", key: "label", width: 42 },
      { header: "Resultados", key: "count", width: 14 },
      { header: "Promedio", key: "averagePercentage", width: 14 },
      { header: "Puntaje promedio", key: "averageScore", width: 18 },
      { header: "Aprobacion", key: "passRate", width: 14 },
    ];
    rows.forEach((row) => sheet.addRow(row));
    this.styleSheet(sheet);
  }

  private styleSheet(sheet: ExcelJS.Worksheet): void {
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF256F64" } };
    header.alignment = { vertical: "middle", wrapText: true };
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFD8DDD0" } },
          left: { style: "thin", color: { argb: "FFD8DDD0" } },
          bottom: { style: "thin", color: { argb: "FFD8DDD0" } },
          right: { style: "thin", color: { argb: "FFD8DDD0" } },
        };
        cell.alignment = { vertical: "top", wrapText: true };
      });
    });
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columnCount },
    };
  }

  private async workbookBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
    const data = await workbook.xlsx.writeBuffer();
    return Buffer.from(data);
  }

  private pdfBuffer(build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 42, bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      build(doc);
      const range = doc.bufferedPageRange();
      for (let page = range.start; page < range.start + range.count; page += 1) {
        doc.switchToPage(page);
        doc.fontSize(8).fillColor("#596251").text(`Pagina ${page + 1} de ${range.count}`, 42, doc.page.height - 32, {
          align: "right",
        });
      }
      doc.end();
    });
  }

  private pdfTitle(doc: PDFKit.PDFDocument, title: string, filters: Prisma.InputJsonObject): void {
    doc.fontSize(18).fillColor("#20251f").text(title, { continued: false });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor("#596251").text(`Generado: ${new Date().toISOString()}`);
    const activeFilters = Object.entries(filters).filter(([, value]) => value !== null && value !== undefined && value !== "");
    if (activeFilters.length > 0) {
      doc.fontSize(8).text(`Filtros: ${activeFilters.map(([key, value]) => `${key}=${String(value)}`).join(", ")}`);
    }
    doc.moveDown(1);
  }

  private pdfSection(doc: PDFKit.PDFDocument, title: string): void {
    if (doc.y > doc.page.height - 120) doc.addPage();
    doc.moveDown(0.7);
    doc.fontSize(12).fillColor("#20251f").text(title);
    doc.moveDown(0.35);
  }

  private pdfTable(doc: PDFKit.PDFDocument, headers: string[], rows: string[][], widths: number[]): void {
    const startX = doc.x;
    const rowHeight = 20;
    const drawRow = (values: string[], header = false) => {
      if (doc.y > doc.page.height - 68) {
        doc.addPage();
        if (!header) drawRow(headers, true);
      }
      let x = startX;
      const y = doc.y;
      values.forEach((value, index) => {
        doc
          .rect(x, y, widths[index], rowHeight)
          .fillAndStroke(header ? "#256F64" : "#FFFFFF", "#D8DDD0")
          .fillColor(header ? "#FFFFFF" : "#20251f")
          .fontSize(header ? 8 : 7)
          .text(value, x + 4, y + 5, { width: widths[index] - 8, height: rowHeight - 6, ellipsis: true });
        x += widths[index];
      });
      doc.y = y + rowHeight;
    };
    drawRow(headers, true);
    rows.forEach((row) => drawRow(row));
    if (rows.length === 0) drawRow(["Sin datos", ...headers.slice(1).map(() => "")]);
    doc.moveDown(0.8);
  }

  private async recordExport(
    exportType: ExportType,
    format: ExportFormat,
    fileName: string,
    filters: Prisma.InputJsonObject,
    rowCount: number,
    actorUserId?: string,
  ): Promise<void> {
    await this.prisma.exportHistory.create({
      data: {
        actorUserId,
        exportType,
        format,
        status: ExportStatus.COMPLETED,
        fileName,
        filters,
        rowCount,
      },
    });
    await this.audit.log({
      actorUserId,
      action: "EXPORT_CREATED",
      entityType: "export_history",
      metadata: { exportType, format, fileName, rowCount },
    });
  }

  private async recordFailedExport(
    exportType: ExportType,
    format: ExportFormat,
    fileName: string,
    filters: Prisma.InputJsonObject,
    error: unknown,
    actorUserId?: string,
  ): Promise<void> {
    const message = error instanceof Error ? error.message : "Unknown export error.";
    try {
      await this.prisma.exportHistory.create({
        data: {
          actorUserId,
          exportType,
          format,
          status: ExportStatus.FAILED,
          fileName,
          filters,
          rowCount: 0,
          errorMessage: message,
        },
      });
      await this.audit.log({
        actorUserId,
        action: "EXPORT_FAILED",
        entityType: "export_history",
        metadata: { exportType, format, fileName, error: message },
      });
    } catch {
      return undefined;
    }
  }

  private serializeFilters(query: ExportQueryDto): Prisma.InputJsonObject {
    return {
      from: query.from ?? null,
      to: query.to ?? null,
      courseId: query.courseId ?? null,
      topicId: query.topicId ?? null,
      examId: query.examId ?? null,
      examVersionId: query.examVersionId ?? null,
      userId: query.userId ?? null,
      status: query.status ?? null,
      rankingLimit: query.rankingLimit ?? 10,
    };
  }

  private serializeHistoryFilters(query: ExportHistoryQueryDto): Prisma.InputJsonObject {
    return {
      exportType: query.exportType ?? null,
      format: query.format ?? null,
      status: query.status ?? null,
      search: query.search ?? null,
    };
  }

  private fileName(prefix: string, format: ExportFormat): string {
    const extension = format === ExportFormat.EXCEL ? "xlsx" : "pdf";
    return `${prefix}-${new Date().toISOString().slice(0, 10)}.${extension}`;
  }

  private durationMinutes(row: ResultExportRow): number | null {
    if (!row.attempt.submittedAt) return null;
    return Math.round(((row.attempt.submittedAt.getTime() - row.attempt.startedAt.getTime()) / 60000) * 100) / 100;
  }

  private toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
    if (value === null || value === undefined) return 0;
    return Number(value.toString());
  }

  private fullName(firstName?: string | null, lastName?: string | null): string {
    return [firstName, lastName].filter(Boolean).join(" ");
  }
}
