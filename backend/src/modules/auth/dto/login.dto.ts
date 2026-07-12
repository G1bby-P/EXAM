import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "admin@exam.local" })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8, example: "replace-with-user-password" })
  @IsString()
  @MinLength(8)
  password: string;
}
