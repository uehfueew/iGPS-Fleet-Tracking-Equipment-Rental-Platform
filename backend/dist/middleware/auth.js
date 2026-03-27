"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const JWT_SECRET = process.env.JWT_SECRET || 'g3r1n0-pl4tf0rm-s3cr3t';
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token)
        return res.status(401).json({ error: 'Access token required' });
    jsonwebtoken_1.default.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err)
            return res.status(403).json({ error: 'Invalid or expired token' });
        try {
            const user = await db_1.prisma.user.findUnique({ where: { id: decoded.userId } });
            if (!user)
                return res.status(404).json({ error: 'User not found' });
            req.user = user;
            next();
        }
        catch (e) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });
};
exports.authenticateToken = authenticateToken;
const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user || req.user.role !== role) {
            return res.status(403).json({ error: `Requires ${role} role` });
        }
        next();
    };
};
exports.requireRole = requireRole;
