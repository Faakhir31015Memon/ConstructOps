import logger from './logger.js';

// Controllers must never forward error.message to the browser — it can contain
// collection names, file paths, or query contents.
export const GENERIC_SERVER_ERROR = 'Something went wrong on our side. Please try again.';

export const serverError = (res, error, req, context = {}) => {
  logger.error(error?.message || 'Unhandled controller error', {
    ...context,
    stack: error?.stack,
    method: req?.method,
    path: req?.originalUrl,
    userId: req?.user?._id,
    companyId: req?.user?.companyId?._id || req?.user?.companyId,
  });
  res.status(500).json({ success: false, message: GENERIC_SERVER_ERROR });
};

export default serverError;
