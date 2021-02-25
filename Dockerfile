FROM node

RUN apt update
RUN apt install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

COPY srcs Sempiternel
RUN npm install --prefix Sempiternel --loglevel verbose
CMD cd Sempiternel && sh start.sh