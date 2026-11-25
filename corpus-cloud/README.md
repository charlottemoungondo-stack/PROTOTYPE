# Corpus Coach — comptes et sauvegarde en ligne

Base de données Supabase pour retrouver ses séances, défis, mesures et photos sur tous ses appareils.

- `schema.sql` : table `user_state` (une ligne par personne) et dossier privé `photos`,
  protégés par Row Level Security : chacun n'accède qu'à ses propres données.
- Connexion par e-mail avec un code à 6 chiffres (pas de mot de passe à retenir).
- Le module `corpus/cloud.js` ne s'active que si `corpus/cloud-config.js` contient l'adresse
  du projet et sa clé publique (« publishable key »). Sans configuration, l'application
  fonctionne comme avant, avec les données gardées dans le navigateur.

Mise en place :
1. Créer le projet Supabase « corpus-coach ».
2. Exécuter `schema.sql` (migration).
3. Dans Authentication → Email : activer le code à usage unique (OTP).
4. Renseigner `corpus/cloud-config.js`.
