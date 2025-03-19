FROM node:21-alpine As build

WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./

RUN npm ci --force

COPY --chown=node:node . .

RUN npm run build

RUN npm ci --only=production --force && npm cache clean --force

FROM node:21-alpine As production

COPY --chown=node:node --from=build /usr/src/app/dist ./dist
COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules

USER node

ENV NODE_ENV production

CMD [ "node", "--experimental-detect-module", "dist/main.mjs" ]