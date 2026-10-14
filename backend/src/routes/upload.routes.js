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

const fileFilter = (_req, file, cb) => {
  if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) return cb(null, true);
  cb(new Error('Only JPG, PNG, WEBP or GIF images are allowed'));
};

const limits = { fileSize: 5 * 1024 * 1024, files: 6 };
const diskUpload = multer({ storage, limits, fileFilter });
const memoryUpload = multer({ storage: multer.memoryStorage(), limits, fileFilter });

// Cloud persistence: when CLOUDINARY_* env vars are set, photos are pushed to
// Cloudinary and served from their CDN. Without them we keep local-disk behavior
// (dev/demo). Deployed instances MUST set these — ephemeral disk loses uploads.
const cloudinaryConfigured = () =>
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

const cloudinarySign = (params) => {
  const toSign = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&');
  return crypto.createHash('sha1').update(toSign + process.env.CLOUDINARY_API_SECRET).digest('hex');
};

const cloudinaryUpload = async (file) => {
  const ext = ALLOWED_EXT.includes(path.extname(file.originalname).toLowerCase())
    ? path.extname(file.originalname).toLowerCase()
    : '.jpg';
  const params = {
    folder: 'constructops/reports',
    public_id: `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`,
    timestamp: Math.floor(Date.now() / 1000),
    api_key: process.env.CLOUDINARY_API_KEY,
  };
  params.signature = cloudinarySign(params);

  const form = new FormData();
  form.append('file', new Blob([file.buffer], { type: file.mimetype }), `photo${ext}`);
  for (const [key, value] of Object.entries(params)) form.append(key, String(value));

  const url = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;
  const response = await fetch(url, { method: 'POST', body: form });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.secure_url) {
    throw new Error(body.error?.message || `Cloudinary rejected upload (HTTP ${response.status})`);
  }
  return body.secure_url;
};

const router = express.Router();

// @desc    Upload site report photos (multipart) — returns stored URLs
// @route   POST /api/v1/uploads
// @access  Private
router.post('/', protect, (req, res) => {
  const useCloud = cloudinaryConfigured();
  const handler = useCloud ? memoryUpload.array('images', 6) : diskUpload.array('images', 6);

  handler(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ success: false, message: 'No image files received' });

    try {
      const urls = useCloud
        ? await Promise.all(files.map(cloudinaryUpload))
        : files.map((f) => `/uploads/${f.filename}`);
      res.status(201).json({ success: true, urls, storage: useCloud ? 'cloudinary' : 'local' });
    } catch (error) {
      res.status(502).json({ success: false, message: `Photo storage failed: ${error.message}` });
    }
  });
});

export default router;
