FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssh-client putty-tools gosu \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /app/data && chown -R node:node /app \
  && chmod +x /app/docker-entrypoint.sh

# Starts as root so the entrypoint can align the node user to the host UID/GID
# and lock down the shared keys folder, then drops to node before running npm.
ENV HOST=0.0.0.0 \
    PORT=8787

EXPOSE 8787

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["npm", "start"]
