# Audit page par page — 58 écrans Combo

> **Nature du document.** Analyse en lecture seule des captures recensées dans `inventory.json`, au 7 août 2026. Aucun clic métier ni aucune mutation n’a été effectué sur Combo.
> **Méthode.** Les rubriques **Observations directes** décrivent uniquement ce qui est visible ou consigné dans l’inventaire. Les rubriques **Inférences** formulent des hypothèses de fonctionnement à confirmer par spécifications, tests et entretiens.
> **Confidentialité.** Les personnes et valeurs potentiellement personnelles sont volontairement anonymisées ; les fenêtres de satisfaction et bandeaux transverses sont signalés sans retranscrire de données sensibles.

## Légende des statuts

- **accessible** : route demandée et route finale identiques ; cela ne prouve pas que tous les workflows sont activés.
- **redirigée** : route finale différente.
- **marketing** : page de présentation commerciale au lieu de la fonctionnalité opérationnelle.

## Analyse détaillée

### 01. `/` — Portail d’entrée orientant vers les quatre tâches principales du gestionnaire

- **Capture :** `root-06171705.png`
- **Route demandée :** `/`
- **Route réelle :** `/`
- **Statut :** **accessible**

**Finalité**

Portail d’entrée orientant vers les quatre tâches principales du gestionnaire.

**Observations directes**

- Accueil illustré, salutation anonymisée, quatre cartes : planning, équipe, absences et paie ; liens d’aide et de configuration.
- Titres détectés dans le DOM : « Bonjour [collaborateur], ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Ouvrir directement le planning, l’annuaire, les demandes d’absence ou les périodes de paie.
- Rôles concernés : Utilisateur authentifié ; actions et données à limiter au périmètre de son rôle et de ses établissements.

**Règles métier et dépendances — inférence**

- Accès et raccourcis conditionnés par le rôle connecté ; dépend de l’identité, des habilitations et de l’état d’onboarding.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Prévoir un tableau de bord personnalisable, des contrôles d’autorisation côté serveur et des destinations stables.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 02. `/home` — Tableau de suivi hebdomadaire de l’établissement

- **Capture :** `home-b0020d12.png`
- **Route demandée :** `/home`
- **Route réelle :** `/home`
- **Statut :** **accessible**

**Finalité**

Tableau de suivi hebdomadaire de l’établissement.

**Observations directes**

- Sélecteur de semaine et d’établissement ; graphiques d’heures travaillées et d’absences ; indicateurs de productivité, sorties, dossier du personnel incomplet et activités récentes.
- Titres détectés dans le DOM : « FROUARD DISTRIBUTION ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Changer de période/établissement, ouvrir les anomalies RH et consulter l’activité détaillée.
- Rôles concernés : Utilisateur authentifié ; actions et données à limiter au périmètre de son rôle et de ses établissements.

**Règles métier et dépendances — inférence**

- Agrège planning, absences, registre du personnel, ventes/productivité et journal d’activité.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Définir les calculs, la fraîcheur des agrégats, les états sans données et la confidentialité des indicateurs RH.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 03. `/plannings/week` — Construire et publier le planning hebdomadaire par collaborateur

- **Capture :** `plannings--week-e089b6f7.png`
- **Route demandée :** `/plannings/week`
- **Route réelle :** `/plannings/week`
- **Statut :** **accessible**

**Finalité**

Construire et publier le planning hebdomadaire par collaborateur.

**Observations directes**

- Grille semaine, colonnes lun.–dim., lignes de collaborateurs anonymisés et sections par équipe ; shifts colorés, absences longues, notes, shifts non assignés ; filtres, dates, vue, Affichage, Outils et Dépublier.
- Titres détectés dans le DOM : aucun titre métier détecté.
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Créer/déplacer/redimensionner des shifts, affecter un salarié, publier/dépublier et naviguer entre semaines.
- Rôles concernés : Managers, planificateurs et directeurs ; consultation possible pour les salariés selon droits.

**Règles métier et dépendances — inférence**

- Conflits horaires, pauses, contrat, absences, équipe et statut de publication doivent être validés.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Composant de grille performant et accessible, gestion de concurrence, historique, fuseaux horaires et validation atomique.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 04. `/plannings/day` — Éditer une journée de planning sur une échelle horaire

- **Capture :** `plannings--day-7cd951d1.png`
- **Route demandée :** `/plannings/day`
- **Route réelle :** `/plannings/day`
- **Statut :** **accessible**

**Finalité**

Éditer une journée de planning sur une échelle horaire.

**Observations directes**

- Chronologie horizontale, regroupement par équipe, courbes d’effectifs, shifts colorés par poste et lignes d’absence ; navigation journalière, vue, Affichage, Outils et Dépublier.
- Titres détectés dans le DOM : aucun titre métier détecté.
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Comparer besoin/effectif, déplacer les créneaux, créer/supprimer un shift et contrôler la couverture horaire.
- Rôles concernés : Managers, planificateurs et directeurs ; consultation possible pour les salariés selon droits.

**Règles métier et dépendances — inférence**

- Les totaux planifiés/émargés et écarts sont calculés par salarié et par pas de temps.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Préserver précision temporelle, chevauchements, glisser-déposer, annulation, audit des suppressions et rendu dense.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 05. `/plannings/labels` — Visualiser le planning hebdomadaire regroupé par étiquette/poste

- **Capture :** `plannings--labels-9accd691.png`
- **Route demandée :** `/plannings/labels`
- **Route réelle :** `/plannings/labels`
- **Statut :** **accessible**

**Finalité**

Visualiser le planning hebdomadaire regroupé par étiquette/poste.

**Observations directes**

- Grille par équipes et étiquettes ; blocs de shifts colorés contenant un collaborateur anonymisé et des horaires ; section vide avec CTA « Créer un shift ».
- Titres détectés dans le DOM : aucun titre métier détecté.
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Filtrer par étiquette, créer des shifts dans une zone vide et publier/dépublier une équipe.
- Rôles concernés : Managers, planificateurs et directeurs ; consultation possible pour les salariés selon droits.

**Règles métier et dépendances — inférence**

- Étiquettes, couleurs, établissement, équipes et règles du planning sont partagés avec les autres vues.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Unifier le modèle de planning entre vues ; ne pas dupliquer les règles de validation ou publication.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 06. `/members` — Administrer l’effectif et le registre du personnel

- **Capture :** `members-479e6ee1.png`
- **Route demandée :** `/members`
- **Route réelle :** `/members`
- **Statut :** **accessible**

**Finalité**

Administrer l’effectif et le registre du personnel.

**Observations directes**

- Titre Équipe, recherche, filtres rôle/contrat/activité, tri, tableau de collaborateurs anonymisés, statuts d’invitation ; boutons RUP et ajout.
- Titres détectés dans le DOM : « Équipe ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Créer/inviter un collaborateur, ouvrir/éditer son profil, filtrer l’effectif et exporter le registre.
- Rôles concernés : Managers RH, directeurs et administrateurs ; certains exports ou documents exigent un rôle RH renforcé.

**Règles métier et dépendances — inférence**

- Données personnelles et contractuelles soumises aux droits RH et obligations de registre.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- RBAC fin, chiffrement, journalisation, minimisation des données, recherche paginée et export conforme.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 07. `/reports/payrolls` — Gérer les périodes de paie courantes

- **Capture :** `reports--payrolls-1b72f4bc.png`
- **Route demandée :** `/reports/payrolls`
- **Route réelle :** `/reports/payrolls`
- **Statut :** **accessible**

**Finalité**

Gérer les périodes de paie courantes.

**Observations directes**

