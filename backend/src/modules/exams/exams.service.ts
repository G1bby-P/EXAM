import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AnswerReviewStatus,
  AssignmentStatus,
  AttemptStatus,
  ExamStatus,
  ExamVersionStatus,
  Prisma,
  QuestionType,
  ResultStatus,
  ResultVisibility,
  RoleCode,
  SecurityEventSeverity,
} from "../../../generated/prisma/client";
import { AuthenticatedUser } from "../../common/types/authenticated-request";
import { toSlug } from "../../common/utils/slug";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";
import { AddExamQuestionDto } from "./dto/add-exam-question.dto";
import { AssignExamDto } from "./dto/assign-exam.dto";
import { CreateSecurityEventDto } from "./dto/create-security-event.dto";
import { CreateExamSectionDto } from "./dto/create-exam-section.dto";
import { CreateExamDto } from "./dto/create-exam.dto";
import { ExamQueryDto } from "./dto/exam-query.dto";
import { SaveAnswerDto } from "./dto/save-answer.dto";
import { UpdateExamDto } from "./dto/update-exam.dto";

interface SecurityEventRequestContext {
  ipAddress?: string;
  userAgent?: string | string[];
}

@Injectable()
export class ExamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ExamQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.ExamWhereInput = {
      courseId: query.courseId,
      topicId: query.topicId,
      status: query.status,
      OR: query.search
        ? [
            { title: { contains: query.search, mode: "insensitive" } },
            { slug: { contains: query.search, mode: "insensitive" } },
          ]
        : undefined,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.exam.findMany({
        where,
        include: {
          course: true,
          topic: true,
          sections: { orderBy: { sortOrder: "asc" } },
          versions: { orderBy: { versionNumber: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.exam.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async availableForUser(userId: string) {
    const now = new Date();
    return this.prisma.examAssignment.findMany({
      where: {
        userId,
        status: AssignmentStatus.ASSIGNED,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ dueAt: null }, { dueAt: { gt: now } }] }],
      },
      include: {
        exam: true,
        examVersion: true,
        attempts: { orderBy: { attemptNumber: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        course: true,
        topic: true,
        sections: { orderBy: { sortOrder: "asc" } },
        questions: {
          orderBy: { sortOrder: "asc" },
          include: {
            question: {
              include: {
                options: { orderBy: { sortOrder: "asc" } },
                clinicalCase: true,
                media: { orderBy: { sortOrder: "asc" } },
              },
            },
            section: true,
          },
        },
        versions: { orderBy: { versionNumber: "desc" } },
      },
    });
    if (!exam) throw new NotFoundException("Exam not found.");
    return exam;
  }

  async create(dto: CreateExamDto, actorUserId?: string) {
    if (dto.status === ExamStatus.PUBLISHED) {
      throw new BadRequestException("Use the publish endpoint to publish exams.");
    }
    const slug = dto.slug ? toSlug(dto.slug) : toSlug(dto.title);
    const exam = await this.prisma.exam.create({
      data: {
        courseId: dto.courseId,
        topicId: dto.topicId,
        title: dto.title,
        slug,
        description: dto.description,
        status: dto.status ?? ExamStatus.DRAFT,
        instructions: dto.instructions,
        timeLimitMinutes: dto.timeLimitMinutes,
        passingScore: dto.passingScore === undefined ? undefined : new Prisma.Decimal(dto.passingScore),
        maxAttempts: dto.maxAttempts ?? 1,
        randomizeQuestions: dto.randomizeQuestions ?? false,
        randomizeOptions: dto.randomizeOptions ?? false,
        resultVisibility: dto.resultVisibility ?? ResultVisibility.AFTER_REVIEW,
        availableFrom: dto.availableFrom ? new Date(dto.availableFrom) : undefined,
        availableUntil: dto.availableUntil ? new Date(dto.availableUntil) : undefined,
        archivedAt: dto.status === ExamStatus.ARCHIVED ? new Date() : undefined,
        createdById: actorUserId,
        updatedById: actorUserId,
      },
    });
    await this.audit.log({
      actorUserId,
      action: "EXAM_CREATED",
      entityType: "exam",
      entityId: exam.id,
    });
    return exam;
  }

  async update(id: string, dto: UpdateExamDto, actorUserId?: string) {
    if (dto.status === ExamStatus.PUBLISHED) {
      throw new BadRequestException("Use the publish endpoint to publish exams.");
    }
    await this.findById(id);
    const exam = await this.prisma.exam.update({
      where: { id },
      data: {
        courseId: dto.courseId,
        topicId: dto.topicId,
        title: dto.title,
        slug: dto.slug ? toSlug(dto.slug) : undefined,
        description: dto.description,
        status: dto.status,
        instructions: dto.instructions,
        timeLimitMinutes: dto.timeLimitMinutes,
        passingScore: dto.passingScore === undefined ? undefined : new Prisma.Decimal(dto.passingScore),
        maxAttempts: dto.maxAttempts,
        randomizeQuestions: dto.randomizeQuestions,
        randomizeOptions: dto.randomizeOptions,
        resultVisibility: dto.resultVisibility,
        availableFrom: dto.availableFrom ? new Date(dto.availableFrom) : undefined,
        availableUntil: dto.availableUntil ? new Date(dto.availableUntil) : undefined,
        updatedById: actorUserId,
        archivedAt: dto.status === ExamStatus.ARCHIVED ? new Date() : dto.status ? null : undefined,
      },
    });
    await this.audit.log({
      actorUserId,
      action: "EXAM_UPDATED",
      entityType: "exam",
      entityId: id,
    });
    return exam;
  }

  async archive(id: string, actorUserId?: string): Promise<void> {
    await this.findById(id);
    await this.prisma.exam.update({
      where: { id },
      data: { status: ExamStatus.ARCHIVED, archivedAt: new Date(), updatedById: actorUserId },
    });
    await this.audit.log({
      actorUserId,
      action: "EXAM_ARCHIVED",
      entityType: "exam",
      entityId: id,
    });
  }

  async addSection(examId: string, dto: CreateExamSectionDto, actorUserId?: string) {
    await this.findById(examId);
    const section = await this.prisma.examSection.create({
      data: {
        examId,
        title: dto.title,
        description: dto.description,
        sortOrder: dto.sortOrder,
        randomizeQuestions: dto.randomizeQuestions ?? false,
      },
    });
    await this.audit.log({
      actorUserId,
      action: "EXAM_SECTION_CREATED",
      entityType: "exam_section",
      entityId: section.id,
      metadata: { examId },
    });
    return section;
  }

  async addQuestion(examId: string, dto: AddExamQuestionDto, actorUserId?: string) {
    await this.findById(examId);
    const question = await this.prisma.question.findUnique({ where: { id: dto.questionId } });
    if (!question) throw new NotFoundException("Question not found.");

    const examQuestion = await this.prisma.examQuestion.create({
      data: {
        examId,
        sectionId: dto.sectionId,
        questionId: dto.questionId,
        sortOrder: dto.sortOrder,
        points: new Prisma.Decimal(dto.points),
        isRequired: dto.isRequired ?? true,
      },
      include: { question: true, section: true },
    });
    await this.audit.log({
      actorUserId,
      action: "EXAM_QUESTION_ADDED",
      entityType: "exam_question",
      entityId: examQuestion.id,
      metadata: { examId, questionId: dto.questionId },
    });
    return examQuestion;
  }

  async publish(examId: string, actorUserId?: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        sections: { orderBy: { sortOrder: "asc" } },
        questions: {
          orderBy: { sortOrder: "asc" },
          include: {
            question: {
              include: {
                options: { orderBy: { sortOrder: "asc" } },
                clinicalCase: true,
                media: { orderBy: { sortOrder: "asc" } },
              },
            },
          },
        },
        versions: { orderBy: { versionNumber: "desc" }, take: 1 },
      },
    });
    if (!exam) throw new NotFoundException("Exam not found.");
    if (exam.questions.length === 0) throw new BadRequestException("Cannot publish an exam without questions.");
    const totalPoints = exam.questions.reduce((sum, item) => sum.plus(item.points), new Prisma.Decimal(0));
    if (totalPoints.lessThanOrEqualTo(0)) {
      throw new BadRequestException("Cannot publish an exam with zero total points.");
    }

    const versionNumber = (exam.versions[0]?.versionNumber ?? 0) + 1;
    const publishedAt = new Date();

    const version = await this.prisma.$transaction(async (tx) => {
      const createdVersion = await tx.examVersion.create({
        data: {
          examId: exam.id,
          versionNumber,
          status: ExamVersionStatus.PUBLISHED,
          title: exam.title,
          description: exam.description,
          instructions: exam.instructions,
          timeLimitMinutes: exam.timeLimitMinutes,
          passingScore: exam.passingScore,
          maxAttempts: exam.maxAttempts,
          randomizeQuestions: exam.randomizeQuestions,
          randomizeOptions: exam.randomizeOptions,
          resultVisibility: exam.resultVisibility,
          publishedById: actorUserId,
          publishedAt,
        },
      });

      const sectionIdMap = new Map<string, string>();
      for (const section of exam.sections) {
        const createdSection = await tx.examVersionSection.create({
          data: {
            examVersionId: createdVersion.id,
            sourceSectionId: section.id,
            title: section.title,
            description: section.description,
            sortOrder: section.sortOrder,
            randomizeQuestions: section.randomizeQuestions,
          },
        });
        sectionIdMap.set(section.id, createdSection.id);
      }

      for (const item of exam.questions) {
        const options = item.question.options.map((option) => ({
          id: option.id,
          label: option.label,
          text: option.text,
          sortOrder: option.sortOrder,
          scoreWeight: option.scoreWeight?.toString(),
        }));
        const correctOptionIds = item.question.options.filter((option) => option.isCorrect).map((option) => option.id);
        const mediaSnapshot = item.question.media.map((media) => ({
          id: media.id,
          mediaType: media.mediaType,
          title: media.title,
          description: media.description,
          url: media.url,
          fileAssetId: media.fileAssetId,
          sortOrder: media.sortOrder,
        }));
        const clinicalCaseSnapshot = item.question.clinicalCase
          ? {
              id: item.question.clinicalCase.id,
              title: item.question.clinicalCase.title,
              patientContext: item.question.clinicalCase.patientContext,
              summary: item.question.clinicalCase.summary,
              diagnosis: item.question.clinicalCase.diagnosis,
            }
          : undefined;
        await tx.examVersionQuestion.create({
          data: {
            examVersionId: createdVersion.id,
            examVersionSectionId: item.sectionId ? sectionIdMap.get(item.sectionId) : undefined,
            sourceQuestionId: item.questionId,
            type: item.question.type,
            prompt: item.question.prompt,
            explanation: item.question.explanation,
            optionsSnapshot: options,
            correctAnswerSnapshot: { optionIds: correctOptionIds },
            sortOrder: item.sortOrder,
            points: item.points,
            isRequired: item.isRequired,
            allowPartialCredit: item.question.allowPartialCredit,
            metadata: this.buildQuestionVersionMetadata(item.metadata, {
              clinicalCaseSnapshot,
              mediaSnapshot,
            }),
          },
        });
      }

      await tx.exam.update({
        where: { id: exam.id },
        data: { status: ExamStatus.PUBLISHED, publishedAt, updatedById: actorUserId },
      });
      return createdVersion;
    });

    await this.audit.log({
      actorUserId,
      action: "EXAM_PUBLISHED",
      entityType: "exam_version",
      entityId: version.id,
      metadata: { examId, versionNumber },
    });
    return version;
  }

