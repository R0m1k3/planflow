# Cartographie fonctionnelle des artefacts publics Combo

**Objet :** spécification fonctionnelle de référence pour une réimplémentation indépendante (« clean room »).  
**Sources analysées :** bundles publics `index`, `vendor`, styles, chunk de connexion et extraction de chaînes ; inventaire de crawl authentifié **strictement en lecture seule** du 7 août 2026.  
**Hors périmètre :** reproduction du code, de la marque, des textes marketing, des illustrations, de l'identité visuelle ou des données d'un client.

## 1. Légende et niveau de preuve

| Marqueur | Signification |
|---|---|
| **C — bundle** | Route, endpoint, permission ou comportement littéralement présent dans un bundle public. |
| **C — crawl** | Page ou requête GET effectivement observée pendant le crawl en lecture seule. |
| **I — forte** | Déduction convergente (route + nom de module + permission ou endpoint), sans exécution du workflow. |
| **I — faible** | Hypothèse de conception à valider ; ne doit pas être traitée comme compatibilité garantie. |

Les méthodes HTTP indiquées comme « surface » sont déduites des fonctions clientes adjacentes dans le bundle ; la proximité dans un fichier minifié peut créer des faux positifs. Les seules requêtes réseau exécutées par le crawl étaient des **GET**, à l'exception du POST d'authentification. Aucun payload métier en écriture n'a été envoyé.

## 2. Résumé exécutif

Le produit observable est une SPA RH multi-établissements organisée autour de six agrégats :

1. **Organisation** : compte, établissements, équipes, rattachements et rôles.
2. **Personnel** : profil salarié, contrat, documents, DPAE/RUP, titres de séjour et onboarding/offboarding.
3. **Planification et temps** : planning hebdomadaire/journalier, shifts, pauses, repos, heures réelles, pointage et feuilles de temps signables.
4. **Absences et compteurs** : demandes, validation, congés payés, RTT/RCR, prévisions et ajustements de compteurs.
5. **Paie et rapports** : périodes de paie, verrouillage, exports, contrôles, intégrations paie et historique.
6. **Communication et administration** : articles, conversations, notifications, paramétrage, intégrations et abonnement.

L'autorisation est **par capacités**, avec périmètre organisationnel, plutôt qu'un simple test de rôle. Les rôles sont configurables via `/settings/roles-permissions/:roleKey`. La réimplémentation devrait donc séparer `Role`, `Permission` et `Scope` dès le départ.

## 3. Architecture fonctionnelle déductible

### 3.1 Front-end et services transverses

- **SPA React avec découpage dynamique par domaine** : 352 imports dynamiques dans le bundle principal et des chunks nommés `Planning`, `Articles`, `Conversations`, `SubscriptionsView`, `Settings`, etc. **C — bundle**
- **Routage client** et paramètres de route (`:membership_id`, `:location_id`, `:roleKey`, etc.). **C — bundle**
- **État/cache asynchrone** : indices de Redux et React Query ; client HTTP de type Axios. **C — bundle**
- **Validation de formulaires** : Yup et Zod ; i18n. Le formulaire de connexion valide email + mot de passe, propose « mot de passe oublié » et l'inscription. **C — bundle**
- **API principale** sous `https://api…/api/v2`, avec ressource `/me`, feature flags et identifiant de compte transmis au contexte. **C — bundle / crawl**
- **Feature flags** au niveau utilisateur/compte. **C — bundle / crawl**
- **Télémétrie/support** : analytics, suivi d'erreurs/session et feedback utilisateur sont présents. Leur reproduction n'est pas nécessaire ; prévoir seulement une interface abstraite de télémétrie avec consentement. **C — bundle, I — forte**
- **Facturation externe** : jeton de facturation, intégration Stripe et routes d'abonnement/factures. **C — bundle / crawl**

### 3.2 Découpage recommandé pour une réimplémentation