- Onglets Paies/Activité, cartes mensuelles paginées, dates, populations contractuelles, Entrées/Sorties/Extras, menus Actions/Exports ; création et verrouillage.
- Titres détectés dans le DOM : « Rapports », « Périodes de paies ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Créer, sélectionner, verrouiller/déverrouiller puis exporter une période vers la paie.
- Rôles concernés : Responsables paie, direction et managers expressément habilités.

**Règles métier et dépendances — inférence**

- Une période couvre un intervalle et un périmètre ; le verrouillage doit figer les calculs et empêcher les mutations incompatibles.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- État transactionnel, idempotence des exports, traçabilité, recalcul contrôlé et gestion des corrections.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 08. `/reports/payrolls-history` — Consulter l’historique des périodes de paie

- **Capture :** `reports--payrolls-history-754a97cb.png`
- **Route demandée :** `/reports/payrolls-history`
- **Route réelle :** `/reports/payrolls-history`
- **Statut :** **accessible**

**Finalité**

Consulter l’historique des périodes de paie.

**Observations directes**

- Même liste mensuelle que la page Paies, sans CTA visible de création ; pagination, actions et exports par période.
- Titres détectés dans le DOM : « Rapports », « Périodes de paies ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Retrouver une période passée, consulter son périmètre et réexporter selon autorisation.
- Rôles concernés : Responsables paie, direction et managers expressément habilités.

**Règles métier et dépendances — inférence**

- Les périodes historiques doivent conserver leur version et leur statut de verrouillage.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Archivage immuable, preuve d’export, rétention légale et distinction claire courant/historique.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 09. `/reports/activities` — Consulter le journal d’activité des rapports

- **Capture :** `reports--activities-17d415b4.png`
- **Route demandée :** `/reports/activities`
- **Route réelle :** `/reports/activities`
- **Statut :** **accessible**

**Finalité**

Consulter le journal d’activité des rapports.

**Observations directes**

- Onglet Activité actif, filtres/recherche et plage de dates ; tableau Événement, Établissement, Date ; pagination.
- Titres détectés dans le DOM : « Rapports ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Filtrer les événements et remonter aux opérations ayant affecté paie ou personnel.
- Rôles concernés : Managers, RH, responsables paie et direction selon le rapport.

**Règles métier et dépendances — inférence**

- Les événements doivent être horodatés, attribués et non altérables.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Journal d’audit structuré, pagination serveur, export éventuel, rétention et masquage des données sensibles.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 10. `/reports/sick-leaves-status-report` — Route demandée de suivi d’arrêts maladie, non disponible dans cette session

- **Capture :** `reports--sick-leaves-status-report-8fa30734.png`
- **Route demandée :** `/reports/sick-leaves-status-report`
- **Route réelle :** `/reports/payrolls`
- **Statut :** **redirigée**

**Finalité**

Route demandée de suivi d’arrêts maladie, non disponible dans cette session.

**Observations directes**

- La capture montre intégralement la page Périodes de paie et non un rapport d’arrêts maladie.
- Titres détectés dans le DOM : « Rapports », « Périodes de paies ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Aucun workflow propre aux arrêts maladie n’est observable ; l’utilisateur est renvoyé vers les paies.
- Rôles concernés : Managers, RH, responsables paie et direction selon le rapport.

**Règles métier et dépendances — inférence**

- La redirection peut refléter une fonctionnalité retirée, non souscrite ou non autorisée.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Ne pas reproduire silencieusement cette ambiguïté : documenter la route, afficher un 403/404 explicite ou une redirection motivée.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 11. `/reports/timeclock` — Contrôler et valider les pointages par rapport au planifié

- **Capture :** `reports--timeclock-c5bad0a2.png`
- **Route demandée :** `/reports/timeclock`
- **Route réelle :** `/reports/timeclock`
- **Statut :** **accessible**

**Finalité**

Contrôler et valider les pointages par rapport au planifié.

**Observations directes**

- Filtres établissement/date, navigation temporelle, sélection multiple, bouton Valider et tableau salarié anonymisé avec planifié, émargé, durée et statut.
- Titres détectés dans le DOM : « Rapports ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Examiner les écarts, sélectionner des lignes, valider les pointages et ouvrir le détail.
- Rôles concernés : Managers, RH, responsables paie et direction selon le rapport.

**Règles métier et dépendances — inférence**

- Une validation engage les heures utilisées en paie ; elle doit conserver auteur, date et écarts.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Workflow d’approbation robuste, verrouillage, commentaires, corrections traçables et gestion des données manquantes.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 12. `/dashboard-rh/home` — Vue d’ensemble des tâches RH

- **Capture :** `dashboard-rh--home-2bfb06b6.png`
- **Route demandée :** `/dashboard-rh/home`
- **Route réelle :** `/dashboard-rh/home`
- **Statut :** **accessible**

**Finalité**

Vue d’ensemble des tâches RH.

**Observations directes**

- Navigation latérale RH ; filtres établissement et dates ; trois cartes de compteurs (dossiers incomplets, fins d’essai, titres de séjour) et panneaux Entrées/Sorties avec état vide.
- Titres détectés dans le DOM : « Aperçu », « 6 », « 0 », « Entrées », « Sorties ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Accéder aux listes d’alertes et consulter toutes les entrées/sorties.
- Rôles concernés : Managers RH, directeurs et administrateurs ; certains exports ou documents exigent un rôle RH renforcé.

**Règles métier et dépendances — inférence**

- Les compteurs agrègent les dossiers salariés selon échéances et complétude.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Calculs explicables, liens conservant les filtres, actualisation maîtrisée et gestion des états vides.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 13. `/dashboard-rh/incomplete-profiles` — Identifier les profils salariés incomplets

- **Capture :** `dashboard-rh--incomplete-profiles-6495d949.png`
- **Route demandée :** `/dashboard-rh/incomplete-profiles`
- **Route réelle :** `/dashboard-rh/incomplete-profiles`
- **Statut :** **accessible**

**Finalité**

Identifier les profils salariés incomplets.

**Observations directes**

- Filtres établissement/type d’information ; tableau Salarié, Début du contrat, Informations manquantes.
- Titres détectés dans le DOM : « Profils incomplets ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Filtrer puis ouvrir le profil pour compléter RUP, DPAE ou autres champs requis.
- Rôles concernés : Managers RH, directeurs et administrateurs ; certains exports ou documents exigent un rôle RH renforcé.

**Règles métier et dépendances — inférence**

- La complétude dépend du type de contrat, du statut et des exigences déclaratives.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Moteur de règles configurable, liens profonds, permissions RH et absence d’exposition excessive de données.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 14. `/dashboard-rh/absence-log` — Historiser les absences de l’effectif

- **Capture :** `dashboard-rh--absence-log-6571a205.png`
- **Route demandée :** `/dashboard-rh/absence-log`
- **Route réelle :** `/dashboard-rh/absence-log`
- **Statut :** **accessible**

**Finalité**

Historiser les absences de l’effectif.

**Observations directes**

- Filtres établissement, type d’absence et dates ; tableau Date, Statut, Salarié, Équipe, Type, Période et Durée.
- Titres détectés dans le DOM : « Journal des absences ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Rechercher une absence, trier, filtrer et consulter son dossier.
- Rôles concernés : Managers RH, directeurs et administrateurs ; certains exports ou documents exigent un rôle RH renforcé.

**Règles métier et dépendances — inférence**

- Durée et statut résultent du calendrier, de la politique et du workflow d’approbation.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Modèle temporel précis, pagination/export, règles de confidentialité médicale et historique de statut.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 15. `/dashboard-rh/analytics/summary` — Synthèse analytique RH multi-indicateurs

