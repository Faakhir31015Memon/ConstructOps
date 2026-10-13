// Loads .env before anything reads process.env (ESM imports run before module bodies).
import dotenv from 'dotenv';

dotenv.config();
