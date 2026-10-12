FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY server.js ./
USER node
ENV PORT=8080
CMD ["node", "server.js"]
