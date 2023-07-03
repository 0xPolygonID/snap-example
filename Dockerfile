### STAGE 2: Run ###
FROM nginx:1.17.1-alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY packages/site/public /usr/share/nginx/html
COPY packages/snap/dist /usr/share/nginx/html/dist
COPY packages/snap/images /usr/share/nginx/html/images
COPY packages/snap/snap.manifest.json /usr/share/nginx/html
