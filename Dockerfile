FROM node:22-alpine
WORKDIR /app
COPY api/package.json api/
RUN cd api && npm install --production
COPY . .
EXPOSE 9000
CMD ["node", "api/server.js"]
