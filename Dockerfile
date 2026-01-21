FROM node:18

# Set working directory to /app
WORKDIR /app

# Copy package.json files for both backend and frontend
# We copy them first to leverage Docker cache for dependencies
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install backend dependencies
WORKDIR /app/backend
RUN npm install

# Install frontend dependencies
WORKDIR /app/frontend
RUN npm install

# Copy the rest of the application code
WORKDIR /app
COPY . .

# Build the frontend
WORKDIR /app/frontend
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Start the backend server
WORKDIR /app
CMD ["node", "backend/server.js"]