```text
Identity & Access
  ├─ Auth / invitation / récupération
  ├─ Membership / Role / Permission / Scope
Organization
  ├─ Account / Location / Team / JobTitle / Label
People
  ├─ EmployeeProfile / Contract / Amendment
  ├─ Compliance (DPAE, RUP, work permit)
  └─ Document / Template / Signature
Workforce
  ├─ WeeklySchedule / Shift / Rest / DailyNote
  ├─ Clocking / ActualHours / Timesheet
  └─ PlanningAnalysis / Alert / PredictiveSchedule
Leave
  ├─ TimeOff / Policy / Approval
  └─ Counter / Ledger / Forecast
Payroll & Reporting
  ├─ PayPeriod / PayrollReport / Export
  └─ ActivityLog / Analytics
Communication
  ├─ Article / Conversation / Notification
Billing & Integrations
  ├─ Subscription / Invoice
  └─ Payroll, POS and calendar connectors
```

## 4. Cartographie des routes UI

### 4.1 Accès et cycle de compte

| Routes | Fonction | Preuve |
|---|---|---|
| `/users/sign_in`, `/users/sign_out` | Connexion email/mot de passe et déconnexion. | **C — bundle**, connexion observée par le crawl |
| `/users/password/forgotten`, `/users/password/edit` | Mot de passe oublié et réinitialisation. | **C — bundle** |
| `/users/invitation`, `/users/invitation/accept`, `/users/invitation/awaiting`, `/users/invitation/not_sent` | Invitation et états de distribution. | **C — bundle** |
| `/users/sign_up`, `/users/sign_up_company`, `/signup` | Inscription utilisateur/entreprise. | **C — bundle** |
| `/account_creation/user_info`, `/account_creation/company_info` | Assistant de création du compte. | **C — bundle** |
| `/activation/companies`, `/activation/locations`, `/activation/collective_agreements` | Activation et configuration initiale de l'organisation. | **C — bundle** |

**Connexion confirmée :** le chunk appelle une opération `withPassword`, collecte `user_id`, email, comptes, memberships et indicateur `super_user`, puis initialise l'état d'authentification. Les détails de stockage du jeton ne doivent pas être copiés ; utiliser des cookies HttpOnly ou un mécanisme standard équivalent dans la nouvelle conception.

### 4.2 Accueil et navigation principale

| Routes | Fonction | Preuve |
|---|---|---|
| `/`, `/home` | Accueil, raccourcis, suivi et activité récente. | **C — crawl** (`/home` aussi **C — bundle**) |
| `/members` | Annuaire de l'équipe, filtres rôle/contrat/actif, export RUP, ajout. | **C — bundle / crawl** |
| `/plannings/:view`, `/plannings/week`, `/plannings/day`, `/plannings/day-print` | Planning multi-vues et impression. | **C — bundle / crawl** |
| `/plannings/labels` | Gestion des labels de planning. | **C — bundle / crawl** |
| `/reports/payrolls`, `/reports/payrolls-history`, `/reports/activities`, `/reports/timeclock` | Paie, historique, activité et pointage. | **C — bundle / crawl** |
| `/reports/sick-leaves-status-report` | Rapport de suivi des arrêts ; la route a redirigé vers la paie pour le compte testé. | **C — crawl** pour la route demandée, fonction **I — forte** |
| `/dashboard-rh/home` | Tableau de bord RH : entrées, sorties, alertes et complétude. | **C — bundle / crawl** |
| `/articles`, `/conversations` | Publications internes et messagerie. | **C — bundle / crawl** |
| `/timeoffs/{pending,calendar,treated,expired}` | Gestion et calendrier des absences par état. | **C — bundle / crawl** |
| `/electronic-signature` | Portail de signature électronique. | **C — bundle / crawl** |
| `/settings`, `/subscriptions` | Administration et abonnement. | **C — bundle** ; abonnement **C — crawl** |

