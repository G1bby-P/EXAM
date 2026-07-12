import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AnswerReviewStatus,
  AttemptStatus,
  Prisma,
  ResultStatus,
  RoleCode,
} from "../../../generated/prisma/client";
import { AuthenticatedUser } from "../../common/types/authenticated-request";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";
import { ResultQueryDto } from "./dto/result-query.dto";
import { ReviewAnswerDto } from "./dto/review-answer.dto";

@Injectable()
export class ResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ResultQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.ResultWhereInput = {
      userId: query.userId,
      examVersionId: query.examVersionId,
      status: query.status,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.result.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          examVersion: true,
          attempt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.result.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async listForUser(userId: string) {
    return this.prisma.result.findMany({
      where: { userId, status: ResultStatus.PUBLISHED },
      include: { examVersion: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string, user: AuthenticatedUser) {
    const result = await this.prisma.result.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        examVersion: true,
        attempt: { include: { answers: true } },
      },
    });
    if (!result) throw new NotFoundException("Result not found.");
    const canView = result.userId === user.id || user.roles.includes(RoleCode.ADMIN) || user.roles.includes(RoleCode.REVIEWER);
    if (!canView) throw new ForbiddenException("You cannot access this result.");
    return result;
  }

  async reviewAnswer(answerId: string, dto: ReviewAnswerDto, reviewerId: string) {
    const answer = await this.prisma.attemptAnswer.findUnique({
      where: { id: answerId },
      include: { attempt: true, examVersionQuestion: true },
    });
    if (!answer) throw new NotFoundException("Answer not found.");

    await this.prisma.attemptAnswer.update({
      where: { id: answerId },
      data: {
        score: new Prisma.Decimal(dto.score),
        feedback: dto.feedback,
        reviewStatus: AnswerReviewStatus.APPROVED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });

    const result = await this.recalculateResult(answer.attemptId);
    await this.audit.log({
      actorUserId: reviewerId,
      action: "ANSWER_REVIEWED",
      entityType: "attempt_answer",
      entityId: answerId,
      metadata: { resultId: result.id, score: dto.score },
    });
    return result;
  }

  async publish(resultId: string, actorUserId?: string) {
    const result = await this.prisma.result.findUnique({ where: { id: resultId } });
    if (!result) throw new NotFoundException("Result not found.");
    const published = await this.prisma.result.update({
      where: { id: resultId },
      data: { status: ResultStatus.PUBLISHED, publishedAt: new Date() },
    });
    await this.audit.log({
      actorUserId,
      action: "RESULT_PUBLISHED",
      entityType: "result",
      entityId: resultId,
    });
    return published;
  }

  private async recalculateResult(attemptId: string) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: true,
        examVersion: true,
        result: true,
      },
    });
    if (!attempt) throw new NotFoundException("Attempt not found.");

    const score = attempt.answers.reduce(
      (sum, answer) => sum.plus(answer.score ?? new Prisma.Decimal(0)),
      new Prisma.Decimal(0),
    );
    const pending = attempt.answers.some((answer) => answer.reviewStatus === AnswerReviewStatus.PENDING_REVIEW);
    const percentage = attempt.maxScore.equals(0)
      ? new Prisma.Decimal(0)
      : score.div(attempt.maxScore).mul(100).toDecimalPlaces(2);
    const passed =
      attempt.examVersion.passingScore === null ? true : percentage.greaterThanOrEqualTo(attempt.examVersion.passingScore);
    const status = pending ? ResultStatus.PENDING_REVIEW : ResultStatus.READY;

    return this.prisma.$transaction(async (tx) => {
      await tx.examAttempt.update({
        where: { id: attemptId },
        data: {
          status: pending ? AttemptStatus.SUBMITTED : AttemptStatus.GRADED,
          gradedAt: pending ? undefined : new Date(),
          score,
          passed,
        },
      });
      return tx.result.update({
        where: { attemptId },
        data: {
          status,
          score,
          percentage,
          passed,
          manualScore: score.minus(attempt.result?.autoScore ?? new Prisma.Decimal(0)),
        },
      });
    });
  }
}
