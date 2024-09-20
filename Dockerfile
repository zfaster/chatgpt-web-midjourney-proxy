# build front-end
FROM node:lts-alpine AS frontend

RUN npm install pnpm -g

ARG workdir=/app
WORKDIR ${workdir}

COPY ./package.json /app

COPY ./pnpm-lock.yaml /app

RUN pnpm config set registry http://registry.npm.taobao.org
RUN pnpm install

COPY . /app

RUN pnpm run build

# build backend
FROM node:lts-alpine as backend


RUN npm install pnpm -g

WORKDIR /app

COPY /service/package.json /app

COPY /service/pnpm-lock.yaml /app
RUN pnpm config set registry http://registry.npm.taobao.org
RUN pnpm install

COPY /service /app

RUN pnpm build

# service
FROM node:lts-alpine

RUN npm install pnpm -g

WORKDIR /app

COPY /service/package.json /app

COPY /service/pnpm-lock.yaml /app
RUN pnpm config set registry http://registry.npm.taobao.org
RUN pnpm install --production && rm -rf /root/.npm /root/.pnpm-store /usr/local/share/.cache /tmp/*

COPY /service /app

COPY --from=frontend /app/dist /app/public

COPY --from=backend /app/build /app/build

EXPOSE 8080

#RUN addgroup -S tomcat && adduser -S -G tomcat -u 8080 tomcat
#RUN chown -R tomcat:tomcat $workdir
#RUN mkdir -p /logs && chown -R tomcat:tomcat /logs
#
#USER tomcat

CMD ["pnpm", "run", "prod"]
