# Donner un corps réaliste au coach

L'application Corpus sait animer n'importe quel personnage 3D humain qui possède un squelette standard.
Tous les exercices (84), l'ancrage au sol, les haltères et les machines s'adaptent automatiquement
aux proportions du personnage.

Il suffit d'un fichier **.glb**, importé dans **Réglages → Avatar réaliste (bêta)**.

## Où trouver le personnage

| Source | Réalisme | Prix | Licence pour une application |
|---|---|---|---|
| **Character Creator 5** (Reallusion) | Très élevé : peau, visage, cheveux de qualité cinéma | Logiciel autour de 300 $ (prix de lancement), plus d'éventuels packs de vêtements ou de coiffures | Licence standard : export autorisé vers Unity, Unreal, Blender… À vérifier sur la page licence de Reallusion avant publication |
| **MakeHuman / MPFB** (extension Blender) | Moyen à bon, corps entièrement réglable | Gratuit | Les personnages exportés avec la version officielle sont sous licence CC0 (aucune restriction) |
| **Mixamo** (Adobe) | Moyen, personnages semi-réalistes | Gratuit avec un compte Adobe | Usage commercial autorisé dans un jeu ou une application ; interdit de revendre les fichiers seuls |

Recommandation :
- **Pour un prototype à montrer :** MakeHuman/MPFB (gratuit, sans contrainte de licence).
- **Pour la version publiée sur les stores :** Character Creator 5. C'est le rendu « vraie personne » recherché, avec une coach et un coach créés sur mesure.

## Étapes avec Character Creator 5

1. Créer le personnage : morphologie, visage, peau, cheveux. Tenue de sport (brassière ou tee-shirt, legging ou short, baskets).
2. Exporter en **FBX**, préréglage « Blender » ou « Unity », **sans animation**, en pose T ou A.
3. Ouvrir **Blender** (gratuit), menu *Fichier → Importer → FBX*.
4. Menu *Fichier → Exporter → glTF 2.0*, format **glTF binaire (.glb)**. Cocher « Appliquer les modificateurs ». Garder les textures en JPEG pour un fichier léger (objectif : moins de 30 Mo).
5. Dans Corpus : *Réglages → Avatar réaliste → Importer un fichier .glb*.

## Étapes avec MakeHuman / MPFB (gratuit)

1. Installer Blender, puis l'extension **MPFB** depuis *Édition → Préférences → Extensions*.
2. Créer un humain, ajouter vêtements, cheveux et peau, puis ajouter le squelette **« Game engine »**.
3. Exporter en **.glb** comme ci-dessus, puis importer dans Corpus.

## Squelettes reconnus

Mixamo (`mixamorig:Hips`, `LeftArm`…), Character Creator (`CC_Base_L_Upperarm`…), MakeHuman « Game engine »
et Unreal (`upperarm_l`, `thigh_l`…), Unity/VRM (`LeftUpperArm`…), 3ds Max Biped (`Bip01 L Thigh`…).

Os obligatoires : bassin, colonne, tête, bras, avant-bras, mains, cuisses, jambes, pieds.
Si un os manque, l'application l'indique précisément.

## Points d'attention

- Vérifier la licence du personnage **et** de ses éléments (cheveux, vêtements, textures) avant de publier l'application.
- Un modèle par sexe : une coach (Léa) et un coach (Malik). Le sélecteur de coach pourra charger le bon modèle.
- Les doigts restent en position neutre : l'animation des mains fines (poing serré sur l'haltère) est une amélioration prévue.
