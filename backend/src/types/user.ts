// backend/src/types/user.ts

export type UserRole = 'merchant' | 'admin' | 'distributor';

export interface User {
    id: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    phone?: string;
    isActive: boolean;
    emailVerified: boolean;
    lastLoginAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface UserSession {
    userId: string;
    email: string;
    role: UserRole;
    firstName: string;
    lastName: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role?: UserRole;
}

export interface AuthToken {
    token: string;
    expiresAt: string;
    user: UserSession;
}