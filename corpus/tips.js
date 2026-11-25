/* Corpus — conseils du coach. Informations générales, qui ne remplacent pas l'avis d'un professionnel de santé. */
(function () {
  'use strict';
  window.CorpusTips = [
    { id: 'ventre', cat: 'Objectif', title: 'Perdre du ventre : ce qui marche vraiment', aud: ['femme', 'homme'], body: [
      'On ne peut pas brûler la graisse d\'un endroit précis : 500 crunchs par jour ne font pas fondre le ventre à eux seuls. Le corps puise dans ses réserves de façon globale.',
      'Ce qui fonctionne, c\'est l\'ensemble : un léger déficit calorique (manger un peu moins que ce que tu dépenses, sans régime extrême), des protéines à chaque repas, beaucoup de légumes, et moins de boissons sucrées et d\'alcool.',
      'Côté sport : du renforcement de tout le corps deux à trois fois par semaine pour garder le muscle, du cardio par intervalles (la séance HIIT), et de la marche tous les jours. Les exercices de gainage, eux, dessinent la sangle abdominale qui apparaîtra quand la graisse diminuera.',
      'Compte en semaines, pas en jours : mesure ton tour de taille une fois par semaine, le matin, et regarde la tendance sur un mois.'] },
    { id: 'fessiers', cat: 'Objectif', title: 'Des fessiers galbés : la progression avant tout', aud: ['femme'], body: [
      'Le muscle grandit quand on lui demande un peu plus qu\'avant : plus de répétitions, une charge plus lourde, ou un tempo plus lent. C\'est ce qu\'on appelle la surcharge progressive.',
      'Les mouvements les plus efficaces : hip thrust et pont fessier, squat bulgare, soulevé de terre roumain, fentes. Les exercices d\'abduction (clamshell, fire hydrant) complètent pour le haut des fessiers.',
      'Deux à trois séances par semaine suffisent, avec au moins un jour de repos entre deux. Serre fort en haut de chaque répétition et contrôle la descente.',
      'Mange assez de protéines (viande, poisson, œufs, laitages, légumineuses) : sans matériaux, pas de construction.'] },
    { id: 'muscle', cat: 'Objectif', title: 'Prendre du muscle', aud: ['homme', 'femme'], body: [
      'Trois piliers : un entraînement progressif, assez de protéines (autour de 1,6 g par kilo de poids de corps et par jour) et un sommeil suffisant.',
      'Vise 10 à 20 séries par groupe musculaire et par semaine, réparties sur deux ou trois séances. Arrête chaque série à une ou deux répétitions de l\'échec, avec une technique propre.',
      'Note tes charges et tes répétitions : si tu fais la même chose qu\'il y a un mois, ton corps n\'a aucune raison de changer.'] },
    { id: 'echauffement', cat: 'Entraînement', title: 'Pourquoi s\'échauffer', aud: [], body: [
      'L\'échauffement fait monter la température des muscles, lubrifie les articulations et prépare le cœur. Tu seras plus fort(e) et tu limites le risque de blessure.',
      'Cinq minutes suffisent : marche ou cardio léger, cercles d\'articulations, puis quelques répétitions faciles du premier exercice. Corpus l\'ajoute automatiquement à chaque séance.'] },
    { id: 'respiration', cat: 'Entraînement', title: 'Bien respirer pendant l\'effort', aud: [], body: [
      'Règle simple : expire pendant l\'effort (quand tu pousses ou que tu montes), inspire pendant le retour.',
      'Évite de bloquer ta respiration, surtout si tu as de la tension ou si tu es enceinte. Si tu n\'arrives plus à parler du tout, ralentis un peu.'] },
    { id: 'recup', cat: 'Récupération', title: 'Courbatures et récupération', aud: [], body: [
      'Les courbatures apparaissent 24 à 48 heures après un effort nouveau. Elles sont normales et diminuent quand le corps s\'habitue.',
      'Pour récupérer : bouge doucement (marche, étirements légers), bois de l\'eau, dors bien. Une douleur vive, articulaire ou qui empire n\'est pas une courbature : arrête-toi et consulte.'] },
    { id: 'eau', cat: 'Récupération', title: 'Hydratation', aud: [], body: [
      'Bois régulièrement dans la journée, et un peu avant, pendant et après la séance. Des urines claires sont un bon indicateur.',
      'Pendant une séance de moins d\'une heure, l\'eau suffit : pas besoin de boisson sucrée.'] },
    { id: 'sommeil', cat: 'Récupération', title: 'Le sommeil, ton meilleur allié', aud: [], body: [
      'C\'est pendant le sommeil que le muscle se répare et que les hormones de l\'appétit se régulent. Vise 7 à 9 heures.',
      'Un manque de sommeil augmente l\'envie de sucre et rend les séances plus difficiles : il peut freiner autant tes progrès qu\'une séance ratée.'] },
    { id: 'dos', cat: 'Santé', title: 'Nuque et dos : le travail assis', aud: ['mobilite'], body: [
      'Rester assis(e) longtemps raidit la nuque et le bas du dos. Lève-toi toutes les heures, même deux minutes.',
      'La séance « Dos, cou & posture » renforce le haut du dos et les lombaires, et délie la nuque. Fais-la deux à trois fois par semaine.',
      'Écran à hauteur des yeux, épaules basses, pieds à plat : de petits réglages qui comptent.'] },
    { id: 'grossesse', cat: 'Santé', title: 'Sport et grossesse', aud: ['prenatal'], body: [
      'Demande toujours l\'accord de ta sage-femme ou de ton médecin avant de commencer ou de continuer le sport.',
      'Une activité modérée est en général bénéfique : marche, renforcement doux, mobilité, plancher pelvien. Tu dois pouvoir parler pendant l\'effort.',
      'Après le premier trimestre, évite de rester longtemps allongée sur le dos, les sports avec risque de chute ou de choc, et le blocage de la respiration.',
      'Arrête immédiatement et consulte en cas de saignement, de vertige, de douleur dans la poitrine ou le mollet, de contractions régulières ou de perte de liquide.'] },
    { id: 'seniors', cat: 'Santé', title: 'Bouger après 65 ans', aud: ['senior'], body: [
      'La force des jambes et l\'équilibre sont les meilleurs remèdes contre les chutes. L\'exercice « Assis-debout » est l\'un des plus utiles qui soient.',
      'Garde une chaise stable à portée de main, avance à ton rythme et augmente doucement. Si tu as un traitement ou une maladie cardiaque, parle-en d\'abord à ton médecin.'] },
    { id: 'running', cat: 'Objectif', title: 'Renforcement pour coureurs', aud: ['running'], body: [
      'Deux séances de renforcement par semaine réduisent les blessures et améliorent l\'efficacité de la foulée : mollets, fessiers, gainage, chevilles.',
      'Augmente ton volume de course progressivement, d\'environ 10 % par semaine au maximum.'] },
    { id: 'photos', cat: 'Motivation', title: 'Réussir ses photos avant/après', aud: [], body: [
      'Même lieu, même lumière (de jour, face à une fenêtre), même tenue, même heure (le matin, à jeun), même distance.',
      'Prends trois photos : face, profil, dos. Recommence toutes les deux à quatre semaines : les changements se voient mieux sur la durée que d\'un jour à l\'autre.'] },
    { id: 'regularite', cat: 'Motivation', title: 'La régularité bat l\'intensité', aud: [], body: [
      'Trois séances moyennes chaque semaine pendant trois mois valent mieux qu\'une semaine parfaite suivie d\'un abandon.',
      'Fixe-toi des jours précis, garde une séance courte de secours pour les journées chargées (« Réveil mobilité » dure 8 minutes) et ne rate jamais deux fois de suite.'] },
  ];
})();
