# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY public ./public
COPY src ./src

# Build the React app
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install a simple HTTP server
RUN npm install -g serve

# Copy built app from builder
COPY --from=builder /app/build ./build

# Expose port
EXPOSE 3000

# Set environment variables
ENV REACT_APP_API_BASE_URL=http://auth-service:3001
ENV REACT_APP_GAME_SERVICE_URL=http://game-service:3002
ENV REACT_APP_ORDERS_SERVICE_URL=http://orders-service:3003
ENV REACT_APP_REVIEWS_SERVICE_URL=http://reviews-service:3004

# Start the app
CMD ["serve", "-s", "build", "-l", "3000"]
