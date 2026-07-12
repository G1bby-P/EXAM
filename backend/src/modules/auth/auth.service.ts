import { randomBytes, createHash } from "crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { RoleCode, UserStatus } from "../../../generated/prisma/client";
import { normalizeEmail } from "../../common/utils/slug";
import { PrismaService } from "../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { LoginDto } from "./dto/login.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";

interface RequestMeta {
  ipAddress?: string;
  userAgent?: string | string[];
}

interface TokenUser {
  id: string;
  email: string;
  roles: RoleCode[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async login(dto: LoginDto, meta: RequestMeta): Promise<AuthResponseDto> {
    const emailNormalized = normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { emailNormalized },
      include: { roles: { include: { role: true } } },
    });
    if (!user || !user.passwordHash || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokenUser: TokenUser = {
      id: user.id,
      email: user.email,
      roles: user.roles.map((item) => item.role.code),
    };

    await this.audit.log({
      actorUserId: user.id,
      action: "AUTH_LOGIN",
      entityType: "user",
      entityId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return this.issueTokenPair(tokenUser, meta);
  }

  async refresh(refreshToken: string, meta: RequestMeta): Promise<AuthResponseDto> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { roles: { include: { role: true } } } } },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt <= new Date()) {
      throw new UnauthorizedException("Invalid refresh token.");
    }
    if (storedToken.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("User is not active.");
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const tokenUser: TokenUser = {
      id: storedToken.user.id,
      email: storedToken.user.email,
      roles: storedToken.user.roles.map((item) => item.role.code),
    };

    await this.audit.log({
      actorUserId: storedToken.user.id,
      action: "AUTH_REFRESH",
      entityType: "refresh_token",
      entityId: storedToken.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return this.issueTokenPair(tokenUser, meta);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!storedToken || storedToken.revokedAt) return;

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({
      actorUserId: storedToken.userId,
      action: "AUTH_LOGOUT",
      entityType: "refresh_token",
      entityId: storedToken.id,
    });
  }

  async hashPassword(password: string): Promise<string> {
    const rounds = this.config.get<number>("BCRYPT_ROUNDS", 12);
    return bcrypt.hash(password, rounds);
  }

  private async issueTokenPair(user: TokenUser, meta: RequestMeta): Promise<AuthResponseDto> {
    const expiresIn = this.config.getOrThrow<string>("JWT_ACCESS_EXPIRES_IN");
    const accessTokenOptions: JwtSignOptions = {
      secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      expiresIn: expiresIn as JwtSignOptions["expiresIn"],
    };
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, roles: user.roles },
      accessTokenOptions,
    );

    const refreshToken = randomBytes(64).toString("base64url");
    const refreshExpiresInDays = this.config.get<number>("JWT_REFRESH_EXPIRES_IN_DAYS", 30);
    const expiresAt = new Date(Date.now() + refreshExpiresInDays * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashRefreshToken(refreshToken),
        ipAddress: meta.ipAddress,
        userAgent: Array.isArray(meta.userAgent) ? meta.userAgent.join(" ") : meta.userAgent,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn,
    };
  }

  private hashRefreshToken(token: string): string {
    return createHash("sha256")
      .update(this.config.getOrThrow<string>("JWT_REFRESH_SECRET"))
      .update(":")
      .update(token)
      .digest("hex");
  }
}