- **Capture :** `dashboard-rh--analytics--summary-7fe094db.png`
- **Route demandée :** `/dashboard-rh/analytics/summary`
- **Route réelle :** `/dashboard-rh/analytics/summary`
- **Statut :** **accessible**

**Finalité**

Synthèse analytique RH multi-indicateurs.

**Observations directes**

- Filtres période/établissement/équipe/contrat ; KPI effectifs, arrivées, départs, turnover ; graphiques de types de postes, âge, parité, motifs et heures d’absence/travaillées.
- Titres détectés dans le DOM : « Vue d'ensemble ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Changer le périmètre, comparer les périodes et exporter le tableau de bord.
- Rôles concernés : Managers RH, directeurs et administrateurs ; certains exports ou documents exigent un rôle RH renforcé.

**Règles métier et dépendances — inférence**

- Les indicateurs dérivent de contrats, mouvements, temps et absences ; mise à jour annoncée une fois par jour.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Dictionnaire de métriques, date de fraîcheur, confidentialité des petits effectifs, export et tests de cohérence.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 16. `/dashboard-rh/analytics/absence` — Analyser les absences et l’absentéisme

- **Capture :** `dashboard-rh--analytics--absence-24fe89e0.png`
- **Route demandée :** `/dashboard-rh/analytics/absence`
- **Route réelle :** `/dashboard-rh/analytics/absence`
- **Statut :** **accessible**

**Finalité**

Analyser les absences et l’absentéisme.

**Observations directes**

- Filtres analytiques partagés ; KPI heures d’absence et taux ; courbes d’évolution, comparaison par établissement et répartition par motifs.
- Titres détectés dans le DOM : « Absences ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Comparer périodes/établissements et identifier la contribution des catégories d’absence.
- Rôles concernés : Managers RH, directeurs et administrateurs ; certains exports ou documents exigent un rôle RH renforcé.

**Règles métier et dépendances — inférence**

- Taux = heures d’absence rapportées à une base d’heures dont la définition doit être stable.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Formaliser dénominateurs, exclusions, unités, confidentialité, données partielles et actualisation quotidienne.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 17. `/dashboard-rh/analytics/worked-hours` — Analyser les heures travaillées

- **Capture :** `dashboard-rh--analytics--worked-hours-436bf32b.png`
- **Route demandée :** `/dashboard-rh/analytics/worked-hours`
- **Route réelle :** `/dashboard-rh/analytics/worked-hours`
- **Statut :** **accessible**

**Finalité**

Analyser les heures travaillées.

**Observations directes**

- KPI d’heures, histogramme mensuel, courbe d’évolution et comparaison par établissement ; mêmes filtres analytiques.
- Titres détectés dans le DOM : « Heures travaillées ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Suivre tendances et écarts par période et établissement.
- Rôles concernés : Managers RH, directeurs et administrateurs ; certains exports ou documents exigent un rôle RH renforcé.

**Règles métier et dépendances — inférence**

- Source probable : heures validées/émargées, à distinguer des heures planifiées.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Définir précisément la source, gérer fuseaux/arrondis, corrections rétroactives et agrégations.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 18. `/dashboard-rh/analytics/workforce` — Analyser les effectifs et leurs mouvements

- **Capture :** `dashboard-rh--analytics--workforce-ca7d5f3f.png`
- **Route demandée :** `/dashboard-rh/analytics/workforce`
- **Route réelle :** `/dashboard-rh/analytics/workforce`
- **Statut :** **accessible**

**Finalité**

Analyser les effectifs et leurs mouvements.

**Observations directes**

- KPI effectif, arrivées, départs, turnover et taux de départ ; graphique combiné puis courbes par établissement.
- Titres détectés dans le DOM : « Effectifs ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Comparer les mouvements de personnel dans le temps et entre établissements.
- Rôles concernés : Managers RH, directeurs et administrateurs ; certains exports ou documents exigent un rôle RH renforcé.

**Règles métier et dépendances — inférence**

- Effectif de référence, date d’entrée/sortie et mode de calcul du turnover doivent être versionnés.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Éviter doubles comptes, contrats simultanés et biais sur petits volumes ; fournir définitions et exports.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 19. `/dashboard-rh/clock-in-out-follow-up` — Suivre les écarts entre planning et émargements

- **Capture :** `dashboard-rh--clock-in-out-follow-up-f8c70a76.png`
- **Route demandée :** `/dashboard-rh/clock-in-out-follow-up`
- **Route réelle :** `/dashboard-rh/clock-in-out-follow-up`
- **Statut :** **accessible**

**Finalité**

Suivre les écarts entre planning et émargements.

**Observations directes**

- Filtres établissement/dates, bouton Exporter, tableau Date, Salarié, Planifié, Émargé, Validé, deux types d’écarts, validateur et commentaire ; état vide visible.
- Titres détectés dans le DOM : « Suivi des émargements ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Rechercher les anomalies, exporter et investiguer les écarts de pointage.
- Rôles concernés : Managers RH, directeurs et administrateurs ; certains exports ou documents exigent un rôle RH renforcé.

**Règles métier et dépendances — inférence**

- Dépend du planning publié, des pointages et validations.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Conserver précision, raisons de correction, auteur, commentaire, statut et export conforme à la paie.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 20. `/dashboard-rh/contracts-changes` — Tracer les modifications apportées aux contrats

- **Capture :** `dashboard-rh--contracts-changes-d0cff662.png`
- **Route demandée :** `/dashboard-rh/contracts-changes`
- **Route réelle :** `/dashboard-rh/contracts-changes`
- **Statut :** **accessible**

**Finalité**

Tracer les modifications apportées aux contrats.

**Observations directes**

- Filtres établissement/dates ; tableau Date, Profil modifié, Impact, Modification apportée, Modifié par ; état sans donnée.
- Titres détectés dans le DOM : « Modifications de contrat ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Auditer qui a modifié quel élément contractuel et avec quel impact.
- Rôles concernés : Managers RH, directeurs et administrateurs ; certains exports ou documents exigent un rôle RH renforcé.

**Règles métier et dépendances — inférence**

- Les mutations contractuelles sensibles doivent être historisées et attribuées.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Journal append-only, avant/après, horodatage fiable, rétention et accès restreint.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 21. `/dashboard-rh/document-signing` — Piloter les demandes de signature électronique

- **Capture :** `dashboard-rh--document-signing-2f34d713.png`
- **Route demandée :** `/dashboard-rh/document-signing`
- **Route réelle :** `/dashboard-rh/document-signing`
- **Statut :** **accessible**

**Finalité**

Piloter les demandes de signature électronique.

**Observations directes**

- Titre Signature de documents, recherche/filtre de statut, CTA Nouvelle demande et tableau de demandes.
- Titres détectés dans le DOM : « Signature de documents ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Créer une demande, choisir documents/signataires, suivre statut, relancer ou consulter la preuve.
- Rôles concernés : Managers RH, directeurs et administrateurs ; certains exports ou documents exigent un rôle RH renforcé.

**Règles métier et dépendances — inférence**

- Le cycle attendu comporte préparation, envoi, signature/refus/expiration et preuve.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Prestataire de signature, consentement, horodatage, intégrité du document, webhooks idempotents et conservation probante.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 22. `/dashboard-rh/entries` — Lister et exporter les entrées de salariés

- **Capture :** `dashboard-rh--entries-d173a0d1.png`
- **Route demandée :** `/dashboard-rh/entries`
- **Route réelle :** `/dashboard-rh/entries`
- **Statut :** **accessible**

**Finalité**

Lister et exporter les entrées de salariés.

**Observations directes**

