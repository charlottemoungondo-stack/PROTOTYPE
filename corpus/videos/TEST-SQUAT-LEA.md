# Test vidéo n°1 : Léa, deux squats (transfert de mouvement)

## Entrées
- Apparence : `coachs/lea/reference-originale.png` (image originale, jamais régénérée).
- Mouvement : vidéo libre de droits Pexels, critères ci-dessous.
- Modèle : Kling 3.0 Pro Motion Control (ElevenLabs), 1080p, 8 s maximum.

## Critères de la vidéo de référence
- Une seule personne, sans accessoire (pas de balle, pas d'haltère).
- Caméra fixe sur pied, aucun mouvement de caméra.
- Corps entier visible de la tête aux pieds, avec de la marge.
- Vue de face ou de trois quarts avant, visage visible.
- Fond neutre et uni (studio blanc ou gris), éclairage homogène.
- Au moins deux squats complets, technique propre.
- Commence et finit debout, dans la même position.

## Consigne de génération (à affiner selon la vidéo retenue)
La femme de l'image de référence réalise exactement le mouvement de la vidéo de référence : deux squats au poids du corps,
pieds largeur d'épaules, bras tendus devant à hauteur d'épaules, dos plat, poitrine haute, cuisses parallèles au sol,
puis retour debout. Même visage, même queue de cheval haute, même peau caramel, même brassière noire, même legging noir
évasé, mêmes baskets blanches. Même studio gris chaud uni, caméra fixe, corps entier dans le cadre.
À éviter : déformation des mains ou des pieds, vêtements qui changent, visage instable, scintillement, objet dans les mains.

## Contrôle qualité avant présentation
- Identité : visage, cheveux, carnation, morphologie et tenue comparés à l'image originale, image par image.
- Anatomie : pieds, mains, doigts, genoux, coudes sans déformation ; genoux dans l'axe des pieds ; dos plat.
- Arrière-plan fixe, sans scintillement.
- Boucle : `tools/prepare_demo_video.sh` (fondu de 0,3 s), puis test dans l'app avec le compteur synchronisé.
