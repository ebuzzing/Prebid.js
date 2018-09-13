#!/bin/sh
set -xe

# Install local teads-central (documented @ https://confluence.teads.net/display/INFRA/teads-central+documentation)
curl -sL http://dl.teads.net/teads-central/get.sh | sh -

# Common variables
REG_URL=$(./teads-central docker dev-registry-url)

# common changes above this line should be done upstream #
##########################################################

./teads-central docker tag-and-push --branch-tag --image prebid
