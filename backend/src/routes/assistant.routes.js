import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { assistantChat, assistantSuggestions, assistantVoiceConfig } from '../controllers/assistant.controller.js';

const router = express.Router();

router.use(protect);

router.post('/chat', assistantChat);
router.get('/suggestions', assistantSuggestions);
router.get('/voice-config', assistantVoiceConfig);

export default router;