  async assign(examId: string, dto: AssignExamDto, actorUserId?: string) {
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : undefined;
    const dueAt = dto.dueAt ? new Date(dto.dueAt) : undefined;

    if (startsAt && Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException("Assignment start date is invalid.");
    }
    if (dueAt && Number.isNaN(dueAt.getTime())) {
      throw new BadRequestException("Assignment due date is invalid.");
    }
    if (startsAt && dueAt && dueAt <= startsAt) {
      throw new BadRequestException("Assignment due date must be after the start date.");
    }

    const examVersion =
      dto.examVersionId !== undefined
        ? await this.prisma.examVersion.findUnique({ where: { id: dto.examVersionId } })
        : await this.prisma.examVersion.findFirst({
            where: { examId, status: ExamVersionStatus.PUBLISHED },
            orderBy: { versionNumber: "desc" },
          });

    if (!examVersion || examVersion.examId !== examId) {
      throw new BadRequestException("A published exam version is required for assignment.");
    }

    const assignment = await this.prisma.examAssignment.create({
      data: {
        examId,
        examVersionId: examVersion.id,
        userId: dto.userId,
        assignedById: actorUserId,
        startsAt,
        dueAt,
        maxAttemptsOverride: dto.maxAttemptsOverride,
      },
      include: { exam: true, examVersion: true, user: true },
    });

    await this.audit.log({
      actorUserId,
      action: "EXAM_ASSIGNED",
      entityType: "exam_assignment",
      entityId: assignment.id,
      metadata: { examId, examVersionId: examVersion.id, userId: dto.userId },
    });
    return assignment;
  }

