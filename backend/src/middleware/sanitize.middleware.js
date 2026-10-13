import mongoose from 'mongoose';

// Strips Mongo operator keys ($gt, $ne, ...) and dot-path tricks from any
// client-supplied object so untrusted input can never become a query operator.
const stripOperators = (value) => {
  if (Array.isArray(value)) {
    value.forEach(stripOperators);
    return value;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete value[key];
      } else {
        stripOperators(value[key]);
      }
    }
    return value;
  }
  return value;
};

// Express merges query params into a plain object prototype — mutate in place.
const sanitizeReq = (req, _res, next) => {
  stripOperators(req.query);
  if (req.body && typeof req.body === 'object') stripOperators(req.body);
  next();
};

// Accepts only a real ObjectId string; returns null otherwise.
export const toObjectId = (value) => {
  const str = typeof value === 'string' ? value.trim() : '';
  return mongoose.Types.ObjectId.isValid(str) && str.length === 24 ? new mongoose.Types.ObjectId(str) : null;
};

// For enum-like filter strings (status, category, ...) — plain text only.
export const toSafeEnum = (value, allowed) => {
  const str = typeof value === 'string' ? value.trim() : '';
  return allowed.includes(str) ? str : null;
};

// Escapes regex metacharacters before a value is embedded in a RegExp.
export const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default sanitizeReq;
