# Brief design — PlanFlow

À coller dans [Claude Design](https://claude.ai/design). Le résultat revient dans le dépôt par « Send to Claude Code Web », ou en déposant les fichiers dans `design/`.

---

## Prompt

> Conçois un design system pour **PlanFlow**, une application RH de gestion des plannings et des temps, auto-hébergée, utilisée par une enseigne de commerce de détail non alimentaire multi-établissements.
>
> **Direction : organique professionnel.** Chaleureux et humain sans être décoratif ; sobre et crédible sans être froid. On rejette autant le SaaS bleu clinique que le pastel « wellness ». Pense matières naturelles et lumière du jour plutôt que néon et verre : verts et terres désaturés, blancs cassés légèrement chauds, courbes douces mais assumées. L'outil sert à décider, pas à contempler — l'ornement qui n'aide pas à lire est du bruit.
>
> **Qui l'utilise.** Des responsables de magasin qui construisent un planning hebdomadaire pour vingt à quatre-vingts personnes, souvent debout, souvent pressés, parfois sur un écran médiocre en réserve. Et des gestionnaires RH qui passent des heures sur des tableaux denses. Confort de lecture prolongée et lisibilité en conditions dégradées priment sur l'effet de style.
>
> **Le problème central : la grille de planning.** Lignes = salariés, colonnes = les sept jours. Chaque cellule peut contenir plusieurs créneaux colorés par poste, des barres d'absence qui courent sur plusieurs jours, des badges d'écart, une marque de validation. Chaque ligne porte cinq compteurs. La couleur y **porte du sens**, elle n'est pas décorative.
>
> Il me faut donc :
> - une palette catégorielle d'**au moins dix teintes de postes**, distinguables entre elles à petite taille et **pour les trois formes principales de daltonisme** ;
> - ces teintes doivent rester lisibles avec du texte par-dessus, en clair comme en sombre ;
> - une distinction nette entre teinte de poste (catégorielle, sans hiérarchie) et couleurs de statut (sémantiques : alerte de convention, écart, validé, non publié).
>
> **Contraintes fermes :**
> - **Aucune ressource externe.** La politique de sécurité de l'application interdit toute origine tierce : pas de Google Fonts, pas de CDN. Propose une pile de polices système, ou une police libre auto-hébergeable en précisant laquelle.
> - **WCAG 2.2 AA** sur tout, y compris les états de survol et de focus, et un focus visible au clavier — la grille se pilote au clavier.
> - **Thèmes clair et sombre**, tokens définis pour les deux.
> - Interface en **français** : prévoir des libellés plus longs qu'en anglais, les colonnes ne doivent pas casser.
> - Densité élevée assumée : c'est un outil de production, pas une page marketing.
>
> **Livre :**
> 1. Les tokens — couleur, typographie, espacement, rayons, élévation, durées d'animation — en variables CSS, thèmes clair et sombre.
> 2. Une échelle typographique tenant la lecture prolongée de tableaux, avec des chiffres tabulaires pour les compteurs et les horaires.
> 3. Les composants : bouton (primaire, secondaire, discret, danger), champ de saisie, sélecteur, case à cocher, badge, pastille de statut, tableau dense, onglets, fenêtre modale, panneau latéral, message vide, message d'erreur, squelette de chargement, notification.
> 4. **Le bloc de créneau** de la grille de planning, dans ses états : brouillon, publié, validé, en alerte, non assigné, en cours de déplacement.
> 5. **La barre d'absence** multi-jours, avec son étiquette et sa durée.
> 6. Le bandeau de compteurs d'une ligne salarié : cinq valeurs, dont un écart qui peut être positif ou négatif.
> 7. Une démonstration de la grille complète sur une semaine réaliste, en clair et en sombre.
>
> Montre la palette de postes appliquée à une vraie grille, pas seulement en nuancier : c'est là qu'une palette échoue.

---

## Pourquoi ces contraintes

**Pas de ressources externes** — la Content-Security-Policy de PlanFlow ne nomme aucune origine tierce (`src/lib/security/csp.ts`), et un test échoue si cela change. Une police appelée depuis un CDN serait bloquée par le navigateur. Ce n'est pas un détail de style : `PLAN.md` §3.7 en fait un invariant, parce qu'une application RH ne doit rien envoyer à un tiers.

**Daltonisme** — la couleur de poste est de l'information, pas de la décoration. Si deux postes se confondent, le planning devient faux à la lecture. Prévoir un second canal — libellé, motif, initiale — plutôt que de compter sur la seule teinte.

**Chiffres tabulaires** — les compteurs et horaires s'empilent en colonnes. Des chiffres à chasse variable les font danser d'une ligne à l'autre et rendent la comparaison pénible.

**Libellés français** — « Dépublier », « Repos compensateur », « Convention collective » sont sensiblement plus longs que leurs équivalents anglais. Une grille calibrée sur de l'anglais casse.

## Intégration

Les tokens atterrissent dans `src/app/globals.css` (Tailwind 4 lit `@theme` directement depuis le CSS), les composants dans `src/components/ui/`. La grille elle-même arrive au WP-04 ; d'ici là, le design system peut se construire en parallèle des lots WP-01 à WP-03.
