# syntax=docker/dockerfile:1

# Stage 1: build the Vite static bundle
FROM node:20-alpine AS build
WORKDIR /app

# Supabase wiring baked into the static bundle at build time. Defaults target
# the local self-hosted Supabase; the anon key is public by design. Override:
#   docker build --build-arg VITE_SUPABASE_ANON_KEY="$(cat scripts/.roboheard-anon-key.txt)" ...
ARG VITE_SUPABASE_URL=http://localhost:8000
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Install dependencies. The committed package-lock.json is out of sync with
# package.json (missing react-markdown & friends), so `npm ci` fails — use
# `npm install`, which resolves and updates the lockfile inside the image.
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

# Copy the rest of the source and build the production bundle
COPY . .
RUN npm run build

# Stage 2: serve the static bundle with nginx
FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
