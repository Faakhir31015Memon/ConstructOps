import express from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { protect } from '../middleware/auth.middleware.js';

export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXT.includes(ext) ? ext : '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPG, PNG, WEBP or GIF images are allowed'));
  },
});

const router = express.Router();

// @desc    Upload site report photos (multipart) — returns stored URLs
// @route   POST /api/v1/uploads
// @access  Private
router.post('/', protect, (req, res) => {
  upload.array('images', 6)(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    const urls = (req.files || []).map((f) => `/uploads/${f.filename}`);
    res.status(201).json({ success: true, urls });
  });
});

export default router;