Le crawl confirme une navigation globale « Mon suivi / Plannings / Équipe / Rapports / RH / Articles / Messages », plus configuration et abonnement selon les droits.

### 4.3 Dossier collaborateur

Routes confirmées dans le bundle :

- `/members/:membership_id/personal` — informations personnelles ;
- `/members/:membership_id/contracts` — contrats et avenants ;
- `/members/:membership_id/documents` — documents ;
- `/members/:membership_id/timeoffs` — absences ;
- `/members/:membership_id/timesheet` — temps ;
- `/members/:membership_id/worktime` — organisation du travail ;
- `/members/:membership_id/access` — accès et périmètre ;
- `/members/:membership_id/settings` — paramètres ;
- `/members/:membership_id/paid-leave-counters/:counterId` — détail d'un compteur.

Le crawl de la liste montre : filtre par rôle, filtre par type de contrat, état actif, tri, ajout d'un collaborateur et accès au Registre unique du personnel. **C — crawl**

### 4.4 Tableau de bord RH

| Route | Domaine |
|---|---|
| `/dashboard-rh/entries`, `/exits`, `/trial-end` | Arrivées, départs, fins de période d'essai. |
| `/dashboard-rh/incomplete-profiles` | Données RUP/DPAE manquantes ; page observée. |
| `/dashboard-rh/contracts-changes` | Changements contractuels. |
| `/dashboard-rh/residence-permit` | Titres/autorisations de travail. |
| `/dashboard-rh/paid-leaves`, `/dashboard-rh/absence-log` | Congés payés et journal des absences. |
| `/dashboard-rh/clock-in-out-follow-up` | Suivi des pointages. |
| `/dashboard-rh/document-signing` | Suivi des signatures. |
| `/dashboard-rh/payslips`, `/dashboard-rh/payslips/history`, `/dashboard-rh/payslips/distribution/:import_id` | Import, distribution et historique des bulletins. |
| `/dashboard-rh/analytics/{summary,absence,worked-hours,workforce}` | Indicateurs RH. |

Toutes ces routes sont **C — bundle**. Le crawl a aussi exercé `home`, `incomplete-profiles`, `absence-log`, les quatre vues analytics, le suivi des pointages, les changements de contrats, la signature de documents, les entrées/sorties, les congés payés, les titres de séjour et les fins d'essai. Les routes de bulletins ont redirigé vers une page marketing : leur logique métier n'a pas été exercée.

### 4.5 Paramétrage

Routes **C — bundle** :

- organisation : `/settings/locations`, création/édition d'établissement, `/settings/job-title`, `/settings/collective-agreement`, `/settings/contact` ;
- sécurité : `/settings/roles-permissions`, `/settings/roles-permissions/:roleKey`, `/settings/legal/rgpd` ;
- planning/temps : `/settings/timeclock`, `/settings/timeoff-policies`, `/settings/preferences`, `/settings/print`, `/settings/productivity` ;
- paie : `/settings/pay-preferences`, `/settings/payroll-software`, `/settings/wage-ratio` ;
- contenu : `/settings/template-documents`, `/settings/notification` ;
- commerce : `/settings/subscription`, `/settings/locations/:locationId/billing`, `/settings/marketplace`.

### 4.6 Intégrations et sous-produits

- Paie : Silae, ADP et un flux d'onboarding/configuration du produit de paie. **C — bundle**
- Caisses/activité : Carré POS, Cashpad, Innovorder, IziPass, L'Addition, Lightspeed, Menlog, PI Electronique, Revo XEF, Tiller et Zelty. **C — bundle**
- Calendriers : lecture d'un flux et activation/désactivation de l'intégration. **C — bundle**
- Abonnement : routes `/subscriptions/:location_group_id`, factures, collecte et churn. **C — bundle**

Ces noms identifient des connecteurs ; ils ne prouvent pas tous qu'ils sont activés pour chaque client. Le crawl a confirmé les écrans marketplace, convention collective et plusieurs réglages ; les routes ADP, caisse et logiciel de paie ont été redirigées vers les établissements pour le compte testé.

