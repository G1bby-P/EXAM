import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { RoleCode } from "../../../generated/prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AuthenticatedUser } from "../../common/types/authenticated-request";
import { AddExamQuestionDto } from "./dto/add-exam-question.dto";
import { AssignExamDto } from "./dto/assign-exam.dto";
import { CreateSecurityEventDto } from "./dto/create-security-event.dto";
import { CreateExamSectionDto } from "./dto/create-exam-section.dto";
import { CreateExamDto } from "./dto/create-exam.dto";
import { ExamQueryDto } from "./dto/exam-query.dto";
import { SaveAnswerDto } from "./dto/save-answer.dto";
import { UpdateExamDto } from "./dto/update-exam.dto";
import { ExamsService } from "./exams.service";

@ApiBearerAuth()
@ApiTags("Exams")
@Controller()
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get("exams")
  @Roles(RoleCode.ADMIN, RoleCode.REVIEWER)
  list(@Query() query: ExamQueryDto) {
    return this.examsService.list(query);
  }

  @Get("exams/available/me")
  availableForMe(@CurrentUser() user: AuthenticatedUser) {
    return this.examsService.availableForUser(user.id);
  }

  @Get("exams/:id")
  @Roles(RoleCode.ADMIN, RoleCode.REVIEWER)
  findById(@Param("id") id: string) {
    return this.examsService.findById(id);
  }

  @Post("exams")
  @Roles(RoleCode.ADMIN, RoleCode.REVIEWER)
  create(@Body() dto: CreateExamDto, @CurrentUser() user: AuthenticatedUser) {
    return this.examsService.create(dto, user.id);
  }

  @Patch("exams/:id")
  @Roles(RoleCode.ADMIN, RoleCode.REVIEWER)
  update(@Param("id") id: string, @Body() dto: UpdateExamDto, @CurrentUser() user: AuthenticatedUser) {
    return this.examsService.update(id, dto, user.id);
  }

  @Delete("exams/:id")
  @Roles(RoleCode.ADMIN)
  archive(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.examsService.archive(id, user.id);
  }

  @Post("exams/:id/sections")
  @Roles(RoleCode.ADMIN, RoleCode.REVIEWER)
  addSection(@Param("id") id: string, @Body() dto: CreateExamSectionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.examsService.addSection(id, dto, user.id);
  }

  @Post("exams/:id/questions")
  @Roles(RoleCode.ADMIN, RoleCode.REVIEWER)
  addQuestion(@Param("id") id: string, @Body() dto: AddExamQuestionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.examsService.addQuestion(id, dto, user.id);
  }

  @Post("exams/:id/publish")
  @Roles(RoleCode.ADMIN)
  publish(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.examsService.publish(id, user.id);
  }

  @Post("exams/:id/assign")
  @Roles(RoleCode.ADMIN)
  assign(@Param("id") id: string, @Body() dto: AssignExamDto, @CurrentUser() user: AuthenticatedUser) {
    return this.examsService.assign(id, dto, user.id);
  }

  @Post("exam-assignments/:assignmentId/attempts")
  startAttempt(@Param("assignmentId") assignmentId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.examsService.startAttempt(assignmentId, user);
  }

  @Patch("exam-attempts/:attemptId/questions/:questionId/answer")
  saveAnswer(
    @Param("attemptId") attemptId: string,
    @Param("questionId") questionId: string,
    @Body() dto: SaveAnswerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.examsService.saveAnswer(attemptId, questionId, dto, user);
  }

  @Post("exam-attempts/:attemptId/submit")
  submitAttempt(@Param("attemptId") attemptId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.examsService.submitAttempt(attemptId, user);
  }

  @Post("exam-attempts/:attemptId/security-events")
  recordSecurityEvent(
    @Param("attemptId") attemptId: string,
    @Body() dto: CreateSecurityEventDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.examsService.recordSecurityEvent(attemptId, dto, user, {
      ipAddress: this.getClientIp(request),
      userAgent: request.headers["user-agent"],
    });
  }

  @Get("exam-attempts/:attemptId/security-events")
  @Roles(RoleCode.ADMIN, RoleCode.REVIEWER)
  listSecurityEvents(@Param("attemptId") attemptId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.examsService.listSecurityEvents(attemptId, user);
  }

  private getClientIp(request: Request): string | undefined {
    return request.ip;
  }
}
