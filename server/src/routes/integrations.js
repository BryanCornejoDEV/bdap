import { Router } from 'express';
import { authMiddleware } from '../utils/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/google-analytics/kpis', (_req, res) => {
  res.json({ sessions: 12034, users: 9812, bounceRate: 0.42, avgSession: 154 });
});

router.get('/stripe/revenue', (_req, res) => {
  res.json({ currency: 'USD', total: 123456, mrr: 18999, arr: 18999 * 12 });
});

router.get('/hubspot/leads', (_req, res) => {
  res.json([
    { id: 1, name: 'Acme Inc', status: 'OPEN', owner: 'Ana' },
    { id: 2, name: 'Globex', status: 'WON', owner: 'Luis' },
  ]);
});

export default router;
