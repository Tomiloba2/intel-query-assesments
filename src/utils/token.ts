import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export interface TokenPayload {
    userId: string;
    role: string;
    type: 'access' | 'refresh';
}

export const generateAccessToken = (user: any): string => {
    return jwt.sign(
        { userId: user.id, role: user.role, type: 'access' },
        JWT_SECRET,
        { expiresIn: '3m' }
    );
};

export const generateRefreshToken = (user: any): string => {
    return jwt.sign(
        { userId: user.id, role: user.role, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '5m' }
    );
};

export const verifyToken = (token: string): TokenPayload => {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
};