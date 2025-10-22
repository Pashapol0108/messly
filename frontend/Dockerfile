
FROM node:16


WORKDIR /app


COPY package.json package-lock.json /app/


RUN npm install


COPY ./src /app/src


COPY ./public /app/public


RUN npm run build


EXPOSE 3000


CMD ["npm", "start"]
