"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get Company Profile
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const profile = await db_1.prisma.companyProfile.findUnique({
            where: { userId: req.user.id }
        });
        res.json(profile || {});
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Update or Create Company Profile
router.put('/', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { name, locations, phoneNumber, description, logoUrl, website, taxId, industry, employeeCount, establishedYear } = req.body;
        // Validate that required fields exist
        if (!name && !locations && !phoneNumber && !description && !logoUrl && !website && !taxId && !industry) {
            return res.status(400).json({ error: 'No data provided to update' });
        }
        const profile = await db_1.prisma.companyProfile.upsert({
            where: { userId: req.user.id },
            update: {
                name,
                locations,
                phoneNumber,
                description,
                website,
                taxId,
                industry,
                employeeCount,
                establishedYear: establishedYear ? parseInt(establishedYear, 10) : null,
                ...(logoUrl !== undefined ? { logoUrl } : {})
            },
            create: {
                userId: req.user.id,
                name: name || 'My Company',
                locations: locations || '',
                phoneNumber: phoneNumber || '',
                description: description || '',
                website: website || '',
                taxId: taxId || '',
                industry: industry || '',
                employeeCount: employeeCount || '',
                establishedYear: establishedYear ? parseInt(establishedYear, 10) : null,
                logoUrl: logoUrl || null
            }
        });
        res.json(profile);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
