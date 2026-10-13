// Shared list pagination: ?page=1&limit=100 (limit capped at maxLimit).
export const parsePagination = (req, { defaultLimit = 100, maxLimit = 500 } = {}) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const parsed = parseInt(req.query.limit, 10);
  const limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, maxLimit) : defaultLimit;
  return { page, limit, skip: (page - 1) * limit };
};

export const paginationMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.max(1, Math.ceil(total / limit)),
});
