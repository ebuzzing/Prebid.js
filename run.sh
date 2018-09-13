#!/bin/bash
set -xe

./node_modules/gulp/bin/gulp.js build
./node_modules/gulp/bin/gulp.js copy-quality
./node_modules/gulp/bin/gulp.js build-distrib
./node_modules/gulp/bin/gulp.js build-teads-adapter-prod

declare -a arrenv=(
  "TRACKING_PORT_8080_TCP_ADDR"
  "TRACKING_PORT_8080_TCP_PORT"
  "SSP_PORT_8080_TCP_ADDR"
  "SSP_PORT_8080_TCP_PORT"
  "USER_SYNC_PORT_8083_TCP_ADDR"
  "USER_SYNC_PORT_8083_TCP_PORT"
  "PREBID_HOST_PORT"
  "PREBID_HOST_ADDR"
);

for i in "${arrenv[@]}"
do
  echo "Process $i"
  VAL="${!i}"
  if [ "$VAL" ]; then
    VALPATTERN=$(sed 's/\_/\\_/g' <<< $i)
    sed -i "s/$VALPATTERN/$VAL/g" \
    ./modules/teadsBidAdapter.js \
    ./modules/teadsAnalyticsAdapter.js \
    ./build/dist/prebid.js \
    ./build/dist/prebid-quality.js
  fi
done

./node_modules/gulp/bin/gulp.js express