## 5. Entités et relations métier

| Entité | Attributs/relations déductibles | Preuve |
|---|---|---|
| `Account` | Possède établissements, memberships, labels, périodes de paie, plannings. | **C — bundle / API** |
| `Location` | Appartient au compte ; configuration, convention, jours fériés, facturation, équipes. | **C — bundle** |
| `Team` | Regroupe des memberships et porte des feuilles de temps signables. | **C — bundle** |
| `User` | Identité globale, peut appartenir à plusieurs comptes. | **C — bundle** |
| `Membership` | Lien User–Account, rôle, périmètre d'établissements/équipes, line manager, préférences de navigation. | **C — bundle / crawl** |
| `Role` / `Permission` | Rôle configurable (`roleKey`) et capacités granulaires ; périmètre séparé. | **C — bundle** |
| `EmployeeProfile` | État civil/contact, données administratives, bancaires et sociales ; confidentialité élevée. | **C — bundle** |
| `UserContract` | Type (CDI, CDD, saisonnier, apprentissage…), dates, temps de travail, rémunération, établissement ; avenants. | **C — bundle / crawl** |
| `WeeklySchedule` | Semaine, état brouillon/validé/publié, lignes et statistiques. | **C — bundle / crawl** |
| `Shift` | Salarié ou non assigné, début/fin, heures prévues/réelles, labels, repas, validation. | **C — bundle** |
| `Rest` | Pause/repos, durée théorique, extension, rattachement planning. | **C — bundle** |
| `TimeOff` | Contrat/salarié, période, politique, statut et approbation. | **C — bundle** |
| `Counter` / `LedgerOperation` | Solde congés/RTT/RCR, mouvements, ajustement, prévision. | **C — bundle** |
| `PayPeriod` | Compte/établissement, bornes, population, état verrouillé, exports. | **C — bundle / crawl** |
| `PayrollReport` / `Export` | Analyse, fichiers, revue, formats paie. | **C — bundle** |
| `DocumentTemplate` / `Document` | Modèle, attributs disponibles, remplissage, téléchargement, signature. | **C — bundle** |
| `Article` | Publication interne CRUD. | **C — bundle / crawl** |
| `Conversation` | Fil, état lu/non lu/archivé, pièces jointes probables. | **C — bundle / crawl**, pièces jointes **I — forte** |
| `Subscription` / `Invoice` | Plan, groupe d'établissements, coordonnées de facturation, facture, suspension/résiliation. | **C — bundle / crawl** |

### Relations minimales recommandées

```text
Account 1─N Location 1─N Team
User N─N Account via Membership
Membership N─1 Role ; Membership N─N Scope(Location/Team)
Membership 1─N UserContract 1─N Amendment
WeeklySchedule 1─N Shift ; Shift N─1 Membership? ; WeeklySchedule 1─N Rest
UserContract 1─N TimeOff ; UserContract 1─N Counter 1─N LedgerOperation
Account/Location 1─N PayPeriod 1─N PayrollReport/Export
Membership 1─N Document ; Document N─1 DocumentTemplate?
```

## 6. Rôles, droits et périmètres

### 6.1 Modèle confirmé

- écran de rôles/permissions et détail par `roleKey` ;
- permission d'assigner un rôle de niveau propriétaire (`role-config.assign-owner-level`) ;
- permissions d'accès à tous les établissements et de modification du périmètre ;
- récupération des responsables hiérarchiques éligibles (`eligible_line_managers`) ;
- indicateur `super_user` dans la réponse de connexion, vraisemblablement réservé à l'exploitation interne ;
- droits séparés pour voir ses propres compteurs et ceux des autres.

### 6.2 Personas fonctionnels proposés

Ces personas sont **inférés** ; les noms de rôles exacts ne sont pas garantis, car le système est configurable.

