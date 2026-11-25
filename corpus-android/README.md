# Corpus Coach — application Android et iPhone

Emballage natif (Capacitor 7) de l'application web du dossier `corpus/`.

## Android (automatique)

À chaque mise à jour poussée sur la branche, GitHub Actions compile un fichier `app-debug.apk`
(workflow « Corpus Coach - APK Android »). Pour l'installer :

1. Sur GitHub : onglet **Actions** → dernière exécution réussie → section **Artifacts** → `corpus-coach-android`.
2. Décompresser, copier `app-debug.apk` sur le téléphone Android, l'ouvrir et autoriser l'installation.

## Compiler à la main

```bash
npm install --legacy-peer-deps
./prepare-www.sh
npx cap add android   # ou : npx cap add ios (sur Mac avec Xcode)
npx cap sync
npx cap open android  # ouvre Android Studio
```

## Publication sur les stores

- Google Play : compte développeur (25 $, une fois), APK/AAB signé en mode *release*.
- App Store : compte Apple Developer (99 $ par an), compilation sur Mac avec Xcode.
