FROM node:20
ENV NODE_ENV=development
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# CMD는 docker-compose에서 서비스별로 command로 덮어씀
CMD ["npm", "run", "dev"]
