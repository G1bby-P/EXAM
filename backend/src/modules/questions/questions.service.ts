import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  Prisma,
  QuestionMediaType,
  QuestionStatus,
  QuestionType,
} from "../../../generated/prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";
import { CreateAlternativeDto, UpdateAlternativeDto } from "./dto/alternative.dto";
import { CreateClinicalCaseDto } from "./dto/clinical-case.dto";
import { CreateQuestionDto } from "./dto/create-question.dto";
import { CreateQuestionMediaDto } from "./dto/question-media.dto";
import { QuestionQueryDto } from "./dto/question-query.dto";
import { UpdateQuestionDto } from "./dto/update-question.dto";
import * as XLSX from "xlsx";

const objectiveTypes = new Set<QuestionType>([
  QuestionType.SINGLE_CHOICE,
  QuestionType.MULTIPLE_CHOICE,
  QuestionType.TRUE_FALSE,
]);

const questionInclude = {
  options: { orderBy: { sortOrder: "asc" } },
  topic: true,
  clinicalCase: true,
  media: { orderBy: { sortOrder: "asc" } },
  tags: { include: { tag: true } },
} satisfies Prisma.QuestionInclude;

type ExcelRow = Record<string, unknown>;

export interface ImportError {
  row: number;
  message: string;
}

@Injectable()
export class QuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: QuestionQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.QuestionWhereInput = {
      topicId: query.topicId,
      type: query.type,
      status: query.status,
      prompt: query.search ? { contains: query.search, mode: "insensitive" } : undefined,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.question.findMany({
        where,
        include: questionInclude,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.question.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findById(id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: questionInclude,
    });
    if (!question) throw new NotFoundException("Question not found.");
    return question;
  }

