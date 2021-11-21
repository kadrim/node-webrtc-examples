FROM node:16-buster

RUN apt -y update && apt -y install ffmpeg build-essential

WORKDIR /app

COPY package.json .

COPY . .

RUN npm install
RUN npm test 

CMD [ "npm", "start" ]