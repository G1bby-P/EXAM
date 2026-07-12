import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, ResultStatus } from "../../../generated/prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";
import { StatisticsQueryDto } from "./dto/statistics-query.dto";

interface StatsResultRow {
  id: string;
  status: ResultStatus;
  score: Prisma.Decimal;
  maxScore: Prisma.Decimal;
  percentage: Prisma.Decimal;
  passed: boolean;
  createdAt: Date;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  examVersion: {
    id: string;
    title: string;
    exam: {
      id: string;
      title: string;
      course: { id: string; title: string } | null;
      topic: { id: string; title: string } | null;
    };
  };
  attempt: {
    startedAt: Date;
    submittedAt: Date | null;
  };
}

interface GroupAccumulator {
  id: string;
  label: string;
  count: number;
  percentageSum: number;
  scoreSum: number;
  passedCount: number;
  durationSum: number;
  durationCount: number;
  metadata?: Record<string, string | null>;
}

@Injectable()
export class StatisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async dashboard(query: StatisticsQueryDto) {
    const results = await this.getFilteredResults(query);
    const rankingLimit = query.rankingLimit ?? 10;

    return {
      generatedAt: new Date().toISOString(),
      filters: this.serializeFilters(query),
      summary: this.buildSummary(results),
      charts: {
        statusDistribution: this.buildStatusDistribution(results),
        passFail: this.buildPassFail(results),
        trend: this.buildTrend(results),
        examAverages: this.buildExamRanking(results, rankingLimit),
      },
      rankings: {
        students: this.buildStudentRanking(results, rankingLimit),
        exams: this.buildExamRanking(results, rankingLimit),
      },
    };
  }

  async reportCsv(query: StatisticsQueryDto, actorUserId?: string) {
    const results = await this.getFilteredResults(query);
    const rows = [
      [
        "result_id",
        "student_email",
        "student_name",
        "course",
        "topic",
        "exam",
        "exam_version",
        "status",
        "score",
        "max_score",
        "percentage",
        "passed",
        "created_at",
        "started_at",
        "submitted_at",
        "duration_minutes",
      ],
      ...results.map((result) => [
        result.id,
        result.user.email,
        this.fullName(result.user.firstName, result.user.lastName),
        result.examVersion.exam.course?.title ?? "",
        result.examVersion.exam.topic?.title ?? "",
        result.examVersion.exam.title,
        result.examVersion.title,
        result.status,
        this.toNumber(result.score),
        this.toNumber(result.maxScore),
        this.toNumber(result.percentage),
        result.passed ? "true" : "false",
        result.createdAt.toISOString(),
        result.attempt.startedAt.toISOString(),
        result.attempt.submittedAt?.toISOString() ?? "",
        this.getDurationMinutes(result) ?? "",
      ]),
    ];

    await this.audit.log({
      actorUserId,
      action: "STATISTICS_REPORT_EXPORTED",
      entityType: "statistics",
      metadata: {
        filters: this.serializeFilters(query),
        rows: results.length,
      },
    });

    return {
      fileName: `statistics-report-${new Date().toISOString().slice(0, 10)}.csv`,
      content: rows.map((row) => this.csvRow(row)).join("\r\n"),
    };
  }

  private async getFilteredResults(query: StatisticsQueryDto): Promise<StatsResultRow[]> {
    const where = this.buildWhere(query);
    return this.prisma.result.findMany({
      where,
      select: {
        id: true,
        status: true,
        score: true,
        maxScore: true,
        percentage: true,
        passed: true,
        createdAt: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        examVersion: {
          select: {
            id: true,
            title: true,
            exam: {
              select: {
                id: true,
                title: true,
                course: { select: { id: true, title: true } },
                topic: { select: { id: true, title: true } },
              },
            },
          },
        },
        attempt: { select: { startedAt: true, submittedAt: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  private buildWhere(query: StatisticsQueryDto): Prisma.ResultWhereInput {
    const createdAt = this.buildDateFilter(query);
    const examVersion = this.buildExamVersionFilter(query);
    return {
      createdAt,
      examVersionId: query.examVersionId,
      userId: query.userId,
      status: query.status,
      examVersion,
    };
  }

  private buildExamVersionFilter(query: StatisticsQueryDto): Prisma.ExamVersionWhereInput | undefined {
    const exam: Prisma.ExamWhereInput = {
      id: query.examId,
      courseId: query.courseId,
      topicId: query.topicId,
    };
    const cleanExam = Object.fromEntries(Object.entries(exam).filter(([, value]) => value !== undefined)) as Prisma.ExamWhereInput;
    if (Object.keys(cleanExam).length === 0) return undefined;
    return { exam: cleanExam };
  }

  private buildDateFilter(query: StatisticsQueryDto): Prisma.DateTimeFilter | undefined {
    const from = query.from ? this.parseBoundaryDate(query.from, false) : undefined;
    const to = query.to ? this.parseBoundaryDate(query.to, true) : undefined;
    if (from && to && from > to) throw new BadRequestException("The from date cannot be after the to date.");
    if (!from && !to) return undefined;
    return { gte: from, lte: to };
  }

  private parseBoundaryDate(value: string, endOfDay: boolean): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException(`Invalid date: ${value}.`);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      date.setUTCHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
    }
    return date;
  }

  private buildSummary(results: StatsResultRow[]) {
    const total = results.length;
    const passed = results.filter((result) => result.passed).length;
    const percentages = results.map((result) => this.toNumber(result.percentage));
    const scores = results.map((result) => this.toNumber(result.score));
    const maxScores = results.map((result) => this.toNumber(result.maxScore));
    const durations = results
      .map((result) => this.getDurationMinutes(result))
      .filter((value): value is number => value !== null);

    return {
      totalResults: total,
      passedResults: passed,
      failedResults: total - passed,
      passRate: this.percent(passed, total),
      averagePercentage: this.average(percentages),
      averageScore: this.average(scores),
      averageMaxScore: this.average(maxScores),
      averageDurationMinutes: this.average(durations),
      highestPercentage: percentages.length ? this.round(Math.max(...percentages)) : 0,
      lowestPercentage: percentages.length ? this.round(Math.min(...percentages)) : 0,
      pendingReviewResults: results.filter((result) => result.status === ResultStatus.PENDING_REVIEW).length,
      readyResults: results.filter((result) => result.status === ResultStatus.READY).length,
      publishedResults: results.filter((result) => result.status === ResultStatus.PUBLISHED).length,
    };
  }

  private buildStatusDistribution(results: StatsResultRow[]) {
    const counts = new Map<ResultStatus, number>();
    results.forEach((result) => counts.set(result.status, (counts.get(result.status) ?? 0) + 1));
    return Object.values(ResultStatus).map((status) => ({
      label: status,
      value: counts.get(status) ?? 0,
    }));
  }

  private buildPassFail(results: StatsResultRow[]) {
    const passed = results.filter((result) => result.passed).length;
    return [
      { label: "Aprobados", value: passed, percentage: this.percent(passed, results.length) },
      { label: "No aprobados", value: results.length - passed, percentage: this.percent(results.length - passed, results.length) },
    ];
  }

  private buildTrend(results: StatsResultRow[]) {
    const buckets = new Map<string, GroupAccumulator>();
    results.forEach((result) => {
      const date = result.createdAt.toISOString().slice(0, 10);
      const bucket = this.getGroup(buckets, date, date);
      this.addToGroup(bucket, result);
    });
    return Array.from(buckets.values())
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((bucket) => this.serializeGroup(bucket));
  }

  private buildStudentRanking(results: StatsResultRow[], limit: number) {
    const groups = new Map<string, GroupAccumulator>();
    results.forEach((result) => {
      const group = this.getGroup(groups, result.user.id, this.fullName(result.user.firstName, result.user.lastName) || result.user.email, {
        email: result.user.email,
      });
      this.addToGroup(group, result);
    });
    return this.serializeRanking(groups, limit);
  }

  private buildExamRanking(results: StatsResultRow[], limit: number) {
    const groups = new Map<string, GroupAccumulator>();
    results.forEach((result) => {
      const exam = result.examVersion.exam;
      const group = this.getGroup(groups, exam.id, exam.title, {
        course: exam.course?.title ?? null,
        topic: exam.topic?.title ?? null,
      });
      this.addToGroup(group, result);
    });
    return this.serializeRanking(groups, limit);
  }

  private getGroup(
    groups: Map<string, GroupAccumulator>,
    id: string,
    label: string,
    metadata?: Record<string, string | null>,
  ): GroupAccumulator {
    const existing = groups.get(id);
    if (existing) return existing;
    const created: GroupAccumulator = {
      id,
      label,
      count: 0,
      percentageSum: 0,
      scoreSum: 0,
      passedCount: 0,
      durationSum: 0,
      durationCount: 0,
      metadata,
    };
    groups.set(id, created);
    return created;
  }

  private addToGroup(group: GroupAccumulator, result: StatsResultRow): void {
    group.count += 1;
    group.percentageSum += this.toNumber(result.percentage);
    group.scoreSum += this.toNumber(result.score);
    if (result.passed) group.passedCount += 1;
    const duration = this.getDurationMinutes(result);
    if (duration !== null) {
      group.durationSum += duration;
      group.durationCount += 1;
    }
  }

  private serializeRanking(groups: Map<string, GroupAccumulator>, limit: number) {
    return Array.from(groups.values())
      .map((group) => this.serializeGroup(group))
      .sort((left, right) => right.averagePercentage - left.averagePercentage || right.count - left.count)
      .slice(0, limit);
  }

  private serializeGroup(group: GroupAccumulator) {
    return {
      id: group.id,
      label: group.label,
      count: group.count,
      averagePercentage: this.averageFromSum(group.percentageSum, group.count),
      averageScore: this.averageFromSum(group.scoreSum, group.count),
      passRate: this.percent(group.passedCount, group.count),
      averageDurationMinutes: this.averageFromSum(group.durationSum, group.durationCount),
      metadata: group.metadata,
    };
  }

  private getDurationMinutes(result: StatsResultRow): number | null {
    if (!result.attempt.submittedAt) return null;
    const duration = (result.attempt.submittedAt.getTime() - result.attempt.startedAt.getTime()) / 60000;
    return this.round(Math.max(duration, 0));
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return this.averageFromSum(values.reduce((sum, value) => sum + value, 0), values.length);
  }

  private averageFromSum(sum: number, count: number): number {
    if (count === 0) return 0;
    return this.round(sum / count);
  }

  private percent(value: number, total: number): number {
    if (total === 0) return 0;
    return this.round((value / total) * 100);
  }

  private toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
    if (value === null || value === undefined) return 0;
    return Number(value.toString());
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private fullName(firstName?: string | null, lastName?: string | null): string {
    return [firstName, lastName].filter(Boolean).join(" ");
  }

  private serializeFilters(query: StatisticsQueryDto) {
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

  private csvRow(values: Array<string | number>): string {
    return values
      .map((value) => {
        const text = String(value);
        return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
      })
      .join(",");
  }
}
