FROM REGISTRY_URL_INJECTED_BY_TEST_SH/npm-builder:node-6-qa

WORKDIR /usr/src/app
# Install app dependencies

COPY . .

RUN npm install
RUN ./node_modules/gulp/bin/gulp.js test
RUN ./node_modules/gulp/bin/gulp.js build
RUN ./node_modules/gulp/bin/gulp.js copy-quality
RUN ./node_modules/gulp/bin/gulp.js copy-ci
RUN ./node_modules/gulp/bin/gulp.js build-distrib
RUN ./node_modules/gulp/bin/gulp.js build-teads-adapter-prod

EXPOSE 9999

CMD ["./run.sh"]
