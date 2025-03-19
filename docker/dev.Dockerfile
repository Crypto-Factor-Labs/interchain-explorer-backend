FROM node:21-alpine

WORKDIR /usr/src/app

COPY package.json ./
COPY package-lock.json ./

RUN npm ci --dev --force

COPY . ./

EXPOSE 80

CMD ["npm", "run", "start:dev"]