  async listClinicalCases() {
    return this.prisma.clinicalCase.findMany({
      where: { archivedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  async createClinicalCase(dto: CreateClinicalCaseDto, actorUserId?: string) {
    const clinicalCase = await this.prisma.clinicalCase.create({
      data: {
        title: dto.title.trim(),
        patientContext: dto.patientContext.trim(),
        summary: dto.summary?.trim() || undefined,
        diagnosis: dto.diagnosis?.trim() || undefined,
        createdById: actorUserId,
      },
    });
    await this.audit.log({
      actorUserId,
      action: "CLINICAL_CASE_CREATED",
      entityType: "clinical_case",
      entityId: clinicalCase.id,
    });
    return clinicalCase;
  }

  async create(dto: CreateQuestionDto, actorUserId?: string) {
    this.validateQuestion(dto);
    const question = await this.prisma.$transaction(async (tx) => {
      const clinicalCaseId = await this.resolveClinicalCaseId(tx, dto, actorUserId);
      return tx.question.create({
        data: {
          topicId: dto.topicId,
          clinicalCaseId,
          type: dto.type,
          status: dto.status ?? QuestionStatus.DRAFT,
          prompt: dto.prompt.trim(),
          explanation: dto.explanation?.trim() || undefined,
          defaultPoints: new Prisma.Decimal(dto.defaultPoints ?? 1),
          difficulty: dto.difficulty,
          allowPartialCredit: dto.allowPartialCredit ?? false,
          createdById: actorUserId,
          updatedById: actorUserId,
          archivedAt: dto.status === QuestionStatus.ARCHIVED ? new Date() : undefined,
          options: this.buildAlternativeCreateInput(dto.alternatives),
          media: this.buildMediaCreateInput(dto.media),
        },
        include: questionInclude,
      });
    });
    await this.audit.log({
      actorUserId,
      action: "QUESTION_CREATED",
      entityType: "question",
      entityId: question.id,
    });
    return question;
  }

  async update(id: string, dto: UpdateQuestionDto, actorUserId?: string) {
    const existing = await this.findById(id);
    this.validateQuestionUpdate(existing, dto);
    const question = await this.prisma.question.update({
      where: { id },
      data: {
        topicId: dto.topicId,
        clinicalCaseId: dto.clinicalCaseId,
        type: dto.type,
        status: dto.status,
        prompt: dto.prompt?.trim(),
        explanation: dto.explanation === undefined ? undefined : dto.explanation.trim() || null,
        defaultPoints: dto.defaultPoints === undefined ? undefined : new Prisma.Decimal(dto.defaultPoints),
        difficulty: dto.difficulty,
        allowPartialCredit: dto.allowPartialCredit,
        updatedById: actorUserId,
        archivedAt: dto.status === QuestionStatus.ARCHIVED ? new Date() : dto.status ? null : undefined,
      },
      include: questionInclude,
    });
    await this.audit.log({
      actorUserId,
      action: "QUESTION_UPDATED",
      entityType: "question",
      entityId: id,
    });
    return question;
  }

  async archive(id: string, actorUserId?: string): Promise<void> {
    await this.findById(id);
    await this.prisma.question.update({
      where: { id },
      data: { status: QuestionStatus.ARCHIVED, archivedAt: new Date(), updatedById: actorUserId },
    });
    await this.audit.log({
      actorUserId,
      action: "QUESTION_ARCHIVED",
      entityType: "question",
      entityId: id,
    });
  }

  async createAlternative(questionId: string, dto: CreateAlternativeDto, actorUserId?: string) {
    const question = await this.findById(questionId);
    this.validateObjectiveQuestion(question.type, [
      ...question.options.map((option, index) => this.toAlternativeValidationInput(option, index)),
      dto,
    ]);
    const alternative = await this.prisma.questionOption.create({
      data: {
        questionId,
        label: dto.label,
        text: dto.text,
        isCorrect: dto.isCorrect ?? false,
        sortOrder: dto.sortOrder,
        scoreWeight: dto.scoreWeight === undefined ? undefined : new Prisma.Decimal(dto.scoreWeight),
        feedback: dto.feedback,
      },
    });
    await this.audit.log({
      actorUserId,
      action: "ALTERNATIVE_CREATED",
      entityType: "question_option",
      entityId: alternative.id,
      metadata: { questionId },
    });
    return alternative;
  }

  async updateAlternative(id: string, dto: UpdateAlternativeDto, actorUserId?: string) {
    const existing = await this.prisma.questionOption.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Alternative not found.");
    const question = await this.prisma.question.findUnique({
      where: { id: existing.questionId },
      include: { options: { orderBy: { sortOrder: "asc" } } },
    });
    if (!question) throw new NotFoundException("Question not found.");
    this.validateObjectiveQuestion(
      question.type,
      question.options.map((option, index) =>
        this.toAlternativeValidationInput(option.id === id ? { ...option, ...dto } : option, index),
      ),
    );
    const alternative = await this.prisma.questionOption.update({
      where: { id },
      data: {
        label: dto.label,
        text: dto.text,
        isCorrect: dto.isCorrect,
        sortOrder: dto.sortOrder,
        scoreWeight: dto.scoreWeight === undefined ? undefined : new Prisma.Decimal(dto.scoreWeight),
        feedback: dto.feedback,
      },
    });
    await this.audit.log({
      actorUserId,
      action: "ALTERNATIVE_UPDATED",
      entityType: "question_option",
      entityId: id,
    });
    return alternative;
  }

  async deleteAlternative(id: string, actorUserId?: string): Promise<void> {
    const existing = await this.prisma.questionOption.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Alternative not found.");
    const question = await this.prisma.question.findUnique({
      where: { id: existing.questionId },
      include: { options: { orderBy: { sortOrder: "asc" } } },
    });
    if (!question) throw new NotFoundException("Question not found.");
    this.validateObjectiveQuestion(
      question.type,
      question.options
        .filter((option) => option.id !== id)
        .map((option, index) => this.toAlternativeValidationInput(option, index)),
    );
    await this.prisma.questionOption.delete({ where: { id } });
    await this.audit.log({
      actorUserId,
      action: "ALTERNATIVE_DELETED",
      entityType: "question_option",
      entityId: id,
    });
  }

  async createMedia(questionId: string, dto: CreateQuestionMediaDto, actorUserId?: string) {
    await this.findById(questionId);
    this.validateMedia([dto]);
    const media = await this.prisma.questionMedia.create({
      data: {
        questionId,
        fileAssetId: dto.fileAssetId,
        mediaType: dto.mediaType,
        title: dto.title,
        description: dto.description,
        url: dto.url,
        sortOrder: dto.sortOrder,
      },
    });
    await this.audit.log({
      actorUserId,
      action: "QUESTION_MEDIA_CREATED",
      entityType: "question_media",
      entityId: media.id,
      metadata: { questionId },
    });
    return media;
  }

  async importFromExcel(file: Express.Multer.File | undefined, actorUserId?: string) {
    if (!file) throw new BadRequestException("Excel file is required.");
    if (!/\.(xlsx|xls)$/i.test(file.originalname)) {
      throw new BadRequestException("Only .xlsx or .xls files are supported.");
    }

    const workbook = XLSX.read(file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new BadRequestException("The workbook does not contain sheets.");

    const rows = XLSX.utils.sheet_to_json<ExcelRow>(workbook.Sheets[sheetName], { defval: "" });
    const errors: ImportError[] = [];
    const questionIds: string[] = [];

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2;
      try {
        const dto = this.mapExcelRowToQuestionDto(row, rowNumber);
        const question = await this.create(dto, actorUserId);
        questionIds.push(question.id);
      } catch (error) {
        errors.push({
          row: rowNumber,
          message: error instanceof Error ? error.message : "Unknown import error.",
        });
      }
    }

    await this.audit.log({
      actorUserId,
      action: "QUESTION_BANK_IMPORTED",
      entityType: "question",
      metadata: {
        fileName: file.originalname,
        created: questionIds.length,
        failed: errors.length,
      },
    });

    return {
      created: questionIds.length,
      failed: errors.length,
      errors,
      questionIds,
    };
  }

  private async resolveClinicalCaseId(
    tx: Prisma.TransactionClient,
    dto: CreateQuestionDto,
    actorUserId?: string,
  ): Promise<string | undefined> {
    if (dto.clinicalCaseId) return dto.clinicalCaseId;
    if (!dto.clinicalCase) return undefined;
    const clinicalCase = await tx.clinicalCase.create({
      data: {
        title: dto.clinicalCase.title.trim(),
        patientContext: dto.clinicalCase.patientContext.trim(),
        summary: dto.clinicalCase.summary?.trim() || undefined,
        diagnosis: dto.clinicalCase.diagnosis?.trim() || undefined,
        createdById: actorUserId,
      },
    });
    return clinicalCase.id;
  }

  private buildAlternativeCreateInput(alternatives?: CreateAlternativeDto[]) {
    if (!alternatives?.length) return undefined;
    return {
      create: alternatives.map((alternative) => ({
        label: alternative.label,
        text: alternative.text,
        isCorrect: alternative.isCorrect ?? false,
        sortOrder: alternative.sortOrder,
        scoreWeight: alternative.scoreWeight === undefined ? undefined : new Prisma.Decimal(alternative.scoreWeight),
        feedback: alternative.feedback,
      })),
    };
  }

  private buildMediaCreateInput(media?: CreateQuestionMediaDto[]) {
    if (!media?.length) return undefined;
    return {
      create: media.map((item) => ({
        fileAssetId: item.fileAssetId,
        mediaType: item.mediaType,
        title: item.title,
        description: item.description,
        url: item.url,
        sortOrder: item.sortOrder,
      })),
    };
  }

  private validateQuestion(dto: CreateQuestionDto): void {
    if (!dto.prompt?.trim()) throw new BadRequestException("Question prompt is required.");
    if ((dto.defaultPoints ?? 1) < 0) throw new BadRequestException("Question points cannot be negative.");
    if (dto.difficulty !== undefined && (dto.difficulty < 1 || dto.difficulty > 5)) {
      throw new BadRequestException("Question difficulty must be between 1 and 5.");
    }
    this.validateObjectiveQuestion(dto.type, dto.alternatives ?? []);
    this.validateClinicalCase(dto);
    this.validateMedia(dto.media ?? []);
  }

  private validateQuestionUpdate(
    existing: { type: QuestionType; clinicalCaseId: string | null; options: Array<{ isCorrect: boolean }> },
    dto: UpdateQuestionDto,
  ): void {
    if (dto.prompt !== undefined && !dto.prompt.trim()) throw new BadRequestException("Question prompt is required.");
    if (dto.defaultPoints !== undefined && dto.defaultPoints < 0) {
      throw new BadRequestException("Question points cannot be negative.");
    }
    if (dto.difficulty !== undefined && (dto.difficulty < 1 || dto.difficulty > 5)) {
      throw new BadRequestException("Question difficulty must be between 1 and 5.");
    }

    const nextType = dto.type ?? existing.type;
    const nextClinicalCaseId = dto.clinicalCaseId ?? existing.clinicalCaseId;
    if (nextType === QuestionType.CLINICAL_CASE && !nextClinicalCaseId) {
      throw new BadRequestException("Clinical case questions require clinicalCaseId.");
    }
    this.validateObjectiveQuestion(
      nextType,
      existing.options.map((option, index) => this.toAlternativeValidationInput(option, index)),
    );
  }

  private validateClinicalCase(dto: CreateQuestionDto): void {
    if (dto.clinicalCaseId && dto.clinicalCase) {
      throw new BadRequestException("Use clinicalCaseId or clinicalCase, not both.");
    }
    if (dto.type === QuestionType.CLINICAL_CASE && !dto.clinicalCaseId && !dto.clinicalCase) {
      throw new BadRequestException("Clinical case questions require clinicalCaseId or clinicalCase.");
    }
    if (dto.clinicalCase && (!dto.clinicalCase.title?.trim() || !dto.clinicalCase.patientContext?.trim())) {
      throw new BadRequestException("Clinical case title and patient context are required.");
    }
  }

  private validateMedia(media: CreateQuestionMediaDto[]): void {
    media.forEach((item) => {
      if (!item.fileAssetId && !item.url?.trim()) {
        throw new BadRequestException("Question media requires fileAssetId or url.");
      }
      if (item.url?.trim()) {
        try {
          const parsedUrl = new URL(item.url);
          if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            throw new Error("Unsupported protocol.");
          }
        } catch {
          throw new BadRequestException("Question media url must be a valid http or https URL.");
        }
      }
    });
  }

  private validateObjectiveQuestion(type: QuestionType, alternatives: CreateAlternativeDto[]): void {
    if (!objectiveTypes.has(type)) return;
    if (alternatives.length < 2) {
      throw new BadRequestException("Objective questions require at least two alternatives.");
    }
    if (type === QuestionType.TRUE_FALSE && alternatives.length !== 2) {
      throw new BadRequestException("True/false questions require exactly two alternatives.");
    }
    const correctCount = alternatives.filter((alternative) => alternative.isCorrect).length;
    if ((type === QuestionType.SINGLE_CHOICE || type === QuestionType.TRUE_FALSE) && correctCount !== 1) {
      throw new BadRequestException("Single choice and true/false questions require exactly one correct alternative.");
    }
    if (type === QuestionType.MULTIPLE_CHOICE && correctCount < 1) {
      throw new BadRequestException("Multiple choice questions require at least one correct alternative.");
    }
  }

  private toAlternativeValidationInput(option: { isCorrect?: boolean | null }, index: number): CreateAlternativeDto {
    return {
      text: "validation",
      sortOrder: index + 1,
      isCorrect: option.isCorrect ?? false,
    };
  }

  private mapExcelRowToQuestionDto(row: ExcelRow, rowNumber: number): CreateQuestionDto {
    const type = this.parseQuestionType(this.readText(row, "type", "tipo"));
    const prompt = this.readText(row, "prompt", "pregunta", "enunciado");
    if (!prompt) throw new BadRequestException("prompt is required.");

    const clinicalCaseId = this.readText(row, "clinicalCaseId", "casoClinicoId");
    const alternatives = this.parseExcelAlternatives(row, type);
    const clinicalCase = this.parseExcelClinicalCase(row, type, rowNumber, clinicalCaseId);
    const media = this.parseExcelMedia(row);

    return {
      topicId: this.readText(row, "topicId", "temaId") || undefined,
      clinicalCaseId: clinicalCaseId || undefined,
      type,
      status: this.parseQuestionStatus(this.readText(row, "status", "estado")),
      prompt,
      explanation: this.readText(row, "explanation", "explicacion") || undefined,
      defaultPoints: this.readNumber(row, 1, "defaultPoints", "puntos"),
      difficulty: this.readOptionalNumber(row, "difficulty", "dificultad"),
      allowPartialCredit: this.readBoolean(row, false, "allowPartialCredit", "creditoParcial"),
      alternatives,
      clinicalCase,
      media,
    };
  }

  private parseExcelAlternatives(row: ExcelRow, type: QuestionType): CreateAlternativeDto[] | undefined {
    const optionLabels = ["A", "B", "C", "D", "E", "F"];
    const alternatives = optionLabels
      .map((label, index): CreateAlternativeDto | undefined => {
        const text = this.readText(row, `option${label}`, `opcion${label}`, `alternative${label}`);
        if (!text) return undefined;
        return {
          label,
          text,
          isCorrect: this.readBoolean(row, false, `option${label}IsCorrect`, `option${label}Correct`, `opcion${label}Correcta`),
          sortOrder: index + 1,
        };
      })
      .filter((alternative): alternative is CreateAlternativeDto => alternative !== undefined);

    if (type === QuestionType.TRUE_FALSE && alternatives.length === 0) {
      const correctAnswer = this.readText(row, "correctAnswer", "respuestaCorrecta");
      const trueIsCorrect = this.normalizeToken(correctAnswer) === "TRUE" || this.normalizeToken(correctAnswer) === "VERDADERO";
      const falseIsCorrect = this.normalizeToken(correctAnswer) === "FALSE" || this.normalizeToken(correctAnswer) === "FALSO";
      return [
        { label: "V", text: "Verdadero", isCorrect: trueIsCorrect, sortOrder: 1 },
        { label: "F", text: "Falso", isCorrect: falseIsCorrect, sortOrder: 2 },
      ];
    }

    return alternatives.length > 0 ? alternatives : undefined;
  }

  private parseExcelClinicalCase(
    row: ExcelRow,
    type: QuestionType,
    rowNumber: number,
    clinicalCaseId: string,
  ): CreateClinicalCaseDto | undefined {
    const title = this.readText(row, "clinicalCaseTitle", "casoClinicoTitulo");
    const patientContext = this.readText(row, "clinicalCaseText", "clinicalCasePatientContext", "casoClinicoTexto");
    const summary = this.readText(row, "clinicalCaseSummary", "casoClinicoResumen");
    const diagnosis = this.readText(row, "clinicalCaseDiagnosis", "casoClinicoDiagnostico");

    if (!title && !patientContext && clinicalCaseId) return undefined;
    if (!title && !patientContext && type !== QuestionType.CLINICAL_CASE) return undefined;
    if (!title || !patientContext) {
      throw new BadRequestException(`Clinical case title and text are required in row ${rowNumber}.`);
    }
    return { title, patientContext, summary: summary || undefined, diagnosis: diagnosis || undefined };
  }

  private parseExcelMedia(row: ExcelRow): CreateQuestionMediaDto[] | undefined {
    const mediaTypeText = this.readText(row, "mediaType", "tipoMedio");
    const url = this.readText(row, "mediaUrl", "urlMedio");
    const fileAssetId = this.readText(row, "mediaFileAssetId", "archivoId");
    const title = this.readText(row, "mediaTitle", "tituloMedio");
    const description = this.readText(row, "mediaDescription", "descripcionMedio");

    if (!mediaTypeText && !url && !fileAssetId && !title && !description) return undefined;
    return [
      {
        fileAssetId: fileAssetId || undefined,
        mediaType: this.parseMediaType(mediaTypeText),
        title: title || undefined,
        description: description || undefined,
        url: url || undefined,
        sortOrder: this.readNumber(row, 1, "mediaSortOrder", "ordenMedio"),
      },
    ];
  }

  private parseQuestionType(value: string): QuestionType {
    const normalized = this.normalizeToken(value);
    const map: Record<string, QuestionType> = {
      SINGLE_CHOICE: QuestionType.SINGLE_CHOICE,
      OPCION_MULTIPLE: QuestionType.SINGLE_CHOICE,
      MULTIPLE_CHOICE: QuestionType.MULTIPLE_CHOICE,
      SELECCION_MULTIPLE: QuestionType.MULTIPLE_CHOICE,
      TRUE_FALSE: QuestionType.TRUE_FALSE,
      VERDADERO_FALSO: QuestionType.TRUE_FALSE,
      VF: QuestionType.TRUE_FALSE,
      SHORT_TEXT: QuestionType.SHORT_TEXT,
      RESPUESTA_CORTA: QuestionType.SHORT_TEXT,
      ESSAY: QuestionType.ESSAY,
      DESARROLLO: QuestionType.ESSAY,
      FILE_UPLOAD: QuestionType.FILE_UPLOAD,
      ARCHIVO: QuestionType.FILE_UPLOAD,
      CLINICAL_CASE: QuestionType.CLINICAL_CASE,
      CASO_CLINICO: QuestionType.CLINICAL_CASE,
      CASOS_CLINICOS: QuestionType.CLINICAL_CASE,
    };
    const type = map[normalized];
    if (!type) throw new BadRequestException(`Unsupported question type: ${value || "(blank)"}.`);
    return type;
  }

  private parseQuestionStatus(value: string): QuestionStatus | undefined {
    if (!value) return undefined;
    const normalized = this.normalizeToken(value);
    if (normalized in QuestionStatus) return QuestionStatus[normalized as keyof typeof QuestionStatus];
    throw new BadRequestException(`Unsupported question status: ${value}.`);
  }

  private parseMediaType(value: string): QuestionMediaType {
    const normalized = this.normalizeToken(value);
    const map: Record<string, QuestionMediaType> = {
      IMAGE: QuestionMediaType.IMAGE,
      IMAGEN: QuestionMediaType.IMAGE,
      VIDEO: QuestionMediaType.VIDEO,
      AUDIO: QuestionMediaType.AUDIO,
      PDF: QuestionMediaType.PDF,
      DOCUMENTO: QuestionMediaType.PDF,
    };
    const type = map[normalized];
    if (!type) throw new BadRequestException(`Unsupported media type: ${value || "(blank)"}.`);
    return type;
  }

  private readText(row: ExcelRow, ...keys: string[]): string {
    for (const key of keys) {
      const direct = row[key];
      const normalizedEntry = Object.entries(row).find(([candidate]) => this.normalizeToken(candidate) === this.normalizeToken(key));
      const value = direct ?? normalizedEntry?.[1];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return String(value).trim();
      }
    }
    return "";
  }

  private readNumber(row: ExcelRow, fallback: number, ...keys: string[]): number {
    const value = this.readText(row, ...keys);
    if (!value) return fallback;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) throw new BadRequestException(`${keys[0]} must be numeric.`);
    return parsed;
  }

  private readOptionalNumber(row: ExcelRow, ...keys: string[]): number | undefined {
    const value = this.readText(row, ...keys);
    if (!value) return undefined;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) throw new BadRequestException(`${keys[0]} must be numeric.`);
    return parsed;
  }

  private readBoolean(row: ExcelRow, fallback: boolean, ...keys: string[]): boolean {
    const value = this.readText(row, ...keys);
    if (!value) return fallback;
    const normalized = this.normalizeToken(value);
    if (["TRUE", "SI", "S", "YES", "Y", "1", "VERDADERO"].includes(normalized)) return true;
    if (["FALSE", "NO", "N", "0", "FALSO"].includes(normalized)) return false;
    throw new BadRequestException(`${keys[0]} must be boolean.`);
  }

  private normalizeToken(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }
}
