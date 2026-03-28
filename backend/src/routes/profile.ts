import express from 'express';
import { prisma } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get Company Profile
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const profile = await prisma.companyProfile.findUnique({
      where: { userId: req.user.id }
    });

    res.json(profile || {});
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update or Create Company Profile
router.put('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { 
      name, locations, phoneNumber, description, logoUrl,
      website, taxId, industry, employeeCount, establishedYear 
    } = req.body;
    
    // Validate that required fields exist
    if (!name && !locations && !phoneNumber && !description && !logoUrl && !website && !taxId && !industry) {
      return res.status(400).json({ error: 'No data provided to update' });
    }

    const profile = await prisma.companyProfile.upsert({
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;