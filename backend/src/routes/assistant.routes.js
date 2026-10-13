import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { assistantChat, assistantSuggestions } from '../controllers/assistant.controller.js';

const router = express.Router();

router.use(protect);

router.post('/chat', assistantChat);
router.get('/suggestions', assistantSuggestions);

export default router;
