#!/bin/bash
# Dipanggil oleh GitHub Actions setelah "npx cap add android": ikon, splash, nomor versi
set -e
N="$1"
R=android/app/src/main/res
for d in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
  cp res/icon/$d/ic_launcher.png       $R/mipmap-$d/ic_launcher.png
  cp res/icon/$d/ic_launcher_round.png $R/mipmap-$d/ic_launcher_round.png
done
rm -rf $R/mipmap-anydpi-v26
find $R -name "splash.png" -delete
mkdir -p $R/drawable $R/drawable-nodpi
cp res/splash.xml $R/drawable/splash.xml
cp res/jm_logo.png $R/drawable-nodpi/jm_logo.png
sed -i -E "s/versionCode [0-9]+/versionCode $N/; s/versionName \"[^\"]*\"/versionName \"1.$N\"/" android/app/build.gradle
sed -i -E "s/targetSdkVersion = [0-9]+/targetSdkVersion = 34/" android/variables.gradle
grep -nE "versionCode|versionName" android/app/build.gradle
grep -n "targetSdkVersion" android/variables.gradle
