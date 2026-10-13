export const pick = (source, fields) => {
  const out = {};
  for (const field of fields) {
    if (source[field] !== undefined) {
      out[field] = source[field];
    }
  }
  return out;
};
