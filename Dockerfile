FROM node:16-buster

WORKDIR /app

COPY package.json .

COPY . .

RUN apt -y update && apt -y install ffmpeg build-essential

RUN npm install
RUN npm test 

CMD [ "npm", "start" ]