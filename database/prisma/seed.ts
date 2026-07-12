import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  AnswerReviewStatus,
  AssignmentStatus,
  ExamStatus,
  ExamVersionStatus,
  Prisma,
  PrismaClient,
  QuestionStatus,
  QuestionType,
  ResultVisibility,
  RoleCode,
  UserStatus,
} from "../generated/prisma/client";
import * as bcrypt from "bcryptjs";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run the database seed.");
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0 || value.startsWith("replace-with-")) {
    throw new Error(`${name} is required to run the database seed.`);
  }
  return value;
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const seedIds = {
  users: {
    admin: "00000000-0000-4000-8000-000000000001",
    reviewer: "00000000-0000-4000-8000-000000000002",
    student: "00000000-0000-4000-8000-000000000003",
  },
  tags: {
    security: "10000000-0000-4000-8000-000000000001",
    web: "10000000-0000-4000-8000-000000000002",
    concepts: "10000000-0000-4000-8000-000000000003",
  },
  questions: {
    httpPost: "20000000-0000-4000-8000-000000000001",
    httpsEncryption: "20000000-0000-4000-8000-000000000002",
    authEssay: "20000000-0000-4000-8000-000000000003",
  },
  options: {
    httpGet: "21000000-0000-4000-8000-000000000001",
    httpPost: "21000000-0000-4000-8000-000000000002",
    httpPatch: "21000000-0000-4000-8000-000000000003",
    trueOption: "22000000-0000-4000-8000-000000000001",
    falseOption: "22000000-0000-4000-8000-000000000002",
  },
  exam: "30000000-0000-4000-8000-000000000001",
  section: "31000000-0000-4000-8000-000000000001",
  examQuestions: {
    httpPost: "32000000-0000-4000-8000-000000000001",
    httpsEncryption: "32000000-0000-4000-8000-000000000002",
    authEssay: "32000000-0000-4000-8000-000000000003",
  },
  versionSection: "33000000-0000-4000-8000-000000000001",
  versionQuestions: {
    httpPost: "34000000-0000-4000-8000-000000000001",
    httpsEncryption: "34000000-0000-4000-8000-000000000002",
    authEssay: "34000000-0000-4000-8000-000000000003",
  },
  assignment: "40000000-0000-4000-8000-000000000001",
  auditLog: "50000000-0000-4000-8000-000000000001",
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function main(): Promise<void> {
  const seedPassword = requiredEnv("SEED_PASSWORD");
  const passwordHash = await bcrypt.hash(seedPassword, 12);
  const now = new Date();
  const dueAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    const [adminRole, reviewerRole, studentRole] = await Promise.all([
      tx.role.upsert({
        where: { code: RoleCode.ADMIN },
        create: {
          code: RoleCode.ADMIN,
          name: "Administrator",
          description: "Full access to platform configuration, users, exams and results.",
        },
        update: {
          name: "Administrator",
          description: "Full access to platform configuration, users, exams and results.",
        },
      }),
      tx.role.upsert({
        where: { code: RoleCode.REVIEWER },
        create: {
          code: RoleCode.REVIEWER,
          name: "Reviewer",
          description: "Can review open answers and publish eligible results.",
        },
        update: {
          name: "Reviewer",
          description: "Can review open answers and publish eligible results.",
        },
      }),
      tx.role.upsert({
        where: { code: RoleCode.STUDENT },
        create: {
          code: RoleCode.STUDENT,
          name: "Student",
          description: "Can take assigned exams and view allowed results.",
        },
        update: {
          name: "Student",
          description: "Can take assigned exams and view allowed results.",
        },
      }),
    ]);

    const admin = await tx.user.upsert({
      where: { id: seedIds.users.admin },
      create: {
        id: seedIds.users.admin,
        email: "admin@exam.local",
        emailNormalized: normalizeEmail("admin@exam.local"),
        passwordHash,
        firstName: "System",
        lastName: "Admin",
        status: UserStatus.ACTIVE,
      },
      update: {
        email: "admin@exam.local",
        emailNormalized: normalizeEmail("admin@exam.local"),
        passwordHash,
        firstName: "System",
        lastName: "Admin",
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
    });

    const reviewer = await tx.user.upsert({
      where: { id: seedIds.users.reviewer },
      create: {
        id: seedIds.users.reviewer,
        email: "reviewer@exam.local",
        emailNormalized: normalizeEmail("reviewer@exam.local"),
        passwordHash,
        firstName: "Default",
        lastName: "Reviewer",
        status: UserStatus.ACTIVE,
        createdById: admin.id,
      },
      update: {
        email: "reviewer@exam.local",
        emailNormalized: normalizeEmail("reviewer@exam.local"),
        passwordHash,
        firstName: "Default",
        lastName: "Reviewer",
        status: UserStatus.ACTIVE,
        deletedAt: null,
        createdById: admin.id,
      },
    });

    const student = await tx.user.upsert({
      where: { id: seedIds.users.student },
      create: {
        id: seedIds.users.student,
        email: "student@exam.local",
        emailNormalized: normalizeEmail("student@exam.local"),
        passwordHash,
        firstName: "Demo",
        lastName: "Student",
        status: UserStatus.ACTIVE,
        createdById: admin.id,
      },
      update: {
        email: "student@exam.local",
        emailNormalized: normalizeEmail("student@exam.local"),
        passwordHash,
        firstName: "Demo",
        lastName: "Student",
        status: UserStatus.ACTIVE,
        deletedAt: null,
        createdById: admin.id,
      },
    });

    await Promise.all([
      tx.userRole.upsert({
        where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
        create: { userId: admin.id, roleId: adminRole.id, assignedById: admin.id },
        update: { assignedById: admin.id },
      }),
      tx.userRole.upsert({
        where: { userId_roleId: { userId: reviewer.id, roleId: reviewerRole.id } },
        create: { userId: reviewer.id, roleId: reviewerRole.id, assignedById: admin.id },
        update: { assignedById: admin.id },
      }),
      tx.userRole.upsert({
        where: { userId_roleId: { userId: student.id, roleId: studentRole.id } },
        create: { userId: student.id, roleId: studentRole.id, assignedById: admin.id },
        update: { assignedById: admin.id },
      }),
    ]);

    const tags = await Promise.all([
      tx.tag.upsert({
        where: { slug: "security" },
        create: { id: seedIds.tags.security, name: "Security", slug: "security" },
        update: { name: "Security" },
      }),
      tx.tag.upsert({
        where: { slug: "web" },
        create: { id: seedIds.tags.web, name: "Web", slug: "web" },
        update: { name: "Web" },
      }),
      tx.tag.upsert({
        where: { slug: "concepts" },
        create: { id: seedIds.tags.concepts, name: "Concepts", slug: "concepts" },
        update: { name: "Concepts" },
      }),
    ]);

    const httpQuestion = await tx.question.upsert({
      where: { id: seedIds.questions.httpPost },
      create: {
        id: seedIds.questions.httpPost,
        type: QuestionType.SINGLE_CHOICE,
        status: QuestionStatus.ACTIVE,
        prompt: "Which HTTP method is most commonly used to create a new resource?",
        explanation: "POST is commonly used to create resources in REST-style APIs.",
        defaultPoints: new Prisma.Decimal("1.00"),
        difficulty: 1,
        createdById: admin.id,
        updatedById: admin.id,
      },
      update: {
        type: QuestionType.SINGLE_CHOICE,
        status: QuestionStatus.ACTIVE,
        prompt: "Which HTTP method is most commonly used to create a new resource?",
        explanation: "POST is commonly used to create resources in REST-style APIs.",
        defaultPoints: new Prisma.Decimal("1.00"),
        difficulty: 1,
        archivedAt: null,
        updatedById: admin.id,
      },
    });

    const httpsQuestion = await tx.question.upsert({
      where: { id: seedIds.questions.httpsEncryption },
      create: {
        id: seedIds.questions.httpsEncryption,
        type: QuestionType.TRUE_FALSE,
        status: QuestionStatus.ACTIVE,
        prompt: "HTTPS encrypts traffic between the browser and the server.",
        explanation: "HTTPS uses TLS to protect data in transit.",
        defaultPoints: new Prisma.Decimal("1.00"),
        difficulty: 1,
        createdById: admin.id,
        updatedById: admin.id,
      },
      update: {
        type: QuestionType.TRUE_FALSE,
        status: QuestionStatus.ACTIVE,
        prompt: "HTTPS encrypts traffic between the browser and the server.",
        explanation: "HTTPS uses TLS to protect data in transit.",
        defaultPoints: new Prisma.Decimal("1.00"),
        difficulty: 1,
        archivedAt: null,
        updatedById: admin.id,
      },
    });

    const essayQuestion = await tx.question.upsert({
      where: { id: seedIds.questions.authEssay },
      create: {
        id: seedIds.questions.authEssay,
        type: QuestionType.ESSAY,
        status: QuestionStatus.ACTIVE,
        prompt: "Explain the difference between authentication and authorization.",
        explanation: "Authentication confirms identity; authorization decides allowed actions.",
        defaultPoints: new Prisma.Decimal("3.00"),
        difficulty: 2,
        allowPartialCredit: true,
        createdById: admin.id,
        updatedById: admin.id,
      },
      update: {
        type: QuestionType.ESSAY,
        status: QuestionStatus.ACTIVE,
        prompt: "Explain the difference between authentication and authorization.",
        explanation: "Authentication confirms identity; authorization decides allowed actions.",
        defaultPoints: new Prisma.Decimal("3.00"),
        difficulty: 2,
        allowPartialCredit: true,
        archivedAt: null,
        updatedById: admin.id,
      },
    });

    await Promise.all([
      tx.questionOption.upsert({
        where: { id: seedIds.options.httpGet },
        create: {
          id: seedIds.options.httpGet,
          questionId: httpQuestion.id,
          label: "A",
          text: "GET",
          isCorrect: false,
          sortOrder: 1,
        },
        update: { label: "A", text: "GET", isCorrect: false, sortOrder: 1 },
      }),
      tx.questionOption.upsert({
        where: { id: seedIds.options.httpPost },
        create: {
          id: seedIds.options.httpPost,
          questionId: httpQuestion.id,
          label: "B",
          text: "POST",
          isCorrect: true,
          sortOrder: 2,
        },
        update: { label: "B", text: "POST", isCorrect: true, sortOrder: 2 },
      }),
      tx.questionOption.upsert({
        where: { id: seedIds.options.httpPatch },
        create: {
          id: seedIds.options.httpPatch,
          questionId: httpQuestion.id,
          label: "C",
          text: "PATCH",
          isCorrect: false,
          sortOrder: 3,
        },
        update: { label: "C", text: "PATCH", isCorrect: false, sortOrder: 3 },
      }),
      tx.questionOption.upsert({
        where: { id: seedIds.options.trueOption },
        create: {
          id: seedIds.options.trueOption,
          questionId: httpsQuestion.id,
          label: "A",
          text: "True",
          isCorrect: true,
          sortOrder: 1,
        },
        update: { label: "A", text: "True", isCorrect: true, sortOrder: 1 },
      }),
      tx.questionOption.upsert({
        where: { id: seedIds.options.falseOption },
        create: {
          id: seedIds.options.falseOption,
          questionId: httpsQuestion.id,
          label: "B",
          text: "False",
          isCorrect: false,
          sortOrder: 2,
        },
        update: { label: "B", text: "False", isCorrect: false, sortOrder: 2 },
      }),
    ]);

    await Promise.all([
      tx.questionTag.upsert({
        where: { questionId_tagId: { questionId: httpQuestion.id, tagId: tags[1].id } },
        create: { questionId: httpQuestion.id, tagId: tags[1].id },
        update: {},
      }),
      tx.questionTag.upsert({
        where: { questionId_tagId: { questionId: httpsQuestion.id, tagId: tags[0].id } },
        create: { questionId: httpsQuestion.id, tagId: tags[0].id },
        update: {},
      }),
      tx.questionTag.upsert({
        where: { questionId_tagId: { questionId: essayQuestion.id, tagId: tags[2].id } },
        create: { questionId: essayQuestion.id, tagId: tags[2].id },
        update: {},
      }),
    ]);

    const exam = await tx.exam.upsert({
      where: { slug: "initial-diagnostic-exam" },
      create: {
        id: seedIds.exam,
        title: "Initial Diagnostic Exam",
        slug: "initial-diagnostic-exam",
        description: "Baseline exam used to verify the platform data model.",
        status: ExamStatus.PUBLISHED,
        instructions: "Read each question carefully before answering.",
        timeLimitMinutes: 30,
        passingScore: new Prisma.Decimal("70.00"),
        maxAttempts: 1,
        randomizeQuestions: false,
        randomizeOptions: false,
        resultVisibility: ResultVisibility.AFTER_REVIEW,
        availableFrom: now,
        availableUntil: dueAt,
        publishedAt: now,
        createdById: admin.id,
        updatedById: admin.id,
      },
      update: {
        title: "Initial Diagnostic Exam",
        description: "Baseline exam used to verify the platform data model.",
        status: ExamStatus.PUBLISHED,
        instructions: "Read each question carefully before answering.",
        timeLimitMinutes: 30,
        passingScore: new Prisma.Decimal("70.00"),
        maxAttempts: 1,
        randomizeQuestions: false,
        randomizeOptions: false,
        resultVisibility: ResultVisibility.AFTER_REVIEW,
        availableFrom: now,
        availableUntil: dueAt,
        publishedAt: now,
        archivedAt: null,
        updatedById: admin.id,
      },
    });

    const section = await tx.examSection.upsert({
      where: { id: seedIds.section },
      create: {
        id: seedIds.section,
        examId: exam.id,
        title: "Core concepts",
        description: "Foundational web and security concepts.",
        sortOrder: 1,
      },
      update: {
        title: "Core concepts",
        description: "Foundational web and security concepts.",
        sortOrder: 1,
      },
    });

    await Promise.all([
      tx.examQuestion.upsert({
        where: { id: seedIds.examQuestions.httpPost },
        create: {
          id: seedIds.examQuestions.httpPost,
          examId: exam.id,
          sectionId: section.id,
          questionId: httpQuestion.id,
          sortOrder: 1,
          points: new Prisma.Decimal("1.00"),
        },
        update: {
          sectionId: section.id,
          questionId: httpQuestion.id,
          sortOrder: 1,
          points: new Prisma.Decimal("1.00"),
        },
      }),
      tx.examQuestion.upsert({
        where: { id: seedIds.examQuestions.httpsEncryption },
        create: {
          id: seedIds.examQuestions.httpsEncryption,
          examId: exam.id,
          sectionId: section.id,
          questionId: httpsQuestion.id,
          sortOrder: 2,
          points: new Prisma.Decimal("1.00"),
        },
        update: {
          sectionId: section.id,
          questionId: httpsQuestion.id,
          sortOrder: 2,
          points: new Prisma.Decimal("1.00"),
        },
      }),
      tx.examQuestion.upsert({
        where: { id: seedIds.examQuestions.authEssay },
        create: {
          id: seedIds.examQuestions.authEssay,
          examId: exam.id,
          sectionId: section.id,
          questionId: essayQuestion.id,
          sortOrder: 3,
          points: new Prisma.Decimal("3.00"),
        },
        update: {
          sectionId: section.id,
          questionId: essayQuestion.id,
          sortOrder: 3,
          points: new Prisma.Decimal("3.00"),
        },
      }),
    ]);

    const examVersion = await tx.examVersion.upsert({
      where: { examId_versionNumber: { examId: exam.id, versionNumber: 1 } },
      create: {
        examId: exam.id,
        versionNumber: 1,
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
        publishedById: admin.id,
        publishedAt: now,
      },
      update: {
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
        publishedById: admin.id,
        retiredAt: null,
      },
    });

    const versionSection = await tx.examVersionSection.upsert({
      where: { id: seedIds.versionSection },
      create: {
        id: seedIds.versionSection,
        examVersionId: examVersion.id,
        sourceSectionId: section.id,
        title: section.title,
        description: section.description,
        sortOrder: section.sortOrder,
        randomizeQuestions: section.randomizeQuestions,
      },
      update: {
        sourceSectionId: section.id,
        title: section.title,
        description: section.description,
        sortOrder: section.sortOrder,
        randomizeQuestions: section.randomizeQuestions,
      },
    });

    await Promise.all([
      tx.examVersionQuestion.upsert({
        where: { id: seedIds.versionQuestions.httpPost },
        create: {
          id: seedIds.versionQuestions.httpPost,
          examVersionId: examVersion.id,
          examVersionSectionId: versionSection.id,
          sourceQuestionId: httpQuestion.id,
          type: QuestionType.SINGLE_CHOICE,
          prompt: httpQuestion.prompt,
          explanation: httpQuestion.explanation,
          optionsSnapshot: [
            { id: seedIds.options.httpGet, label: "A", text: "GET" },
            { id: seedIds.options.httpPost, label: "B", text: "POST" },
            { id: seedIds.options.httpPatch, label: "C", text: "PATCH" },
          ],
          correctAnswerSnapshot: { optionIds: [seedIds.options.httpPost] },
          sortOrder: 1,
          points: new Prisma.Decimal("1.00"),
          isRequired: true,
          allowPartialCredit: false,
        },
        update: {
          examVersionSectionId: versionSection.id,
          sourceQuestionId: httpQuestion.id,
          prompt: httpQuestion.prompt,
          explanation: httpQuestion.explanation,
          optionsSnapshot: [
            { id: seedIds.options.httpGet, label: "A", text: "GET" },
            { id: seedIds.options.httpPost, label: "B", text: "POST" },
            { id: seedIds.options.httpPatch, label: "C", text: "PATCH" },
          ],
          correctAnswerSnapshot: { optionIds: [seedIds.options.httpPost] },
          sortOrder: 1,
          points: new Prisma.Decimal("1.00"),
          isRequired: true,
          allowPartialCredit: false,
        },
      }),
      tx.examVersionQuestion.upsert({
        where: { id: seedIds.versionQuestions.httpsEncryption },
        create: {
          id: seedIds.versionQuestions.httpsEncryption,
          examVersionId: examVersion.id,
          examVersionSectionId: versionSection.id,
          sourceQuestionId: httpsQuestion.id,
          type: QuestionType.TRUE_FALSE,
          prompt: httpsQuestion.prompt,
          explanation: httpsQuestion.explanation,
          optionsSnapshot: [
            { id: seedIds.options.trueOption, label: "A", text: "True" },
            { id: seedIds.options.falseOption, label: "B", text: "False" },
          ],
          correctAnswerSnapshot: { optionIds: [seedIds.options.trueOption] },
          sortOrder: 2,
          points: new Prisma.Decimal("1.00"),
          isRequired: true,
          allowPartialCredit: false,
        },
        update: {
          examVersionSectionId: versionSection.id,
          sourceQuestionId: httpsQuestion.id,
          prompt: httpsQuestion.prompt,
          explanation: httpsQuestion.explanation,
          optionsSnapshot: [
            { id: seedIds.options.trueOption, label: "A", text: "True" },
            { id: seedIds.options.falseOption, label: "B", text: "False" },
          ],
          correctAnswerSnapshot: { optionIds: [seedIds.options.trueOption] },
          sortOrder: 2,
          points: new Prisma.Decimal("1.00"),
          isRequired: true,
          allowPartialCredit: false,
        },
      }),
      tx.examVersionQuestion.upsert({
        where: { id: seedIds.versionQuestions.authEssay },
        create: {
          id: seedIds.versionQuestions.authEssay,
          examVersionId: examVersion.id,
          examVersionSectionId: versionSection.id,
          sourceQuestionId: essayQuestion.id,
          type: QuestionType.ESSAY,
          prompt: essayQuestion.prompt,
          explanation: essayQuestion.explanation,
          sortOrder: 3,
          points: new Prisma.Decimal("3.00"),
          isRequired: true,
          allowPartialCredit: true,
          metadata: { reviewStatus: AnswerReviewStatus.PENDING_REVIEW },
        },
        update: {
          examVersionSectionId: versionSection.id,
          sourceQuestionId: essayQuestion.id,
          prompt: essayQuestion.prompt,
          explanation: essayQuestion.explanation,
          sortOrder: 3,
          points: new Prisma.Decimal("3.00"),
          isRequired: true,
          allowPartialCredit: true,
          metadata: { reviewStatus: AnswerReviewStatus.PENDING_REVIEW },
        },
      }),
    ]);

    await tx.examAssignment.upsert({
      where: { id: seedIds.assignment },
      create: {
        id: seedIds.assignment,
        examId: exam.id,
        examVersionId: examVersion.id,
        userId: student.id,
        assignedById: admin.id,
        status: AssignmentStatus.ASSIGNED,
        startsAt: now,
        dueAt,
      },
      update: {
        examId: exam.id,
        examVersionId: examVersion.id,
        userId: student.id,
        assignedById: admin.id,
        status: AssignmentStatus.ASSIGNED,
        startsAt: now,
        dueAt,
        revokedAt: null,
        completedAt: null,
      },
    });

    await tx.auditLog.upsert({
      where: { id: seedIds.auditLog },
      create: {
        id: seedIds.auditLog,
        actorUserId: admin.id,
        action: "SEED_DATABASE",
        entityType: "database",
        metadata: {
          examId: exam.id,
          examVersionId: examVersion.id,
          studentId: student.id,
        },
      },
      update: {
        actorUserId: admin.id,
        action: "SEED_DATABASE",
        entityType: "database",
        metadata: {
          examId: exam.id,
          examVersionId: examVersion.id,
          studentId: student.id,
        },
      },
    });
  });

  console.log("Database seed completed.");
  console.log("Default users: admin@exam.local, reviewer@exam.local, student@exam.local");
  console.log("Seed completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
