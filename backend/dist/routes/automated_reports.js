"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
// Get all automated reports
router.get('/', async (req, res) => {
    try {
        const reports = await db_1.prisma.automatedReport.findMany({
            include: { creator: true }
        });
        res.json(reports);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Create automated report
router.post('/', async (req, res) => {
    try {
        const { name, type, schedule, emailList, createdById } = req.body;
        // fallback createdById if not provided to the active user's id (req.user is set by authenticateToken but we haven't typed it strongly here)
        const userId = createdById || req.user.id;
        const report = await db_1.prisma.automatedReport.create({
            data: { name, type, schedule, emailList, createdById: userId }
        });
        res.json(report);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Delete automated report
router.delete('/:id', async (req, res) => {
    try {
        await db_1.prisma.automatedReport.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Update automated report
router.patch('/:id', async (req, res) => {
    try {
        const { emailList } = req.body;
        const report = await db_1.prisma.automatedReport.update({
            where: { id: parseInt(req.params.id) },
            data: { emailList }
        });
        res.json(report);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
