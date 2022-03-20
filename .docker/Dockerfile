FROM node:lts-alpine

RUN apk add haproxy supervisor openssl
COPY .docker/haproxy.cfg /etc/haproxy/haproxy.cfg
COPY .docker/oracle.ini /etc/supervisor.d/

COPY . /var/www/oracle-lite
RUN openssl ecparam -name prime256v1 -genkey -noout -out /var/www/oracle-lite/certs/ec_private.pem


CMD ["supervisord","-n","-c","/etc/supervisord.conf"]