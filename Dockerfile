FROM node:24-alpine AS build
WORKDIR /app
COPY MercuryCobaldFrontend/package.json MercuryCobaldFrontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm i --no-audit --no-fund
COPY MercuryCobaldFrontend/ ./
ARG NODE_BUILD_HEAP_MB=1024
RUN NODE_OPTIONS="--max-old-space-size=${NODE_BUILD_HEAP_MB}" npm run build

FROM nginx:stable-alpine AS runtime
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080
STOPSIGNAL SIGQUIT
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
