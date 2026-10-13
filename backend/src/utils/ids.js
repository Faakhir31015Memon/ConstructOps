const normalize = (v) => {
  if (v == null) return null;
  if (v._id) return String(v._id);
  return String(v);
};

// Populated Mongoose documents do not stringify to their ObjectId hex;
// comparisons must resolve _id first or every tenant check silently mismatches.
export const sameId = (a, b) => {
  const na = normalize(a);
  const nb = normalize(b);
  return na !== null && nb !== null && na === nb;
};
