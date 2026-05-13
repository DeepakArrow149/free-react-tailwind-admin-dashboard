/**
 * JWT Token Utilities
 */

import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../../config/index.js';

export interface TokenPayload {
  userId: number;
  email: string;
  name: string;
  role: string;
  companyCode: string;
  companyId?: number;
  branchId?: number;
  branchName?: string;
  branchCode?: string;
  isSuperAdmin?: boolean;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as SignOptions);
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as SignOptions);
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwt.secret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
}
