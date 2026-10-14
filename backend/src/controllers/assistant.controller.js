import {
  LANGUAGES,
  normalizeLang,
  buildAssistantContext,
  answerWithLLM,
  answerWithKnowledge,
  llmAvailable,
  roleSuggestions,
} from '../services/assistant.service.js';
import logger from '../utils/logger.js';

const MAX_MESSAGES = 12;
const MAX_CONTENT_LENGTH = 1000;

const sanitizeMessages = (messages) => {
  if (!Array.isArray(messages)) return null;
  const cleaned = messages
    .filter(
      (m) =>
        m &&
        ['user', 'assistant'].includes(m.role) &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0 &&
        m.content.length <= MAX_CONTENT_LENGTH,
    )
    .slice(-MAX_MESSAGES);
  return cleaned.length ? cleaned : null;
};

// @desc    Chat with the role-aware ConstructOps assistant
// @route   POST /api/v1/assistant/chat
// @access  Private (any company user)
export const assistantChat = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'System admin does not have a company workspace to assist with.' });
    }

    const messages = sanitizeMessages(req.body.messages);
    if (!messages) {
      return res.status(400).json({ success: false, message: `messages array required (max ${MAX_MESSAGES} turns, ${MAX_CONTENT_LENGTH} chars each).` });
    }

    const lang = normalizeLang(req.body.lang);
    const context = await buildAssistantContext(req.user);
    const lastQuestion = messages[messages.length - 1].content;

    if (llmAvailable()) {
      try {
        const reply = await answerWithLLM({ messages, context, lang });
        if (reply) {
          return res.json({ success: true, reply, lang, source: 'llm' });
        }
      } catch (error) {
        logger.error("Assistant LLM call failed, using built-in knowledge", { error: error.message });
      }
    }

    res.json({ success: true, reply: answerWithKnowledge(lastQuestion, context, lang), lang, source: 'knowledge' });
  } catch (error) {
    logger.error("Assistant chat error", { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Assistant is unavailable right now.' });
  }
};

// @desc    Quick starter questions for the chat widget
// @route   GET /api/v1/assistant/suggestions
// @access  Private
export const assistantSuggestions = async (req, res) => {
  res.json({ success: true, suggestions: roleSuggestions(req.user.role, normalizeLang(req.query.lang)) });
};

// @desc    Languages the assistant can answer/speak in, plus browser voice locales
// @route   GET /api/v1/assistant/voice-config
// @access  Private
export const assistantVoiceConfig = async (req, res) => {
  const current = normalizeLang(req.query.lang);
  res.json({
    success: true,
    languages: Object.entries(LANGUAGES).map(([code, meta]) => ({ code, ...meta, isCurrent: code === current })),
    speech: {
      recognitionLocale: LANGUAGES[current].speechLocale,
      synthesisLocale: LANGUAGES[current].speechLocale,
    },
  });
};
