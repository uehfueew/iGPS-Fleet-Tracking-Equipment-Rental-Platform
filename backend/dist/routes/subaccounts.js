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
// Get all subaccounts
router.get('/', async (req, res) => {
    try {
        const subaccounts = await db_1.prisma.subaccount.findMany({ include: { users: true, groups: true } });
        res.json(subaccounts);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Create subaccount
router.post('/', async (req, res) => {
    try {
        const { name, parentId } = req.body;
        const subaccount = await db_1.prisma.subaccount.create({
            data: { name, parentId: parentId || null }
        });
        res.json(subaccount);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