- Navigation RH, titre Entrées, filtres et tableau d’événements d’entrée ; bouton Exporter les entrées.
- Titres détectés dans le DOM : « Entrées ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Filtrer une période, vérifier les arrivées et produire un export administratif.
- Rôles concernés : Managers RH, directeurs et administrateurs ; certains exports ou documents exigent un rôle RH renforcé.

**Règles métier et dépendances — inférence**

- Une entrée dérive du début de contrat et du périmètre établissement/équipe.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Gérer réembauches, contrats multiples, corrections, format d’export et droits sur les données nominatives.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 23. `/dashboard-rh/exits` — Lister et exporter les sorties de salariés

- **Capture :** `dashboard-rh--exits-385f8679.png`
- **Route demandée :** `/dashboard-rh/exits`
- **Route réelle :** `/dashboard-rh/exits`
- **Statut :** **accessible**

**Finalité**

Lister et exporter les sorties de salariés.

**Observations directes**

- Titre Sorties, filtres et tableau ; bouton Exporter les sorties.
- Titres détectés dans le DOM : « Sorties ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Contrôler les départs sur une période et les exporter.
- Rôles concernés : Managers RH, directeurs et administrateurs ; certains exports ou documents exigent un rôle RH renforcé.

**Règles métier et dépendances — inférence**

- Une sortie dépend de la fin effective du contrat et de son motif/statut.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Distinguer prévisionnel/effectif, annulations, réembauches et confidentialité des motifs.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 24. `/dashboard-rh/paid-leaves` — Consulter et corriger les compteurs de congés payés

- **Capture :** `dashboard-rh--paid-leaves-3fdaa519.png`
- **Route demandée :** `/dashboard-rh/paid-leaves`
- **Route réelle :** `/dashboard-rh/paid-leaves`
- **Statut :** **accessible**

**Finalité**

Consulter et corriger les compteurs de congés payés.

**Observations directes**

- Recherche/filtres, statut Contrats en cours, tableau paginé de salariés anonymisés, compteurs et actions Voir le détail/Modifier/Exporter.
- Titres détectés dans le DOM : « Compteurs de congés payés ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Filtrer, ouvrir l’historique d’un compteur, appliquer une correction et exporter.
- Rôles concernés : Managers RH, directeurs et administrateurs ; certains exports ou documents exigent un rôle RH renforcé.

**Règles métier et dépendances — inférence**

- Acquisition, consommation, report et correction dépendent des contrats, absences et périodes de paie.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Ledger plutôt qu’un simple solde, justification obligatoire, audit, recalcul et gestion des clôtures.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 25. `/dashboard-rh/payslips` — Présenter l’offre payante de distribution dématérialisée des bulletins

- **Capture :** `dashboard-rh--payslips-2c5c19cf.png`
- **Route demandée :** `/dashboard-rh/payslips`
- **Route réelle :** `/dashboard-rh/payslips/marketing`
- **Statut :** **marketing**

**Finalité**

Présenter l’offre payante de distribution dématérialisée des bulletins.

**Observations directes**

- Page marketing avec plusieurs sections explicatives/illustrées et CTA Souscrire ; aucune liste de bulletins.
- Titres détectés dans le DOM : « Distribution dématérialisée des bulletins de paie », « Fiches de paie, importées ! », « Distribuer ? Rien de plus simple », « Tout est sur Combo », « Découvrez la nouvelle fonctionnalité de distribution dématérialisée des bulletins de paie ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Découvrir la fonctionnalité puis démarrer une souscription.
- Rôles concernés : Managers RH, directeurs et administrateurs ; certains exports ou documents exigent un rôle RH renforcé.

**Règles métier et dépendances — inférence**

- L’accès opérationnel est conditionné à l’abonnement.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Séparer marketing et produit, conserver le retour au contexte et ne jamais simuler un espace documentaire actif.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 26. `/dashboard-rh/payslips/history` — Route historique des bulletins, redirigée vers la page marketing

- **Capture :** `dashboard-rh--payslips--history-656a18fe.png`
- **Route demandée :** `/dashboard-rh/payslips/history`
- **Route réelle :** `/dashboard-rh/payslips/marketing`
- **Statut :** **marketing**

**Finalité**

Route historique des bulletins, redirigée vers la page marketing.

**Observations directes**

- Contenu identique à la page marketing de distribution des bulletins et CTA Souscrire.
- Titres détectés dans le DOM : « Distribution dématérialisée des bulletins de paie », « Fiches de paie, importées ! », « Distribuer ? Rien de plus simple », « Tout est sur Combo », « Découvrez la nouvelle fonctionnalité de distribution dématérialisée des bulletins de paie ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Aucun historique de bulletins n’est accessible dans l’état capturé.
- Rôles concernés : Managers RH, directeurs et administrateurs ; certains exports ou documents exigent un rôle RH renforcé.

**Règles métier et dépendances — inférence**

- Fonctionnalité probablement non souscrite ou non activée.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Redirection explicite avec motif ; prévoir entitlement, 403 fonctionnel et parcours d’activation réversible.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 27. `/dashboard-rh/residence-permit` — Suivre les titres de séjour et leurs échéances

- **Capture :** `dashboard-rh--residence-permit-b1bb29e3.png`
- **Route demandée :** `/dashboard-rh/residence-permit`
- **Route réelle :** `/dashboard-rh/residence-permit`
- **Statut :** **accessible**

**Finalité**

Suivre les titres de séjour et leurs échéances.

**Observations directes**

- Navigation RH, titre Titres de séjour, filtres et tableau de dossiers/échéances.
- Titres détectés dans le DOM : « Titres de séjour ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Identifier les documents expirant, ouvrir un profil et mettre à jour le justificatif.
- Rôles concernés : Managers RH, directeurs et administrateurs ; certains exports ou documents exigent un rôle RH renforcé.

**Règles métier et dépendances — inférence**

- Alertes basées sur date d’expiration, statut du salarié et présence du document.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Protection documentaire forte, alertes configurables, preuve de mise à jour, rétention et contrôle d’accès.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 28. `/dashboard-rh/trial-end` — Suivre les fins de période d’essai

- **Capture :** `dashboard-rh--trial-end-caa3b13e.png`
- **Route demandée :** `/dashboard-rh/trial-end`
- **Route réelle :** `/dashboard-rh/trial-end`
- **Statut :** **accessible**

**Finalité**

Suivre les fins de période d’essai.

**Observations directes**

- Titre Fins de période d’essai, filtres et tableau d’échéances.
- Titres détectés dans le DOM : « Fins de période d'essai ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Repérer les échéances et accéder au dossier salarié pour préparer une décision.
- Rôles concernés : Managers RH, directeurs et administrateurs ; certains exports ou documents exigent un rôle RH renforcé.

**Règles métier et dépendances — inférence**

- Échéance calculée depuis contrat, date de début, durée et renouvellement éventuel.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Calcul légal paramétrable, calendrier/jours, notifications, historique et absence d’automatisation de décision.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 29. `/timeoffs` — Point d’entrée des demandes d’absence, redirigé vers les demandes à traiter

- **Capture :** `timeoffs-5bec8195.png`
- **Route demandée :** `/timeoffs`
- **Route réelle :** `/timeoffs/pending`
- **Statut :** **redirigée**

**Finalité**

Point d’entrée des demandes d’absence, redirigé vers les demandes à traiter.

**Observations directes**

- Titre Demandes d’absence, CTA Nouvelle absence et onglets À traiter, Traitées, Expirées, Calendrier ; liste de demandes en attente.
- Titres détectés dans le DOM : « Demandes d'absence ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Créer une absence ou accepter/refuser les demandes pendantes.
- Rôles concernés : Managers, RH et direction ; salarié en self-service pour ses propres demandes selon droits.

