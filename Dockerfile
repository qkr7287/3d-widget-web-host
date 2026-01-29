FROM node:24.13.0
ENV NODE_ENV=development
WORKDIR /app
# workspace package.json들이 있어야 npm ci가 vite 등 의존성 설치함
COPY package.json package-lock.json ./
COPY apps/ apps/
RUN npm ci \
  && npm install @rollup/rollup-linux-x64-gnu --no-save
COPY . .
# CMD는 docker-compose에서 서비스별로 command로 덮어씀
CMD ["npm", "run", "dev:compare"]
