# Test Image-to-Video : Léa, deux squats

Image de départ : `depart-9x16.png` (recadrage de la photo originale, mêmes pixels, aucune régénération).
Modèle : Kling VIDEO 3.0, image vers vidéo, 1080p, 5 s (ou 10 s), son désactivé.

## Consigne (à coller telle quelle)
The exact same woman from the start image performs two slow, controlled bodyweight squats with perfect form, then returns to standing in the same position as the start image. Feet shoulder-width apart, toes slightly turned out. As she lowers, her arms rise straight forward to shoulder height, hips move back, back stays flat, chest up, knees track over the toes, thighs reach parallel to the floor, heels stay on the ground. She breathes naturally and keeps a calm, focused expression. Static camera on a tripod, full body visible from head to feet, the same seamless warm-grey studio background and soft even lighting as the start image. Photorealistic, real human skin texture, natural fabric movement.

## Consigne négative
morphing face, changing identity, changing hairstyle, changing outfit, extra fingers, distorted hands, distorted feet, bending knees inward, rounded back, camera movement, zoom, background change, flickering, cartoon, CGI, video game look, plastic skin

## Ce qu'on vérifiera
- Identité : visage, queue de cheval, peau caramel, brassière et legging noirs, baskets blanches, identiques à l'image de départ.
- Morphologie inchangée d'une image à l'autre.
- Deux squats complets, dos plat, genoux dans l'axe, cuisses parallèles, talons au sol.
- Mains, doigts et pieds sans déformation.
- Caméra et fond strictement fixes ; retour à la position de départ pour la boucle.

---

# Variante Motion Control (photo + vidéo de référence)

Vidéo de mouvement : `reference-mouvement-squat.mp4`
- Source : Pexels, vidéo n°8402111 (licence Pexels : usage commercial autorisé, sans attribution obligatoire).
- Préparation : deux squats complets (2,2 s → 13,2 s de la source), stabilisation « trépied », corps recentré
  image par image (la caméra d'origine glissait sur un rail), accélération ×1,4 → 7,8 s, 720×1280, 30 i/s.
- Commence et finit debout, mains jointes devant la poitrine ; descente profonde, buste droit, talons au sol.

Image d'apparence : `depart-9x16.png` (Léa).

## Consigne
The woman from the reference image performs exactly the movement of the reference video: two bodyweight squats with hands clasped in front of her chest, then back to standing. Keep her exact face, high ponytail, caramel skin, body shape, black sports bra, black flared leggings and white sneakers. Keep the seamless warm-grey studio background and soft lighting of the reference image. Static camera, full body visible from head to feet.

## Consigne négative
morphing face, changing identity, changing hairstyle, changing outfit, red top, outdoor background, railing, extra fingers, distorted hands, distorted feet, camera movement, flickering, cartoon, CGI, video game look, plastic skin
