#!/usr/bin/env bash
# Copie l'application web dans www/ et remplace les bibliothèques du CDN par des copies locales (fonctionnement hors ligne).
set -euo pipefail
cd "$(dirname "$0")"
rm -rf www && mkdir -p www/vendor
cp ../corpus/index.html ../corpus/*.js ../corpus/*.png ../corpus/manifest.webmanifest www/
rm -f www/sw.js
cp node_modules/three/build/three.min.js www/vendor/
cp node_modules/three/examples/js/controls/OrbitControls.js www/vendor/
cp node_modules/three/examples/js/environments/RoomEnvironment.js www/vendor/
cp node_modules/three/examples/js/loaders/GLTFLoader.js www/vendor/
sed -i -E 's#https://cdn\.jsdelivr\.net/npm/three@0\.147\.0/(build|examples/js/[a-z]+)/#vendor/#g' www/index.html
grep -c 'src="vendor/' www/index.html