| Persona | Capacités typiques |
|---|---|
| Collaborateur | Voir son planning/temps/absences/documents ; demander une absence ; valider ses heures selon politique. |
| Responsable d'équipe | Capacités collaborateur + planning d'un périmètre, approbation des absences/heures, visibilité équipe. |
| Gestionnaire RH | Dossiers, contrats, conformité, documents/signatures, congés et tableaux RH. |
| Gestionnaire paie | Périodes, contrôles, exports, verrouillage et synchronisation paie. |
| Administrateur de compte | Paramètres, établissements, rôles, intégrations et éventuellement abonnement. |
| Propriétaire | Capacités d'administration de plus haut niveau, dont délégation de rôles propriétaires. |
| Super-utilisateur interne | Impersonation/support multi-comptes ; ne pas exposer dans le produit standard. |

### 6.3 Familles de permissions littéralement présentes

- **Planning** : créer sur planning publié/non publié, éditer publié, voir non publié, publier/dépublier/valider/invalider/supprimer, dupliquer, télécharger, imprimer, gérer labels/notes/pauses, voir alertes/compteurs/non-assignés, actions en masse, planning prédictif.
- **Paie** : accès, exports, création/mise à jour/suppression de période, période alternative, verrouillage, export Silae/spécial/brut, synchronisation vers le produit paie.
- **Contrats/personnel** : créer/lire/éditer, supprimer dans le passé, vérifier l'éligibilité DPAE, créer/supprimer un salarié, voir salaires, documents et demande de signature.
- **Absences** : accès gestion, lecture prévision congés, contournement du délai minimal, suppression et décisions acceptée/refusée.
- **Administration** : accès paramètres, logo, notifications, logiciel de paie, établissements, facturation, rôles/périmètres.
- **Abonnement** : accès, suspension/résiliation, bannières et upsell.

**Recommandation :** stocker des capacités stables (`resource.action.qualifier`) et des scopes séparés. Ne pas coder les écrans contre des noms de rôle.

## 7. Workflows métier

### 7.1 Authentification et invitation

1. Saisie email/mot de passe, validation locale et appel token. **C — bundle / crawl**
2. Initialisation de l'identité, des comptes accessibles et memberships. **C — bundle**
3. Sélection implicite/explicite du compte et établissement, puis chargement `/me`, flags et périmètre. **I — forte**
4. Alternatives : invitation, acceptation, renvoi, mot de passe oublié ; callback Google présent côté API. **C — bundle**

### 7.2 Onboarding d'une organisation

1. Informations utilisateur et entreprise.
2. Création d'un brouillon de compte.
3. Choix/création des sociétés et établissements.
4. Convention collective et configuration.
5. Validation/activation.

Routes et endpoints existent pour chaque étape. **C — bundle** ; ordre exact **I — forte**.

### 7.3 Cycle du collaborateur

1. Créer ou inviter le collaborateur.
2. Renseigner profil, rôle et périmètre ; affecter un responsable.
3. Créer contrat et, si nécessaire, DPAE ; contrôler les chevauchements.
4. Déposer/générer des documents et demander la signature.
5. Suivre les données RUP/DPAE manquantes et titres de travail.
6. Gérer avenants, sortie, archivage/suppression selon droits.

**C — bundle** pour les capacités/endpoints ; les étapes de complétude sont **C — crawl**.

### 7.4 Planning hebdomadaire

1. Charger en-tête, lignes, memberships, shifts, repos, compteurs, alertes et analyse.
2. Créer/modifier/dupliquer shifts et repos ; glisser-déposer et actions en masse possibles.
3. Assigner ou laisser un shift non assigné ; auto-assignation et planning prédictif sont disponibles sous droits/flags.
4. Valider/invalider le contenu.
5. Publier, dépublier, notifier ; l'accès au non-publié est protégé.
6. Imprimer/télécharger, analyser coûts/heures et répliquer une semaine.

