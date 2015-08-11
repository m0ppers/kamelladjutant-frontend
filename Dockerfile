FROM nginx
RUN mkdir /opt/src && apt-get update && apt-get install -y nodejs npm && npm install -g gulp && ln -s /usr/bin/nodejs /usr/bin/node
COPY . /opt/src
WORKDIR /opt/src
RUN gulp && cp -a dist/* /usr/share/nginx/html
