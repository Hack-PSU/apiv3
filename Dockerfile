#########################
# Local Development Build
#########################

FROM node:23-alpine AS dev

# Create app directory
WORKDIR /app

# Copy dependencies
COPY package.json ./
COPY yarn.lock ./

# Install dependencies to cache step
RUN yarn install

# Copy Project
COPY . .

USER node

######################
# Build for Production
######################

FROM node:18-alpine AS build

WORKDIR /app

COPY package.json ./
COPY yarn.lock ./

# Copy over dependencies from previous step
COPY --from=dev /app/node_modules ./node_modules

COPY . .

RUN yarn build

# Set NODE_ENV to production to tell yarn to consider it a production installation with production dependencies.
# (even though this may actually be building the staging version)
ENV NODE_ENV production

RUN yarn install --prod && yarn cache clean

USER node

############
# Deployment
############

FROM node:18-alpine AS production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

CMD ["node", "dist/src/main.js"]
