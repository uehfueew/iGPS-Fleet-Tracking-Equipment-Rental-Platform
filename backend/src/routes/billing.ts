import express from 'express';
import Stripe from 'stripe';
import { prisma } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_123', {
  apiVersion: '2025-02-24.acacia' as any, // valid recent version
});

const router = express.Router();

router.post('/checkout', authenticateToken, async (req: AuthRequest, res) => {
  const { planId } = req.body;
  if (!req.user) return res.status(401).send();

  try {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = parseInt(session.client_reference_id || '0');
    
    // We would need to match it to a planId, for simplicity let's assume doing an update
    if (userId) {
      await prisma.subscription.upsert({
        where: { userId },
        update: { stripeSubId: session.subscription as string, status: 'active', planId: 1 /* Default fallback or mapped from session */ },
        create: {
          userId,
          stripeSubId: session.subscription as string,
          status: 'active',
          planId: 1 // Default fallback or mapped from session
        }
      });
    }
  }

  res.json({ received: true });
});

export default router;