**Règles métier et dépendances — inférence**

- Statuts, politiques, soldes, chevauchements et rôles d’approbation conditionnent les actions.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Machine à états, autorisations, notifications, contrôle de solde et transactions avec le planning.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 30. `/timeoffs/calendar` — Visualiser les absences dans un calendrier

- **Capture :** `timeoffs--calendar-105fd8b1.png`
- **Route demandée :** `/timeoffs/calendar`
- **Route réelle :** `/timeoffs/calendar`
- **Statut :** **accessible**

**Finalité**

Visualiser les absences dans un calendrier.

**Observations directes**

- Même en-tête et onglets ; calendrier par établissement avec absences positionnées dans le temps.
- Titres détectés dans le DOM : « Demandes d'absence ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Naviguer dans les périodes, filtrer et ouvrir/créer une absence.
- Rôles concernés : Managers, RH et direction ; salarié en self-service pour ses propres demandes selon droits.

**Règles métier et dépendances — inférence**

- Le calendrier combine demandes selon statut et droits de visibilité.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Rendu performant, accessibilité, fuseaux, chevauchements, codes couleur avec libellés et confidentialité.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 31. `/timeoffs/pending` — Traiter la file des demandes d’absence en attente

- **Capture :** `timeoffs--pending-9b5fdee8.png`
- **Route demandée :** `/timeoffs/pending`
- **Route réelle :** `/timeoffs/pending`
- **Statut :** **accessible**

**Finalité**

Traiter la file des demandes d’absence en attente.

**Observations directes**

- Onglet Demandes à traiter actif, filtres et liste/tableau de demandes ; CTA Nouvelle absence.
- Titres détectés dans le DOM : « Demandes d'absence ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Ouvrir une demande, vérifier solde/conflits puis approuver ou refuser.
- Rôles concernés : Managers, RH et direction ; salarié en self-service pour ses propres demandes selon droits.

**Règles métier et dépendances — inférence**

- Une décision doit être attribuée, datée et propagée aux compteurs et planning.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Décision atomique, concurrence, commentaire, notifications, délégation et journalisation.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 32. `/timeoffs/treated` — Consulter les demandes d’absence déjà traitées

- **Capture :** `timeoffs--treated-1418882e.png`
- **Route demandée :** `/timeoffs/treated`
- **Route réelle :** `/timeoffs/treated`
- **Statut :** **accessible**

**Finalité**

Consulter les demandes d’absence déjà traitées.

**Observations directes**

- Onglet Demandes traitées actif, liste paginée et filtres.
- Titres détectés dans le DOM : « Demandes d'absence ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Rechercher l’historique des décisions et consulter le détail.
- Rôles concernés : Managers, RH et direction ; salarié en self-service pour ses propres demandes selon droits.

**Règles métier et dépendances — inférence**

- Les décisions passées ne doivent pas être modifiées sans workflow d’annulation/correction.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Historique immuable, pagination serveur, export éventuel et visibilité selon périmètre.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 33. `/timeoffs/expired` — Consulter les demandes d’absence expirées

- **Capture :** `timeoffs--expired-ea098c0b.png`
- **Route demandée :** `/timeoffs/expired`
- **Route réelle :** `/timeoffs/expired`
- **Statut :** **accessible**

**Finalité**

Consulter les demandes d’absence expirées.

**Observations directes**

- Onglet Demandes expirées actif avec liste/état de contenu et filtres.
- Titres détectés dans le DOM : « Demandes d'absence ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Identifier les demandes restées sans décision et les archiver ou les traiter selon règle.
- Rôles concernés : Managers, RH et direction ; salarié en self-service pour ses propres demandes selon droits.

**Règles métier et dépendances — inférence**

- L’expiration dépend d’une échéance métier à définir.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Documenter le délai, notifier avant expiration, conserver la preuve et prévoir reprise contrôlée.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 34. `/articles` — Publier et gérer des articles internes

- **Capture :** `articles-429717a2.png`
- **Route demandée :** `/articles`
- **Route réelle :** `/articles`
- **Statut :** **accessible**

**Finalité**

Publier et gérer des articles internes.

**Observations directes**

- Titre Articles, CTA Ajouter un article, liste paginée avec au moins un article et panneau d’aide expliquant l’usage.
- Titres détectés dans le DOM : « Articles », « Pause », « Guide d'utilisation combo », « Comment utiliser les articles ? ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Créer, éditer, publier/archiver et consulter un article.
- Rôles concernés : Managers, auteurs internes et salariés destinataires.

**Règles métier et dépendances — inférence**

- Visibilité probablement liée à l’établissement, l’audience et au statut de publication.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Éditeur sécurisé, pièces jointes, brouillons, dates, audiences, lecture et modération.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 35. `/conversations` — Gérer les conversations internes

- **Capture :** `conversations-76a68f29.png`
- **Route demandée :** `/conversations`
- **Route réelle :** `/conversations`
- **Statut :** **accessible**

**Finalité**

Gérer les conversations internes.

**Observations directes**

- Titre Discussions, colonne/liste de conversations, onglets Tout/Non lu/Archivé et zone de contenu.
- Titres détectés dans le DOM : « Discussions ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Ouvrir, envoyer, marquer lu, archiver et rechercher une discussion.
- Rôles concernés : Managers, auteurs internes et salariés destinataires.

**Règles métier et dépendances — inférence**

- Participants et visibilité sont liés aux comptes et équipes.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Temps réel, accusés de lecture, pièces jointes, anti-abus, rétention, recherche et notifications.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 36. `/electronic-signature` — Importer un document dans le parcours de signature

- **Capture :** `electronic-signature-0423eb58.png`
- **Route demandée :** `/electronic-signature`
- **Route réelle :** `/electronic-signature`
- **Statut :** **accessible**

**Finalité**

Importer un document dans le parcours de signature.

**Observations directes**

- Écran focalisé « Importer un document », zone de dépôt/sélection et boutons Fermer/Importer.
- Titres détectés dans le DOM : « Importer un document ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Choisir un fichier, le téléverser puis poursuivre la préparation de signature.
- Rôles concernés : Managers, auteurs internes et salariés destinataires.

**Règles métier et dépendances — inférence**

- Formats, taille, sécurité et intégrité doivent être validés avant stockage.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Scan antivirus, stockage chiffré, upload repris, checksum, limites explicites et suppression des fichiers orphelins.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 37. `/settings` — Entrée générique des réglages, redirigée vers les établissements

- **Capture :** `settings-a6640f1b.png`
- **Route demandée :** `/settings`
- **Route réelle :** `/settings/locations`
- **Statut :** **redirigée**

**Finalité**

Entrée générique des réglages, redirigée vers les établissements.

**Observations directes**

- Navigation latérale complète des réglages ; titre Établissements, recherche, filtre actifs, tableau établissement/adresse/équipes et CTA d’ajout.
- Titres détectés dans le DOM : « Établissements ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Rechercher, ouvrir ou créer un établissement.
- Rôles concernés : Administrateurs du compte et direction ; sous-rôles spécialisés possibles pour paie/RH.

**Règles métier et dépendances — inférence**

- L’établissement porte des paramètres de convention, planning et productivité.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Route par défaut explicite, RBAC administrateur et intégrité référentielle avant archivage.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 38. `/settings/adp` — Ancienne route ADP redirigée vers les établissements

- **Capture :** `settings--adp-0ebef0dd.png`
- **Route demandée :** `/settings/adp`
- **Route réelle :** `/settings/locations`
- **Statut :** **redirigée**

**Finalité**

Ancienne route ADP redirigée vers les établissements.

**Observations directes**

