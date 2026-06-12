# Use Node.js LTS (Alpine for a smaller footprint)
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install only production dependencies (skips electron and electron-builder)
RUN npm install --omit=dev --legacy-peer-deps

# Bundle app source
COPY . .

# Your app binds to port 5500 by default (via process.env.PORT)
EXPOSE 5500

# Start the Node server (NOT the electron main.js)
CMD [ "node", "server.js" ]