Le crawl a observé une semaine datée, une vue « par employés », affichage/outils et l'action « Dépublier », indiquant que la semaine consultée était publiée. **C — crawl**

### 7.5 Temps, pointage et feuilles signables

1. Planning fournit les heures théoriques.
2. Pointages ou saisies alimentent les heures réelles.
3. Collaborateur/responsable valide selon politique.
4. Rapport de pointage détecte les écarts.
5. Une feuille de temps par équipe/période peut être générée, signée et téléchargée (URL initiale/signée).

**C — bundle** pour routes/endpoints/permissions ; séquence **I — forte**.

### 7.6 Absence et compteurs

1. Consulter politique, droits généraux et prévision du solde.
2. Créer une demande ; statut initial `pending`.
3. Responsable accepte ou refuse ; statuts `accepted`, `declined`, `deleted`, `expired` présents.
4. Mise à jour du calendrier/planning.
5. Écriture dans le ledger des congés ; ajustements manuels protégés pour CP/RTT/RCR.

**C — bundle** pour états et surfaces ; automatisme de ledger **I — forte**.

### 7.7 Paie

1. Créer une période principale ou alternative pour une plage et une population.
2. Consolider entrées, sorties, extras, contrats, temps/absences et alertes.
3. Revue/analyse de la période et corrections.
4. Verrouiller/déverrouiller selon permission.
5. Exporter vers format générique, Silae ou connecteur spécifique ; éventuellement synchroniser vers le module de paie.
6. Conserver fichiers et historique.

Le crawl confirme la liste mensuelle, les groupes CDI/CDD/intérim/apprentissage/stage, les actions de verrouillage et l'export. **C — crawl**

### 7.8 Contenus et conversations

- Articles : liste, création, détail et édition. **C — bundle / crawl**
- Conversations : liste/détail, filtres tout/non lu/archivé. **C — bundle / crawl**
- Notifications non lues et commentaires/feedback existent comme surfaces distinctes. **C — bundle / crawl**

### 7.9 Abonnement

1. Afficher plan courant et paramètres de facturation.
2. Changer de plan ou modifier paramètres.
3. Afficher factures et paiements en anomalie.
4. Suspendre/résilier selon droit.

**C — crawl** pour l'interface ; endpoints factures/collecte/churn et Stripe **C — bundle**.

## 8. Surface API utile à une conception indépendante

Préfixe observé : `/api/v2`. Les identifiants numériques vus dans le crawl sont remplacés ici par des paramètres.

### 8.1 Identité et autorisation

| Surface | Usage |
|---|---|
| `POST /oauth/token`, `POST /oauth/revoke` | Session/token. |
| `GET /me` | Identité et contexte courant. |
| `GET /feature_flags` | Activation fonctionnelle. |
| `/users/invitation*`, `/users/password*`, `/signup*` | Invitation, récupération et inscription. |
| `/employee_management/planning_accessible_scope` | Périmètre planning. |
| `/employee_management/eligible_line_managers` | Responsables autorisés. |

### 8.2 Organisation et personnel

- `/locations`, `/locations/:id`, jours fériés et configuration ;
- `/accounts/:account_id/memberships`, `/memberships/names` ;
- `/user_contracts`, compteurs contractuels, avenants et modulation ;
- `/employee_management/accounts/jobs`, fusion d'intitulés ;
- `/employee_management/incomplete_files[/count]`, work permits et registre unique ;
- `/employee_management/contracts/dpaes/bulk_create` ;
- `/employee_management/document_templates*`, `/documents`, téléchargement groupé.

Le crawl confirme en GET : compte, memberships, contrats, établissements, dossiers incomplets et work permits. Les variantes non paramétrées observées en réseau complètent les patrons statiques.

### 8.3 Planning et temps