- Même écran Établissements que la route de réglages générique.
- Titres détectés dans le DOM : « Établissements ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Aucun paramètre ADP spécifique n’est observable.
- Rôles concernés : Administrateurs du compte et direction ; sous-rôles spécialisés possibles pour paie/RH.

**Règles métier et dépendances — inférence**

- Route probablement obsolète ou fonctionnalité indisponible.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Ne pas copier une redirection opaque ; migrer les liens et afficher un statut fonctionnel clair.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 39. `/settings/cash-register` — Ancienne route caisse redirigée vers les établissements

- **Capture :** `settings--cash-register-c5c45a74.png`
- **Route demandée :** `/settings/cash-register`
- **Route réelle :** `/settings/locations`
- **Statut :** **redirigée**

**Finalité**

Ancienne route caisse redirigée vers les établissements.

**Observations directes**

- Même écran Établissements, sans réglage de caisse visible.
- Titres détectés dans le DOM : « Établissements ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Aucun workflow caisse propre n’est accessible depuis cette route.
- Rôles concernés : Administrateurs du compte et direction ; sous-rôles spécialisés possibles pour paie/RH.

**Règles métier et dépendances — inférence**

- La caisse est peut-être désormais gérée par établissement ou via Marketplace.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Cartographier les intégrations caisse ; éviter routes mortes et perte silencieuse de contexte.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 40. `/settings/collective-agreement` — Configurer la convention collective

- **Capture :** `settings--collective-agreement-c85be4e3.png`
- **Route demandée :** `/settings/collective-agreement`
- **Route réelle :** `/settings/collective-agreement`
- **Statut :** **accessible**

**Finalité**

Configurer la convention collective.

**Observations directes**

- Formulaire par établissement : convention sélectionnée, recherche Code APE, accordéon Règles de la convention et bouton Enregistrer.
- Titres détectés dans le DOM : « Convention Collective », « La Foir'Fouille ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Sélectionner la convention, renseigner le code APE, examiner les règles et sauvegarder.
- Rôles concernés : Administrateurs du compte et direction ; sous-rôles spécialisés possibles pour paie/RH.

**Règles métier et dépendances — inférence**

- Ces paramètres peuvent piloter majorations, repos, jours fériés et validations de planning/paie.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Versionner les règles, dater leur effet, valider les codes, tracer les changements et séparer conseil juridique/configuration.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 41. `/settings/contact` — Modifier les informations du compte société

- **Capture :** `settings--contact-fb657344.png`
- **Route demandée :** `/settings/contact`
- **Route réelle :** `/settings/contact`
- **Statut :** **accessible**

**Finalité**

Modifier les informations du compte société.

**Observations directes**

- Formulaire Nom de la société, Adresse, Code postal, Pays, Fuseau horaire et bouton Enregistrer.
- Titres détectés dans le DOM : « Informations sur le compte ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Mettre à jour l’identité et la localisation du compte.
- Rôles concernés : Administrateurs du compte et direction ; sous-rôles spécialisés possibles pour paie/RH.

**Règles métier et dépendances — inférence**

- Pays et fuseau influencent dates, calendriers et traitements.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Validation d’adresse, fuseau IANA, historique, impacts propagés et permissions administrateur.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 42. `/settings/job-title` — Gérer le référentiel des emplois

- **Capture :** `settings--job-title-1eb80d37.png`
- **Route demandée :** `/settings/job-title`
- **Route réelle :** `/settings/job-title`
- **Statut :** **accessible**

**Finalité**

Gérer le référentiel des emplois.

**Observations directes**

- Recherche, compteur d’emplois, sélection multiple, bouton Regrouper les emplois, tableau Emploi/Actions et CTA Ajouter.
- Titres détectés dans le DOM : « Gestion des emplois ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Créer, renommer, regrouper ou archiver des emplois.
- Rôles concernés : Administrateurs du compte et direction ; sous-rôles spécialisés possibles pour paie/RH.

**Règles métier et dépendances — inférence**

- Un emploi peut être référencé par profils, planning, analyses et documents.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Empêcher suppression destructive, proposer fusion avec aperçu des impacts et conserver aliases/historique.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 43. `/settings/legal/rgpd` — Mettre à disposition le contrat RGPD de sous-traitance

- **Capture :** `settings--legal--rgpd-04701b4f.png`
- **Route demandée :** `/settings/legal/rgpd`
- **Route réelle :** `/settings/legal/rgpd`
- **Statut :** **accessible**

**Finalité**

Mettre à disposition le contrat RGPD de sous-traitance.

**Observations directes**

- Long document juridique structuré en contrat et annexes de traitement/sécurité, affiché dans l’interface de réglages.
- Titres détectés dans le DOM : « DPA - Contrat de sous-traitance (Combo) », « Contrat de sous-traitance », « ANNEXE 1 – DESCRIPTION DU TRAITEMENT FAISANT L’OBJET DE LA SOUS-TRAITANCE », « ANNEXE 2 – MESURES DE SECURITE ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Lire ou conserver la version contractuelle applicable.
- Rôles concernés : Administrateurs du compte et direction ; sous-rôles spécialisés possibles pour paie/RH.

**Règles métier et dépendances — inférence**

- Le contenu doit correspondre à une version datée et opposable.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Versionnage, date d’effet, téléchargement, preuve d’acceptation, accessibilité et source juridique maîtrisée.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 44. `/settings/locations` — Administrer les établissements et leurs équipes

- **Capture :** `settings--locations-fcd0c32d.png`
- **Route demandée :** `/settings/locations`
- **Route réelle :** `/settings/locations`
- **Statut :** **accessible**

**Finalité**

Administrer les établissements et leurs équipes.

**Observations directes**

- Recherche, filtre Établissements actifs, tableau Établissement/Adresse/Équipes et CTA Ajouter un établissement.
- Titres détectés dans le DOM : « Établissements ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Créer, consulter, modifier ou archiver un établissement.
- Rôles concernés : Administrateurs du compte et direction ; sous-rôles spécialisés possibles pour paie/RH.

**Règles métier et dépendances — inférence**

- Archivage contraint par salariés, équipes, plannings, paies et intégrations associés.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Identifiants stables, archivage non destructif, dépendances visibles, droits et validation d’adresse.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 45. `/settings/marketplace` — Configurer les intégrations tierces

- **Capture :** `settings--marketplace-dcc3a936.png`
- **Route demandée :** `/settings/marketplace`
- **Route réelle :** `/settings/marketplace`
- **Statut :** **accessible**

**Finalité**

Configurer les intégrations tierces.

**Observations directes**

- Titre Intégration, filtres catégorie/recherche et grille Marketplace de connecteurs paie/caisse ; cartes Configurer ou Connecter.
- Titres détectés dans le DOM : « Intégration », « Marketplace ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Découvrir un connecteur, l’autoriser, le configurer, tester puis le déconnecter.
- Rôles concernés : Administrateurs du compte et direction ; sous-rôles spécialisés possibles pour paie/RH.

**Règles métier et dépendances — inférence**

- Chaque fournisseur a scopes, secrets, mapping et synchronisation propres.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Coffre de secrets, OAuth, webhooks idempotents, journal de sync, reprise d’erreur, révocation et contrats d’adaptateurs.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 46. `/settings/notification` — Gérer l’éligibilité aux notifications SMS

- **Capture :** `settings--notification-b3361c7b.png`
- **Route demandée :** `/settings/notification`
- **Route réelle :** `/settings/notification`
- **Statut :** **accessible**

**Finalité**

Gérer l’éligibilité aux notifications SMS.

**Observations directes**

