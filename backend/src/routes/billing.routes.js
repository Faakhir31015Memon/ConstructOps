import express from 'express';
import { PAK_BANKS } from '../config/pakBanks.js';
import { getGatewayAvailability, verifyWebhookSignature } from '../services/paymentGateway.service.js';
import { handleGatewayWebhook } from '../controllers/gatewayWebhook.controller.js';
import { webhookLimiter } from '../middleware/rateLimiters.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Public: list of accepted Pakistani banks for transfers
router.get('/banks', (req, res) => {
  res.json({ success: true, banks: PAK_BANKS });
});

// Public: which live checkout providers are configured in this environment
router.get('/gateway-status', (req, res) => {
  res.json({ success: true, providers: getGatewayAvailability() });
});

// Provider-to-server callback. Authenticity is proven by the HMAC signature
// over the raw body — this route must stay unauthenticated by user tokens.
router.post('/gateway/webhook/:provider', webhookLimiter, async (req, res) => {
  if (!['jazzcash', 'easypaisa'].includes(req.params.provider)) {
    return res.status(404).json({ success: false, message: 'Unknown gateway provider' });
  }
  try {
    const rawBody = req.rawBody ?? JSON.stringify(req.body || {});
    if (!verifyWebhookSignature(rawBody, req.get('X-ConstructOps-Signature'))) {
      return res.status(401).json({ success: false, message: 'Invalid or missing webhook signature' });
    }
    const payload = req.body && Object.keys(req.body).length ? req.body : JSON.parse(rawBody || '{}');
    const result = await handleGatewayWebhook({ provider: req.params.provider, payload });
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Gateway webhook rejected', { provider: req.params.provider, error: error.message });
    res.status(400).json({ success: false, message: 'Webhook processing failed.' });
  }
});

export default router;
