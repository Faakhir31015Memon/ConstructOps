import express from 'express';
import path from 'path';
import fs from 'fs';

// Public legal pages (Terms of Service / Privacy Policy), served straight from
// backend/legal/*.html so they exist at one canonical URL before the SPA loads.
const LEGAL_DIR = path.resolve(process.cwd(), 'legal');

const sendLegal = (file) => (_req, res) => {
  const target = path.join(LEGAL_DIR, file);
  if (!fs.existsSync(target)) {
    return res.status(404).type('html').send('<h1>Document not available yet</h1>');
  }
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.type('html').send(fs.readFileSync(target));
};

const router = express.Router();
router.get('/terms', sendLegal('terms.html'));
router.get('/privacy', sendLegal('privacy.html'));

export default router;
