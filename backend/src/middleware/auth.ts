// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            user?: UserSession;
        }
    }
}

interface UserSession {
    userId: string;
    email: string;
    role: 'merchant' | 'admin' | 'distributor';
    firstName: string;
    lastName: string;
}

interface JwtPayload extends UserSession {
    iat: number;
    exp: number;
}

export const authenticate = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedError(
                'Authentication token required',
                'NO_TOKEN'
            );
        }

        const token = authHeader.replace('Bearer ', '');
        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

        const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            firstName: decoded.firstName,
            lastName: decoded.lastName
        };

        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid or expired token'
                }
            });
            return;
        }

        if (error instanceof UnauthorizedError) {
            res.status(error.statusCode).json(error.toJSON());
            return;
        }

        res.status(500).json({
            success: false,
            error: {
                code: 'AUTH_ERROR',
                message: 'Authentication failed'
            }
        });
    }
};

export const authorize = (...roles: Array<'merchant' | 'admin' | 'distributor'>) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            throw new UnauthorizedError(
                'Authentication required',
                'NOT_AUTHENTICATED'
            );
        }

        if (!roles.includes(req.user.role)) {
            throw new ForbiddenError(
                'Insufficient permissions',
                'FORBIDDEN'
            );
        }

        next();
    };
};