FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY . .

EXPOSE 3000

# Run migrations then start server
CMD ["sh", "-c", "node src/db/migrate.js && node src/index.js"]