- données de base : `/accounts/:account_id/weeklyschedules`, `/shifts`, `/rests`, `/labels` ;
- moteur de grille : `/schedule_engine/header`, `/schedule_engine/rows`, `/planning/rows` ;
- édition groupée : `/planning/shifts/bulk_create|bulk_validate|bulk_invalidate|bulk_unassign`, `/planning/actions/bulk_delete|bulk_invert` ;
- cycle semaine : `/weeklyschedules/:id`, `/weeklyschedules/bulk_duplicate`, duplicate picker ;
- analyse : `/planning/weeklyschedules/analysis`, stats et alertes ;
- automatisation : `/planning/auto_assign[/eligibility]`, `/predictive_planning/schedules[/bulk_rollback]` ;
- calendrier : `/planning/calendar_feeds/fetch|toggle_integration` ;
- feuilles : `/teams/:team_id/signable_timesheets*`, URLs initiale/signée.

Les GET du moteur (`header`, `rows`), analyse, alertes et statistiques ont été **observés**.

### 8.4 Absences

- `/timeoffs`, `/timeoffs/calendar`, `/pending`, `/treated`, `/expired`, `/general_permissions` ;
- `/paid_leave/locations/:location_id/configuration` et initialisation du ledger ;
- `/paid_leave/locations/:location_id/ledger_operations[/adjustments]` ;
- `/paid_leave/user_contracts/:user_contract_id/forecast` ;
- `/rtt/policies[/eligible_contracts]`, `/counters`, `/user_contracts/:id/counters`.

### 8.5 Paie et rapports

- `/accounts/:account_id/pay_periods`, `/pay_periods/:id`, `/pay_periods/bulk_update` ;
- `/reports`, `/reports/:id`, fichiers et flow de revue côté UI ;
- `/exports` et services de téléchargement ;
- `/activity_logs[/categories]` ;
- `/silae/credentials`, `/configurations`, `/locations`, synchronisation de memberships ;
- endpoints ADP de vérification et synchronisation ;
- historique/synchronisation vers le produit paie sous permissions dédiées.

Les GET périodes de paie et activity logs ont été **observés**.

### 8.6 Communication, billing et intégrations

- `/accounts/:account_id/articles`, `/conversations`, `/attachments`, `/unread_notifications` ;
- `/accounts/billing_jwt`, `/location-based/invoices*`, `/v1/invoices`, `/v1/subscriptions*` ;
- routes de configuration Silae/ADP et connecteurs POS ;
- services analytics/marketing externes à isoler du cœur métier.

### 8.7 Forme de contrat API recommandée

Une réimplémentation n'a pas besoin de reproduire ces chemins. Elle devrait conserver les invariants fonctionnels :

```json
{
  "data": {},
  "meta": { "page": 1, "pageSize": 50, "total": 0 },
  "errors": [{ "code": "stable.machine_code", "field": "optional", "message": "localized" }]
}
```

Recommandations : idempotency keys pour imports/actions groupées, version optimiste pour planning/périodes, journal d'audit immuable, contrôle d'autorisation serveur à chaque mutation, jobs asynchrones pour exports/signatures/synchronisations.

## 9. Recoupement avec le crawl

- **58 pages demandées et 58 captures** en lecture seule, sans erreur de crawl. Elles couvrent accueil, trois vues planning, équipe, cinq rapports, 17 pages RH, cinq routes d'absences, contenus, signature, 21 routes de réglages et abonnement.
- **377 requêtes réseau** enregistrées : 373 GET et 4 POST. Les POST non métier correspondent à l'authentification et à de la télémétrie externe ; aucune mutation RH/planning/paie n'a été envoyée.
- Après déduplication et normalisation des identifiants, l'API principale expose **50 combinaisons méthode/chemin observées** : 49 GET et le POST OAuth. Elles confirment comptes, contrats/événements DSN, memberships, planning, temps, absences, paie, documents, activité, intégrations et configuration.
- Navigation, annuaire, planning, périodes/historique de paie, pointage, presque tout le dashboard RH, absences, articles, conversations, signature, administration et abonnement ont ainsi été confirmés visuellement/DOM.
- Les ressources observées complètent les patrons statiques : `activity_logs`, `common_datas`, `dsn_events`, `user_contract_events`, work permits, modèles/documents signables, stats/rows de planning, timeclocks, timeoffs, RTT, logiciels de paie et POS.
- Redirections observées : `/timeoffs` → `/timeoffs/pending`, `/subscription` → `/subscriptions`, `/settings` → `/settings/locations`.
- Les routes rapports d'arrêts, bulletins, ADP, caisse, logiciel de paie et rôles/permissions ont redirigé vers une page de repli. Cela peut refléter droits, plan ou feature flags ; leur présence statique reste confirmée, mais pas leur exécution pour ce compte.

