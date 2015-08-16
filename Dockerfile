FROM debian
RUN mkdir /opt/src && \
    apt-get update && \
    apt-get install -y nginx nodejs npm && \
    npm install -g gulp && \
    ln -s /usr/bin/nodejs /usr/bin/node
RUN \
    sed -i.bak -e "s/.*error_log.*/error_log \/dev\/stdout info;/g" /etc/nginx/nginx.conf && \
    sed -i.bak -e "s/.*access_log.*/  access_log \/dev\/stdout;/g" /etc/nginx/nginx.conf && \
    echo "\ndaemon off;\nerror_log /dev/stdout info;\n" >> /etc/nginx/nginx.conf
COPY . /opt/src
WORKDIR /opt/src
RUN gulp && cp -a dist/* /var/www/html
CMD ["nginx"]