  async startAttempt(assignmentId: string, user: AuthenticatedUser) {
    const assignment = await this.prisma.examAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        examVersion: { include: { questions: true } },
        attempts: { orderBy: { attemptNumber: "desc" } },
      },
    });
    if (!assignment) throw new NotFoundException("Assignment not found.");
    this.assertCanAccessAssignment(assignment.userId, user);
    if (assignment.status !== AssignmentStatus.ASSIGNED) throw new BadRequestException("Assignment is not active.");
    const now = new Date();
    if (assignment.startsAt && assignment.startsAt > now) throw new BadRequestException("Assignment is not available yet.");
    if (assignment.dueAt && assignment.dueAt <= now) throw new BadRequestException("Assignment is expired.");

    const maxAttempts = assignment.maxAttemptsOverride ?? assignment.examVersion.maxAttempts;
    if (assignment.attempts.length >= maxAttempts) throw new BadRequestException("Maximum attempts reached.");

    const attemptNumber = (assignment.attempts[0]?.attemptNumber ?? 0) + 1;
    const maxScore = assignment.examVersion.questions.reduce(
      (sum, question) => sum.plus(question.points),
      new Prisma.Decimal(0),
    );
    const timeLimitMinutes = assignment.examVersion.timeLimitMinutes;
    const expiresAt =
      timeLimitMinutes === null ? null : new Date(now.getTime() + timeLimitMinutes * 60 * 1000);

    const attempt = await this.prisma.examAttempt.create({
      data: {
        assignmentId,
        examVersionId: assignment.examVersionId,
        userId: assignment.userId,
        attemptNumber,
        startedAt: now,
        expiresAt,
        lastActivityAt: now,
        timeLimitMinutes,
        maxScore,
      },
      include: {
        examVersion: {
          include: { questions: { orderBy: { sortOrder: "asc" } }, sections: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });

    await this.audit.log({
      actorUserId: user.id,
      action: "EXAM_ATTEMPT_STARTED",
      entityType: "exam_attempt",
      entityId: attempt.id,
      metadata: { assignmentId },
    });
    return {
      ...attempt,
      examVersion: {
        ...attempt.examVersion,
        questions: attempt.examVersion.questions.map((question) => {
          const { correctAnswerSnapshot: _correctAnswerSnapshot, explanation: _explanation, ...safeQuestion } = question;
          return safeQuestion;
        }),
      },
    };
  }

  async saveAnswer(attemptId: string, questionId: string, dto: SaveAnswerDto, user: AuthenticatedUser) {
    const attempt = await this.getActiveAttemptForUser(attemptId, user);
    const versionQuestion = await this.prisma.examVersionQuestion.findFirst({
      where: { id: questionId, examVersionId: attempt.examVersionId },
    });
    if (!versionQuestion) throw new NotFoundException("Question is not part of this attempt.");
    const reviewStatus = this.requiresManualReview(versionQuestion.type)
      ? AnswerReviewStatus.PENDING_REVIEW
      : AnswerReviewStatus.NOT_REQUIRED;

    const answer = await this.prisma.attemptAnswer.upsert({
      where: {
        attemptId_examVersionQuestionId: {
          attemptId,
          examVersionQuestionId: questionId,
        },
      },
      create: {
        attemptId,
        examVersionQuestionId: questionId,
        answerText: dto.answerText,
        selectedOptionIds: dto.selectedOptionIds ?? undefined,
        fileAssetId: dto.fileAssetId,
        reviewStatus,
      },
      update: {
        answerText: dto.answerText,
        selectedOptionIds: dto.selectedOptionIds ?? undefined,
        fileAssetId: dto.fileAssetId,
        reviewStatus,
        savedAt: new Date(),
      },
    });

    await this.prisma.examAttempt.update({
      where: { id: attemptId },
      data: { lastActivityAt: new Date() },
    });
    return answer;
  }

  async submitAttempt(attemptId: string, user: AuthenticatedUser) {
    const attempt = await this.getActiveAttemptForUser(attemptId, user);
    const versionQuestions = await this.prisma.examVersionQuestion.findMany({
      where: { examVersionId: attempt.examVersionId },
      include: { answers: { where: { attemptId } } },
    });

    let autoScore = new Prisma.Decimal(0);
    let manualPending = false;
    const updates: Prisma.PrismaPromise<unknown>[] = [];

    for (const question of versionQuestions) {
      const answer = question.answers[0];
      if (!answer) {
        if (question.isRequired) {
          updates.push(
            this.prisma.attemptAnswer.create({
              data: {
                attemptId,
                examVersionQuestionId: question.id,
                score: new Prisma.Decimal(0),
                isCorrect: false,
                reviewStatus: AnswerReviewStatus.NOT_REQUIRED,
              },
            }),
          );
        }
        continue;
      }

      if (this.requiresManualReview(question.type)) {
        if (this.hasManualAnswerContent(answer)) {
          manualPending = true;
        } else {
          updates.push(
            this.prisma.attemptAnswer.update({
              where: { id: answer.id },
              data: { score: new Prisma.Decimal(0), isCorrect: false, reviewStatus: AnswerReviewStatus.NOT_REQUIRED },
            }),
          );
        }
        continue;
      }

      const correct = this.isObjectiveAnswerCorrect(question.correctAnswerSnapshot, answer.selectedOptionIds);
      const score = correct ? question.points : new Prisma.Decimal(0);
      autoScore = autoScore.plus(score);
      updates.push(
        this.prisma.attemptAnswer.update({
          where: { id: answer.id },
          data: { score, isCorrect: correct, reviewStatus: AnswerReviewStatus.NOT_REQUIRED },
        }),
      );
    }

    if (updates.length > 0) {
      await this.prisma.$transaction(updates);
    }
    const percentage = attempt.maxScore.equals(0)
      ? new Prisma.Decimal(0)
      : autoScore.div(attempt.maxScore).mul(100).toDecimalPlaces(2);
    const examVersion = await this.prisma.examVersion.findUniqueOrThrow({ where: { id: attempt.examVersionId } });
    const passed = examVersion.passingScore === null ? true : percentage.greaterThanOrEqualTo(examVersion.passingScore);
    const resultStatus = manualPending ? ResultStatus.PENDING_REVIEW : ResultStatus.READY;
    const attemptStatus = manualPending ? AttemptStatus.SUBMITTED : AttemptStatus.GRADED;

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.examAttempt.update({
        where: { id: attemptId },
        data: {
          status: attemptStatus,
          submittedAt: new Date(),
          gradedAt: manualPending ? undefined : new Date(),
          score: autoScore,
          passed,
        },
      });
      return tx.result.upsert({
        where: { attemptId },
        create: {
          attemptId,
          userId: attempt.userId,
          examVersionId: attempt.examVersionId,
          status: resultStatus,
          score: autoScore,
          maxScore: attempt.maxScore,
          percentage,
          passed,
          autoScore,
        },
        update: {
          status: resultStatus,
          score: autoScore,
          maxScore: attempt.maxScore,
          percentage,
          passed,
          autoScore,
        },
      });
    });

    await this.audit.log({
      actorUserId: user.id,
      action: "EXAM_ATTEMPT_SUBMITTED",
      entityType: "exam_attempt",
      entityId: attemptId,
      metadata: { resultId: result.id, manualPending },
    });
    return result;
  }

  async recordSecurityEvent(
    attemptId: string,
    dto: CreateSecurityEventDto,
    user: AuthenticatedUser,
    context: SecurityEventRequestContext,
  ) {
    const attempt = await this.getActiveAttemptForUser(attemptId, user);
    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    if (Number.isNaN(occurredAt.getTime())) {
      throw new BadRequestException("Invalid security event timestamp.");
    }

    const userAgent = this.normalizeUserAgent(context.userAgent);
    const event = await this.prisma.$transaction(async (tx) => {
      const createdEvent = await tx.examSecurityEvent.create({
        data: {
          attemptId: attempt.id,
          userId: attempt.userId,
          eventType: dto.eventType,
          severity: dto.severity ?? SecurityEventSeverity.INFO,
          occurredAt,
          ipAddress: context.ipAddress,
          userAgent,
          metadata: this.toInputJsonObject(dto.metadata),
        },
      });
      await tx.examAttempt.update({
        where: { id: attempt.id },
        data: { lastActivityAt: new Date() },
      });
      return createdEvent;
    });

    await this.audit.log({
      actorUserId: user.id,
      action: "EXAM_SECURITY_EVENT_RECORDED",
      entityType: "exam_security_event",
      entityId: event.id,
      ipAddress: context.ipAddress,
      userAgent,
      metadata: {
        attemptId: attempt.id,
        userId: attempt.userId,
        eventType: event.eventType,
        severity: event.severity,
      },
    });

    return event;
  }

  async listSecurityEvents(attemptId: string, user: AuthenticatedUser) {
    const attempt = await this.prisma.examAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new NotFoundException("Attempt not found.");
    this.assertCanAccessAssignment(attempt.userId, user);

    return this.prisma.examSecurityEvent.findMany({
      where: { attemptId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { occurredAt: "asc" },
    });
  }

  private async getActiveAttemptForUser(attemptId: string, user: AuthenticatedUser) {
    const attempt = await this.prisma.examAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new NotFoundException("Attempt not found.");
    this.assertCanAccessAssignment(attempt.userId, user);
    if (attempt.status !== AttemptStatus.IN_PROGRESS) throw new BadRequestException("Attempt is not in progress.");
    if (attempt.expiresAt && attempt.expiresAt <= new Date()) {
      await this.prisma.examAttempt.update({ where: { id: attemptId }, data: { status: AttemptStatus.EXPIRED } });
      throw new BadRequestException("Attempt has expired.");
    }
    return attempt;
  }

  private assertCanAccessAssignment(ownerUserId: string, user: AuthenticatedUser): void {
    if (ownerUserId === user.id) return;
    if (user.roles.includes(RoleCode.ADMIN) || user.roles.includes(RoleCode.REVIEWER)) return;
    throw new ForbiddenException("You cannot access this assignment.");
  }

  private requiresManualReview(type: QuestionType): boolean {
    return (
      type === QuestionType.SHORT_TEXT ||
      type === QuestionType.ESSAY ||
      type === QuestionType.FILE_UPLOAD ||
      type === QuestionType.CLINICAL_CASE
    );
  }

  private hasManualAnswerContent(answer: { answerText: string | null; fileAssetId: string | null }): boolean {
    return Boolean(answer.fileAssetId || answer.answerText?.trim());
  }

  private buildQuestionVersionMetadata(
    baseMetadata: Prisma.JsonValue | null,
    snapshots: Record<string, Prisma.JsonValue | undefined>,
  ): Prisma.InputJsonValue {
    const base =
      typeof baseMetadata === "object" && baseMetadata !== null && !Array.isArray(baseMetadata)
        ? (baseMetadata as Record<string, Prisma.JsonValue>)
        : {};
    return Object.fromEntries(
      Object.entries({ ...base, ...snapshots }).filter(([, value]) => value !== undefined),
    ) as Prisma.InputJsonObject;
  }

  private isObjectiveAnswerCorrect(
    correctSnapshot: Prisma.JsonValue | null,
    selectedOptionIds: Prisma.JsonValue | null,
  ): boolean {
    const correctOptionIds =
      typeof correctSnapshot === "object" && correctSnapshot !== null && "optionIds" in correctSnapshot
        ? ((correctSnapshot as { optionIds?: string[] }).optionIds ?? [])
        : [];
    const selected = Array.isArray(selectedOptionIds) ? selectedOptionIds.map(String) : [];
    return correctOptionIds.slice().sort().join("|") === selected.slice().sort().join("|");
  }

  private normalizeUserAgent(userAgent?: string | string[]): string | undefined {
    const value = Array.isArray(userAgent) ? userAgent.join(" ") : userAgent;
    return value ? value.slice(0, 512) : undefined;
  }

  private toInputJsonObject(value?: Record<string, unknown>): Prisma.InputJsonObject | undefined {
    if (!value) return undefined;
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
  }
}
