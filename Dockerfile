FROM node:10-alpine

WORKDIR /usr/src/app

RUN apk upgrade -U \
  && apk add ca-certificates ffmpeg libva-intel-driver \
  && rm -rf /var/cache/*

COPY package*.json ./

RUN npm i

COPY . .

EXPOSE 1935 8000

RUN which ffmpeg

CMD ["node","app.js"]
