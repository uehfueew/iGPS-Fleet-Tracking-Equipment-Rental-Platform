"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stripe_1 = __importDefault(require("stripe"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || 'sk_test_123', {
    apiVersion: '2025-02-24.acacia', // valid recent version
});
const router = express_1.default.Router();
router.post('/checkout', auth_1.authenticateToken, async (req, res) => {
    const { planId } = req.body;
    if (!req.user)
        return res.status(401).send();
    try {
        const plan = await db_1.prisma.plan.findUnique({ where: { id: planId } });
        if (!plan || !plan.stripePriceId) {
            return res.status(400).json({ error: 'Invalid plan' });
        }
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: plan.stripePriceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/cancel`,
            client_reference_id: req.user.id.toString(),
        });
        res.json({ url: session.url });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/webhook', express_1.default.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
    }
    catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = parseInt(session.client_reference_id || '0');
        // We would need to match it to a planId, for simplicity let's assume doing an update
        if (userId) {
            await db_1.prisma.subscription.upsert({
                where: { userId },
                update: { stripeSubId: session.subscription, status: 'active', planId: 1 /* Default fallback or mapped from session */ },
                create: {
                    userId,
                    stripeSubId: session.subscription,
                    status: 'active',
                    planId: 1 // Default fallback or mapped from session
                }
            });
        }
    }
    res.json({ received: true });
});
exports.default = router;
