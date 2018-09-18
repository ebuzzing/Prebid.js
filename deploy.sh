#!/bin/bash
set -xe

# Install local teads-central
curl -sL http://dl.teads.net/teads-central/get.sh | sh -

# DOCKER_IMAGE is mandatory.
DOCKER_IMAGE=prebid
DOCKER_TAG="master-teads"

# DOCKER_IMAGE_ARTIFACTS_PATH is mandatory (where the files are in the docker image, this can be found in the Dockerfile).
DOCKER_IMAGE_ARTIFACTS_PATH=build/dist
DOCKER_REGISTRY_URL=$(./teads-central docker dev-registry-url)
DOCKER_IMAGE_URL="${DOCKER_REGISTRY_URL}/${DOCKER_IMAGE}"
DOCKER_IMMUTABLE_BUILD_IMAGE_URL="${DOCKER_IMAGE_URL}:${DOCKER_TAG}"
LOCAL_DIRECTORY_ARTIFACTS_PATH="`pwd`/dist"

rm -Rf ${LOCAL_DIRECTORY_ARTIFACTS_PATH}
mkdir ${LOCAL_DIRECTORY_ARTIFACTS_PATH}

# Pull the needed Docker image
docker pull ${DOCKER_IMMUTABLE_BUILD_IMAGE_URL}

# Mechanism TARGET copy the artifacts contained in the Docker image in the local folder.
chmod g+s -R ${LOCAL_DIRECTORY_ARTIFACTS_PATH}
docker run --rm -t \
  -v ${LOCAL_DIRECTORY_ARTIFACTS_PATH}:/tmp/www \
  ${DOCKER_IMMUTABLE_BUILD_IMAGE_URL} \
  sh -c "umask 002 && cp -aR ${DOCKER_IMAGE_ARTIFACTS_PATH}/* /tmp/www"

FINAL_DIST_PATH="finaldist"
rm -Rf "$FINAL_DIST_PATH"
mkdir "$FINAL_DIST_PATH"
cp -aR $LOCAL_DIRECTORY_ARTIFACTS_PATH/* $FINAL_DIST_PATH

deployServicePrebidArtifacts() {
  S3_BUCKET='teads-prebid'

  # Build S3 command
  CMD='echo "Deploy Teads Prebid Adapter"'
  CMD="${CMD} && s3cmd put --acl-public ${FINAL_DIST_PATH}/prebid-distrib.js s3://${S3_BUCKET}/teads-prebid.js --mime-type 'application/javascript;charset=utf-8'"
  CMD="${CMD} && s3cmd put --acl-public ${FINAL_DIST_PATH}/teadsBidAdapterProd.js s3://${S3_BUCKET}/teads-bid-adapter.js --mime-type 'application/javascript;charset=utf-8'"

  # Execute command
  docker run --rm -t \
	-v `pwd`:/opt/workspace:rw -w /opt/workspace \
	-v ~/.s3cfg:/root/.s3cfg \
	"${DOCKER_REGISTRY_URL}/s3cmd:1.5.2" \
	sh -c "${CMD}"
}

deployServicePrebidArtifacts
