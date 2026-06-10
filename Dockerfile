FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssh-client putty-tools \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /app/data && chown -R node:node /app

USER node

ENV HOST=0.0.0.0 \
    PORT=8787

EXPOSE 8787

CMD ["npm", "start"]