## 10. Priorités de réimplémentation

### Lot 0 — fondations

- tenancy `Account/Location/Team`, identité, membership ;
- RBAC par capacités + scopes ;
- audit, feature flags, fichiers privés, traitements asynchrones ;
- design system original et textes réécrits.

### Lot 1 — cœur opérationnel

- annuaire + profil/contrat minimal ;
- planning semaine, shifts, pauses, brouillon/publication ;
- absence simple avec approbation ;
- activité et exports basiques.

### Lot 2 — RH et conformité

- dossier complet, DPAE/RUP, documents/modèles/signature ;
- compteurs et ledger congés ;
- entrées/sorties/alertes/compliance.

### Lot 3 — paie et temps avancé

- périodes de paie, verrouillage, revue, exports ;
- pointage, heures réelles, feuilles signables ;
- connecteurs paie.

### Lot 4 — extensions

- analytics, planning prédictif/auto-assignation ;
- articles, conversations ;
- billing self-service et marketplace/connecteurs POS.

## 11. Exigences non fonctionnelles à ne pas omettre

- **Isolation multi-tenant** et filtrage par périmètre côté serveur.
- **Données sensibles** : chiffrement, journalisation d'accès, rétention, masquage, export/suppression RGPD.
- **Concurrence planning** : verrou optimiste, détection des conflits et recalcul atomique des compteurs.
- **Auditabilité** : auteur/date/avant-après pour contrat, absence, planning publié, période de paie et permissions.
- **Traçabilité des exports** et signatures ; URLs de fichiers courtes, privées et signées.
- **Temps/date** : fuseau par établissement, DST, nuits traversantes, jours fériés, conventions.
- **Résilience des intégrations** : retries bornés, idempotence, dead-letter et état de synchronisation visible.
- **Accessibilité et responsive** : à reconstruire selon standards WCAG, sans reprendre styles ou composants propriétaires.

## 12. Incertitudes et limites

1. Les payloads et schémas de réponse complets ne sont pas déterminables de façon fiable sans documentation publique ; les noms d'entités/champs ne valent pas contrat.
2. Les méthodes adjacentes aux endpoints minifiés sont parfois ambiguës ; elles doivent être validées avant toute recherche d'interopérabilité.
3. Les rôles sont configurables : les personas proposés ne sont pas une liste canonique.
4. Les écrans derrière flags, plans ou droits absents du compte crawlé n'ont pas été exercés.
5. Le crawl n'a effectué aucune mutation ; publication, validation, signature, export, synchronisation et billing sont cartographiés statiquement.
6. La présence d'un connecteur ne prouve ni disponibilité commerciale ni comportement actuel.

## 13. Règles clean-room

- Utiliser ce document comme **liste de capacités et invariants**, pas comme modèle de code ou de présentation.
- Définir une API, un schéma de données, des textes et une interface originaux.
- Ne pas reprendre noms de classes, CSS, icônes, illustrations, wording ou assets propriétaires.
- Conserver une traçabilité séparée : exigences observées → spécification interne → tests d'acceptation.
- Ne viser une compatibilité protocolaire que si elle est juridiquement nécessaire et documentée ; sinon, préférer une architecture indépendante.
