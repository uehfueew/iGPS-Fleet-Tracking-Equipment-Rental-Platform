"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const alerts = await db_1.prisma.alert.findMany({
            orderBy: { timestamp: 'desc' },
            include: { vehicle: true },
            take: 50
        });
        res.json(alerts);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
