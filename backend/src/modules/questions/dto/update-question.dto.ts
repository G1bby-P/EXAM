import { OmitType, PartialType } from "@nestjs/mapped-types";
import { CreateQuestionDto } from "./create-question.dto";

export class UpdateQuestionDto extends PartialType(OmitType(CreateQuestionDto, ["alternatives", "clinicalCase", "media"] as const)) {}