- Recherche et filtres dont Contrat en cours ; tableau Salarié, Téléphone mobile, E-mail et contrôles de notification.
- Titres détectés dans le DOM : « Notifications SMS ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Filtrer les salariés et activer/désactiver l’envoi selon coordonnées et contrat.
- Rôles concernés : Administrateurs du compte et direction ; sous-rôles spécialisés possibles pour paie/RH.

**Règles métier et dépendances — inférence**

- Nécessite numéro valide, consentement/base légale, statut actif et quotas fournisseur.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Normalisation E.164, opt-out, journal d’envoi, coûts/quota, erreurs opérateur et masquage des coordonnées.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 47. `/settings/pay-preferences` — Configurer le fonctionnement de la paie

- **Capture :** `settings--pay-preferences-24fed85f.png`
- **Route demandée :** `/settings/pay-preferences`
- **Route réelle :** `/settings/pay-preferences`
- **Statut :** **accessible**

**Finalité**

Configurer le fonctionnement de la paie.

**Observations directes**

- Sections Périodes de paie, Matricules salariés, Rôles et permissions ; interrupteurs pour lissage, repas, génération de matricules et capacités directeurs/managers.
- Titres détectés dans le DOM : « Paie », « Périodes de paie », « Matricules salariés », « Rôles et permissions ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Activer des options de calcul et déléguer certaines opérations de paie.
- Rôles concernés : Administrateurs du compte et direction ; sous-rôles spécialisés possibles pour paie/RH.

**Règles métier et dépendances — inférence**

- Les bascules affectent calculs, exports et visibilité des primes ; certaines options comportent un avertissement.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Feature flags versionnés, contrôle de dépendances, confirmation, audit et tests de non-régression des calculs.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 48. `/settings/payroll-software` — Route d’ancien logiciel de paie redirigée vers les établissements

- **Capture :** `settings--payroll-software-1717bab5.png`
- **Route demandée :** `/settings/payroll-software`
- **Route réelle :** `/settings/locations`
- **Statut :** **redirigée**

**Finalité**

Route d’ancien logiciel de paie redirigée vers les établissements.

**Observations directes**

- Même liste Établissements ; aucun sélecteur de logiciel de paie visible.
- Titres détectés dans le DOM : « Établissements ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Aucun paramétrage spécifique n’est observable.
- Rôles concernés : Administrateurs du compte et direction ; sous-rôles spécialisés possibles pour paie/RH.

**Règles métier et dépendances — inférence**

- La configuration a peut-être migré vers Marketplace ou au niveau établissement.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Prévoir migration de données/liens et message explicite plutôt qu’une redirection silencieuse.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 49. `/settings/preferences` — Configurer les préférences globales du produit

- **Capture :** `settings--preferences-b8727be2.png`
- **Route demandée :** `/settings/preferences`
- **Route réelle :** `/settings/preferences`
- **Statut :** **accessible**

**Finalité**

Configurer les préférences globales du produit.

**Observations directes**

- Trois cartes Plannings, Droits et Général ; nombreux interrupteurs, sélecteurs d’heure/devise/délai et boutons Enregistrer par section.
- Titres détectés dans le DOM : « Préférences », « Plannings », « Droits », « Général ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Modifier règles d’affichage et de planning, droits employés/managers et options générales.
- Rôles concernés : Administrateurs du compte et direction ; sous-rôles spécialisés possibles pour paie/RH.

**Règles métier et dépendances — inférence**

- Les droits doivent rester subordonnés au RBAC serveur ; les préférences affectent plusieurs modules.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Schéma de configuration typé, valeurs par défaut, validations croisées, audit, portée claire et déploiement atomique.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 50. `/settings/print` — Définir les options d’impression PDF des plannings

- **Capture :** `settings--print-9b059602.png`
- **Route demandée :** `/settings/print`
- **Route réelle :** `/settings/print`
- **Statut :** **accessible**

**Finalité**

Définir les options d’impression PDF des plannings.

**Observations directes**

- Carte Impression PDF avec orientation paysage/portrait, taille, bascules totaux/shifts/dimanche/émargements et Enregistrer.
- Titres détectés dans le DOM : « Impression », « Impression PDF ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Choisir les options puis générer ultérieurement des PDF cohérents.
- Rôles concernés : Administrateurs du compte et direction ; sous-rôles spécialisés possibles pour paie/RH.

**Règles métier et dépendances — inférence**

- Les options s’appliquent au rendu de planning et doivent respecter pagination et confidentialité.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Moteur PDF déterministe, aperçu, polices embarquées, pagination, gros volumes et tests visuels.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 51. `/settings/productivity` — Définir l’objectif global de productivité

- **Capture :** `settings--productivity-816bbc7b.png`
- **Route demandée :** `/settings/productivity`
- **Route réelle :** `/settings/productivity`
- **Statut :** **accessible**

**Finalité**

Définir l’objectif global de productivité.

**Observations directes**

- Carte Productivité des établissements, champ objectif avec unité €/h et bouton Enregistrer.
- Titres détectés dans le DOM : « Productivité », « Productivité des établissements ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Saisir l’objectif utilisé dans les tableaux de bord/plannings.
- Rôles concernés : Administrateurs du compte et direction ; sous-rôles spécialisés possibles pour paie/RH.

**Règles métier et dépendances — inférence**

- La productivité combine chiffre d’affaires et heures selon une formule à documenter.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Validation numérique, devise/unité, historique, date d’effet, objectifs par établissement et données manquantes.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 52. `/settings/roles-permissions` — Route rôles-permissions redirigée vers les établissements

- **Capture :** `settings--roles-permissions-e662af19.png`
- **Route demandée :** `/settings/roles-permissions`
- **Route réelle :** `/settings/locations`
- **Statut :** **redirigée**

**Finalité**

Route rôles-permissions redirigée vers les établissements.

**Observations directes**

- Même écran Établissements, sans matrice de rôles ni permissions.
- Titres détectés dans le DOM : « Établissements ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Aucune administration des rôles n’est accessible via la route demandée.
- Rôles concernés : Administrateurs du compte et direction ; sous-rôles spécialisés possibles pour paie/RH.

**Règles métier et dépendances — inférence**

- Fonction déplacée, supprimée ou non autorisée.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Ne pas inférer une matrice absente ; implémenter RBAC documenté et une réponse 403/404 ou migration explicite.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 53. `/settings/subscription` — Route de réglage d’abonnement techniquement accessible mais sans contenu métier

- **Capture :** `settings--subscription-91f95b49.png`
- **Route demandée :** `/settings/subscription`
- **Route réelle :** `/settings/subscription`
- **Statut :** **accessible**

**Finalité**

Route de réglage d’abonnement techniquement accessible mais sans contenu métier.

**Observations directes**

- Seuls l’en-tête global, les bandeaux et la fenêtre de satisfaction apparaissent ; corps blanc, sans titre ni action d’abonnement.
- Titres détectés dans le DOM : aucun titre métier détecté.
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Aucun workflow d’abonnement n’est observable sur cette route.
- Rôles concernés : Administrateurs du compte et direction ; sous-rôles spécialisés possibles pour paie/RH.

**Règles métier et dépendances — inférence**

- Peut être route résiduelle, erreur de chargement ou garde d’accès.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Afficher chargement/erreur/redirect explicite ; privilégier la route canonique `/subscriptions`.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 54. `/settings/template-documents` — Gérer des modèles de documents personnalisables

- **Capture :** `settings--template-documents-52623159.png`
- **Route demandée :** `/settings/template-documents`
- **Route réelle :** `/settings/template-documents`
- **Statut :** **accessible**

**Finalité**

Gérer des modèles de documents personnalisables.

**Observations directes**

