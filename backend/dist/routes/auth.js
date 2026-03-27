"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'g3r1n0-pl4tf0rm-s3cr3t';
router.post('/register', async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const existingUser = await db_1.prisma.user.findUnique({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const userRole = role === 'admin' ? 'admin' : 'client';
        const user = await db_1.prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role: userRole,
            },
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await db_1.prisma.user.findUnique({ where: { username } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const isValidPassword = await bcrypt_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/me', auth_1.authenticateToken, (req, res) => {
    if (!req.user) {
        return res.status(404).json({ error: 'User not found' });
    }
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
});
exports.default = router;
