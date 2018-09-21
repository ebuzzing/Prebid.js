#!/bin/sh
set -xe

# Install local teads-central (documented @ https://confluence.teads.net/display/INFRA/teads-central+documentation)
curl -sL http://dl.teads.net/teads-central/get.sh | sh -

# Common variables
REG_URL=$(./teads-central docker dev-registry-url)

cleanup () { trap '' INT; ./teads-central docker clean-tagged; }
trap cleanup EXIT TERM
trap true INT

# common changes above this line should be done upstream #
##########################################################

# Inject registry url to Dockerfile, -i'' is used for mac OS and linux compatibility
sed -i'' -e "s/REGISTRY_URL_INJECTED_BY_TEST_SH/$REG_URL/" Dockerfile

HASH=$(./teads-central vars hash)
TAG=$(./teads-central vars tag)

# Build
docker build -t prebid:$HASH .

# Run
./teads-central docker run-tagged prebid --local
