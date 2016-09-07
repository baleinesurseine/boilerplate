#FROM node:6
FROM mhart/alpine-node:6

MAINTAINER Edouard Fischer <edouard.fischer@gmail.com>

#RUN groupadd -r boilerplate && useradd -r -g boilerplate boilerplate

# Create app directory
RUN mkdir -p /usr/src/app && chown -R nobody:nogroup /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install --production

# Bundle app source
COPY . /usr/src/app

USER nobody

VOLUME /usr/src/app/env
VOLUME /usr/src/app/templates

EXPOSE 3000
CMD [ "node", "server.js" ]
