import { Request } from "express";
import { RoleCode } from "../../../generated/prisma/client";

export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: RoleCode[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
