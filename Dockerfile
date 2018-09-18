FROM REGISTRY_URL_INJECTED_BY_TEST_SH/npm-builder:node-6-qa

WORKDIR /usr/src/app
# Install app dependencies
COPY package.json .

RUN npm install

COPY . .

EXPOSE 9999

CMD ["./run.sh"]
