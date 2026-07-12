import { ApiProperty } from "@nestjs/swagger";

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ example: "Bearer" })
  tokenType: "Bearer";

  @ApiProperty()
  expiresIn: string;
}
