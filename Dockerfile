FROM nvidia/cuda:11.2.2-cudnn8-runtime-ubuntu20.04

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Asia/Seoul

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      tzdata ca-certificates ffmpeg curl build-essential python3 git && \
    ln -fs /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    dpkg-reconfigure -f noninteractive tzdata && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get update && \
    apt-get install -y --no-install-recommends nodejs && \
    npm i -g npm@latest && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3000
CMD ["node", "dist/main.js"]