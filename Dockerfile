#########################
# Local Development Build
#########################
FROM node:23-alpine AS dev

RUN corepack enable

# Create app directory
WORKDIR /app


COPY .yarnrc.yml ./

# Copy dependencies
COPY package.json yarn.lock ./

# Install dependencies (this will install rimraf if it's in devDependencies)
RUN yarn install

# Copy Project
COPY . .

USER node


######################
# Build for Production
######################
FROM node:23-alpine AS build

RUN corepack enable

WORKDIR /app

COPY .yarnrc.yml ./

COPY package.json yarn.lock ./
RUN yarn install

COPY . .

# If rimraf is in devDependencies, it should be installed at this point.
RUN yarn build

# Set NODE_ENV to production (only AFTER building, so devDependencies don’t get removed prematurely)
ENV NODE_ENV=production

# Prune dev dependencies, focusing only on what's needed for production
RUN yarn workspaces focus --all --production && yarn cache clean

USER node


############
# Deployment
############
FROM node:23-alpine AS production

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

CMD ["node", "dist/src/main.js"]
