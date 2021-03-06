FROM mhart/alpine-node:6

MAINTAINER Edouard Fischer <edouard.fischer@gmail.com>

RUN addgroup boilerplate && adduser -D -H -G boilerplate boilerplate

# Create app directory
RUN mkdir -p /usr/src/app && chown -R boilerplate:boilerplate /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install --production

# Bundle app source
COPY . /usr/src/app

USER boilerplate

VOLUME /usr/src/app/env
VOLUME /usr/src/app/templates

EXPOSE 3000
CMD [ "node", "server.js" ]