- Titre, aide, CTA Utiliser les variables/Ajouter un modèle, bannière de modèles Combo, onglets modèles/variables et tableau de modèles avec actions.
- Titres détectés dans le DOM : « Modèles de documents », « Vos modèles de documents clé en main ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Créer/importer, éditer, dupliquer ou supprimer un modèle et insérer des variables d’établissement/salarié.
- Rôles concernés : Administrateurs du compte et direction ; sous-rôles spécialisés possibles pour paie/RH.

**Règles métier et dépendances — inférence**

- Variables résolues selon contexte et permissions ; modèles servent aux contrats/avenants/attestations.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Moteur de template sûr, prévisualisation, validation des variables, versions, pièces jointes et protection contre injection.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 55. `/settings/timeclock` — Activer l’option Pointeuse Combo

- **Capture :** `settings--timeclock-3b48f15d.png`
- **Route demandée :** `/settings/timeclock`
- **Route réelle :** `/settings/timeclock`
- **Statut :** **accessible**

**Finalité**

Activer l’option Pointeuse Combo.

**Observations directes**

- Page explicative réglementaire, compatibilité mobile et carte d’activation avec bouton Activer l’option.
- Titres détectés dans le DOM : « Pointeuse », « La pointeuse Combo ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Souscrire/activer la pointeuse puis déployer l’application sur appareil compatible.
- Rôles concernés : Administrateurs du compte et direction ; sous-rôles spécialisés possibles pour paie/RH.

**Règles métier et dépendances — inférence**

- Activation conditionne collecte de pointages, rapports et potentiellement facturation.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Consentement et information, mode hors ligne, identité appareil, anti-fraude, synchronisation et procédure de désactivation.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 56. `/settings/timeoff-policies` — Administrer les politiques de RTT

- **Capture :** `settings--timeoff-policies-79b2d96e.png`
- **Route demandée :** `/settings/timeoff-policies`
- **Route réelle :** `/settings/timeoff-policies`
- **Statut :** **accessible**

**Finalité**

Administrer les politiques de RTT.

**Observations directes**

- Filtre Politiques actives, CTA Créer une politique, tableau Politique/Statut/Jours acquis/Période/Assignation.
- Titres détectés dans le DOM : « Politique de RTT ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Créer, assigner, consulter ou archiver une politique.
- Rôles concernés : Administrateurs du compte et direction ; sous-rôles spécialisés possibles pour paie/RH.

**Règles métier et dépendances — inférence**

- Une politique est créée une fois, renouvelée annuellement ; archiver suspend le renouvellement selon le texte visible.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Moteur d’acquisition versionné, dates d’effet, assignations, renouvellement idempotent et simulation avant archivage.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 57. `/settings/wage-ratio` — Configurer le coût des shifts pour l’analyse du planning

- **Capture :** `settings--wage-ratio-5f9838f0.png`
- **Route demandée :** `/settings/wage-ratio`
- **Route réelle :** `/settings/wage-ratio`
- **Statut :** **accessible**

**Finalité**

Configurer le coût des shifts pour l’analyse du planning.

**Observations directes**

- Carte Coût des shifts avec taux de cotisations patronales, options d’ajustement via interrupteurs et Enregistrer.
- Titres détectés dans le DOM : « Analyse du planning », « Coût des shifts ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Renseigner hypothèses de coût puis les appliquer aux analyses.
- Rôles concernés : Administrateurs du compte et direction ; sous-rôles spécialisés possibles pour paie/RH.

**Règles métier et dépendances — inférence**

- Le coût estimé dépend salaires, charges, majorations et règles conventionnelles.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Distinguer estimation/paie réelle, pourcentages validés, date d’effet, confidentialité salariale et explicabilité.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

### 58. `/subscription` — Administrer l’abonnement et la facturation

- **Capture :** `subscription-21669cd4.png`
- **Route demandée :** `/subscription`
- **Route réelle :** `/subscriptions`
- **Statut :** **redirigée**

**Finalité**

Administrer l’abonnement et la facturation.

**Observations directes**

- Route canonique au pluriel ; plan actuel People et fonctionnalités incluses, bouton Changer de plan, paramètres de facturation, tableau paginé de factures avec statut, prochain paiement et zone Suspendre l’abonnement.
- Titres détectés dans le DOM : « Abonnement », « People », « Plan actuel », « Paramètres de facturation », « Factures », « Suspendre l'abonnement ».
- En-tête Combo persistant avec navigation principale, alertes globales et aide flottante. Une fenêtre de satisfaction SatisMeter masque partiellement la zone centrale sur la capture ; elle est un surcalque, pas le contenu métier de la page.

**Données manipulées ou affichées**

- Les catégories de données sont celles matérialisées par les champs, cartes, filtres ou colonnes décrits ci-dessus ; les valeurs nominatives restent notées `[collaborateur]` dans cet audit.
- La route finale et l’état de l’écran sont des données de navigation à conserver pour diagnostiquer les redirections et droits.

**Actions et workflows probables — inférence**

- Changer de plan, modifier la facturation, télécharger une facture et suspendre l’abonnement.
- Rôles concernés : Administrateurs du compte et direction ; sous-rôles spécialisés possibles pour paie/RH.

**Règles métier et dépendances — inférence**

- Entitlements et facturation dépendent du plan, du cycle, des établissements et du statut de paiement.
- Dépendances transverses : authentification, autorisations par rôle et établissement, référentiels du compte, journal d’audit et notifications lorsque l’action produit un changement.

**Risques et exigences de réimplémentation indépendante**

- Intégration PSP idempotente, portail facturation, taxes, prorata, factures immuables, webhooks, suspension réversible et contrôle d’accès propriétaire.
- Reproduire le comportement métier, non les éléments de marque ou le code propriétaire ; prévoir états chargement/vide/erreur/interdit, accessibilité clavier, responsive, observabilité et tests d’autorisation.
- Le surcalque SatisMeter ne doit pas être pris comme exigence fonctionnelle du module ; tout mécanisme équivalent doit rester non bloquant et accessible.

## Synthèse transversale

1. **Navigation et routes.** 48 écrans sont atteints sur leur route demandée, 8 sont redirigés vers un autre écran fonctionnel, et 2 aboutissent à une page marketing. Les routes historiques doivent être migrées ou répondre explicitement, plutôt que masquer l’absence de fonctionnalité.
2. **Architecture fonctionnelle.** Les écrans se répartissent entre accueil/suivi, planning, équipe/paie, tableau de bord RH, absences, communication, signature, réglages et abonnement. Les référentiels salariés, contrats, établissements et équipes sont partagés par presque tous les modules.
3. **Sécurité.** La réimplémentation doit appliquer les autorisations côté serveur, limiter le périmètre établissement, protéger les données RH et de paie, et journaliser exports, validations, corrections et changements de configuration.
4. **Temporalité.** Planning, pointage, absences, contrats, paie et analytics exigent un modèle cohérent de dates, fuseaux, périodes, dates d’effet, verrouillages et corrections rétroactives.
5. **Auditabilité.** Les workflows sensibles doivent conserver auteur, horodatage, avant/après, justification, statut et éventuelle preuve externe. Les agrégats analytiques doivent être explicables depuis leurs sources.
6. **UX observée.** Des bandeaux globaux et une enquête SatisMeter occupent une place importante et masquent parfois les contrôles. Les composants transverses doivent être dismissibles, non bloquants et testés avec lecteurs d’écran.
7. **Indépendance.** Construire des modèles de domaine et règles documentées à partir des besoins observés ; ne pas copier l’identité visuelle, les textes propriétaires au-delà des libellés nécessaires, ni supposer les règles cachées sans validation.
