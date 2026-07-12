import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { RoleCode } from "../../../generated/prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AuthenticatedUser } from "../../common/types/authenticated-request";
import { CreateAlternativeDto, UpdateAlternativeDto } from "./dto/alternative.dto";
import { CreateClinicalCaseDto } from "./dto/clinical-case.dto";
import { CreateQuestionDto } from "./dto/create-question.dto";
import { CreateQuestionMediaDto } from "./dto/question-media.dto";
import { QuestionQueryDto } from "./dto/question-query.dto";
import { UpdateQuestionDto } from "./dto/update-question.dto";
import { QuestionsService } from "./questions.service";

@ApiBearerAuth()
@ApiTags("Questions")
@Controller("questions")
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  list(@Query() query: QuestionQueryDto) {
    return this.questionsService.list(query);
  }

  @Get("clinical-cases")
  listClinicalCases() {
    return this.questionsService.listClinicalCases();
  }

  @Post("clinical-cases")
  @Roles(RoleCode.ADMIN, RoleCode.REVIEWER)
  createClinicalCase(@Body() dto: CreateClinicalCaseDto, @CurrentUser() user: AuthenticatedUser) {
    return this.questionsService.createClinicalCase(dto, user.id);
  }

  @Post("import/excel")
  @Roles(RoleCode.ADMIN, RoleCode.REVIEWER)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "Archivo .xlsx o .xls con la plantilla del banco de preguntas.",
        },
      },
    },
  })
  importExcel(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthenticatedUser) {
    return this.questionsService.importFromExcel(file, user.id);
  }

  @Get(":id")
  findById(@Param("id") id: string) {
    return this.questionsService.findById(id);
  }

  @Post()
  @Roles(RoleCode.ADMIN, RoleCode.REVIEWER)
  create(@Body() dto: CreateQuestionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.questionsService.create(dto, user.id);
  }

  @Patch(":id")
  @Roles(RoleCode.ADMIN, RoleCode.REVIEWER)
  update(@Param("id") id: string, @Body() dto: UpdateQuestionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.questionsService.update(id, dto, user.id);
  }

  @Delete(":id")
  @Roles(RoleCode.ADMIN)
  archive(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.questionsService.archive(id, user.id);
  }

  @Post(":id/alternatives")
  @Roles(RoleCode.ADMIN, RoleCode.REVIEWER)
  createAlternative(@Param("id") questionId: string, @Body() dto: CreateAlternativeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.questionsService.createAlternative(questionId, dto, user.id);
  }

  @Post(":id/media")
  @Roles(RoleCode.ADMIN, RoleCode.REVIEWER)
  createMedia(@Param("id") questionId: string, @Body() dto: CreateQuestionMediaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.questionsService.createMedia(questionId, dto, user.id);
  }

  @Patch("alternatives/:id")
  @Roles(RoleCode.ADMIN, RoleCode.REVIEWER)
  updateAlternative(@Param("id") id: string, @Body() dto: UpdateAlternativeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.questionsService.updateAlternative(id, dto, user.id);
  }

  @Delete("alternatives/:id")
  @Roles(RoleCode.ADMIN, RoleCode.REVIEWER)
  deleteAlternative(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.questionsService.deleteAlternative(id, user.id);
  }
}
