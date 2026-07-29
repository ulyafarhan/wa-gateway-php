FROM node:24-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY package.json package-lock.json ./
RUN npm ci --production && npm cache clean --force
COPY . .
RUN rm -rf frontend/src frontend/node_modules test
EXPOSE 2785
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.mjs"]
