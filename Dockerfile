FROM node

RUN mkdir -p /usr/src/app
RUN mkdir -p /usr/src/models
WORKDIR /usr/src/app

RUN npm link ../models

COPY package.json /usr/src/app/
RUN npm install
COPY . /usr/src/app

CMD [ "npm", "start" ]