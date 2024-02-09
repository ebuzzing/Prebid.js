# Force use of amd64 image as chrome is not available in ARM for debian
FROM --platform=linux/amd64 node:16.20-bookworm

# https://www.google.com/linuxrepositories/
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
RUN echo 'deb http://dl.google.com/linux/chrome/deb/ stable main' >> /etc/apt/sources.list
RUN apt-get update && apt-get install --no-install-recommends -y google-chrome-stable

WORKDIR /usr/src/app
# Install app dependencies

COPY . .

RUN npm install
RUN ./node_modules/gulp/bin/gulp.js test --nolintfix --file "test/spec/modules/teadsBidAdapter_spec.js"
RUN ./node_modules/gulp/bin/gulp.js build
RUN ./node_modules/gulp/bin/gulp.js copy-quality
RUN ./node_modules/gulp/bin/gulp.js copy-ci
RUN ./node_modules/gulp/bin/gulp.js build-distrib
RUN ./node_modules/gulp/bin/gulp.js build-teads-adapter-prod

EXPOSE 9999

CMD ["./run.sh"]
