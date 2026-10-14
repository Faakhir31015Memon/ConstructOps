# Single-image deploy: one container serves the SPA, the API and /uploads from
# one origin, so a hosted demo needs no CORS allowlist and no second service.

# --- Stage 1: build the Vite SPA ---------------------------------------------
FROM node:20-alpine AS web
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: runtime --------------------------------------------------------
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

# Only production deps — nodemon and the lint toolchain have no business online.
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY backend/src ./src
COPY backend/server.js ./
# backup/restore/seed scripts are how the demo tenant is loaded and how data is
# archived on this box; they cost a few KB and remove a whole class of "I can't
# run the maintenance script in production" surprises.
COPY backend/scripts ./scripts

# The SPA bundle. Must land next to the API because the Express app serves it
# from ./public when it exists.
COPY --from=web /app/dist ./public

# Multer writes report photos to ./uploads at runtime. Non-root user cannot write
# /app otherwise, and a read-only filesystem would break every upload.
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node

EXPOSE 5000
CMD ["node", "server.js"]
