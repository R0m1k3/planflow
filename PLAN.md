# PlanFlow — plan de réimplémentation

> **Statut :** proposition, en attente de validation sur le périmètre et la stack (§2).
> **Source de vérité fonctionnelle :** [`Audit Combo/`](Audit%20Combo/INDEX.md) — 58 écrans, cartographie fonctionnelle et inventaire de crawl du 7 août 2026.
> **Régime :** clean room. Ce plan est une liste de capacités et d'invariants, pas un modèle de code ni de présentation. Voir §11.

---

## 1. Contexte

Le dépôt contenait uniquement l'audit ; il n'y a aucun code applicatif. L'objectif est de construire **PlanFlow**, une application de gestion du personnel et des plannings reprenant les capacités de Combo pour l'organisation auditée.

L'audit remplace la recherche documentaire publique et corrige plusieurs hypothèses de travail. Trois constats changent la conception :

**1. La convention collective n'est pas HCR.** Le compte audité est **FROUARD DISTRIBUTION / La Foir'Fouille**, configuré sur **« Commerces de détail non alimentaires (IDCC 1517) — JF 50 % et Dimanche 100 % »** (`settings--collective-agreement`). C'est du commerce de détail, pas de la restauration. Les règles de première implémentation sont donc celles de l'IDCC 1517 et ses majorations jours fériés / dimanche — pas les durées maximales et coupures propres à l'hôtellerie-restauration.

**2. L'autorisation est par capacités, pas par rôles.** L'audit relève des permissions granulaires (`role-config.assign-owner-level`, droits distincts pour voir ses propres compteurs et ceux d'autrui, accès à tous les établissements, modification de périmètre) et des rôles **configurables** via `/settings/roles-permissions/:roleKey`. `Role`, `Permission` et `Scope` doivent être séparés dès le premier jour ; les écrans ne doivent jamais tester un nom de rôle.

**3. Les compteurs de congés sont un registre d'écritures, pas un solde.** L'audit identifie `Counter` / `LedgerOperation` avec ajustements manuels protégés et prévision (`/paid_leave/user_contracts/:id/forecast`). Un solde stocké serait un contresens : c'est le cumul des écritures qui fait foi, et l'ajustement manuel doit être une écriture tracée comme les autres.

### Sur les identifiants transmis

Je n'ai pas utilisé le login et le mot de passe fournis en message, et l'audit rend cet accès inutile. **Ce mot de passe doit être changé** : il a circulé en clair dans une conversation.

### Écart de documentation

`Audit Combo/INDEX.md` référence `../../matrice-conformite-rh-france-2026.md` (matrice de conformité juridique française), qui **n'est pas dans le dépôt**. Ce document conditionne §10 ; il faut l'ajouter ou corriger le lien.

---

## 2. Décisions à valider

Ces choix sont des hypothèses de travail, pas des acquis. Ils sont peu coûteux à changer maintenant, coûteux plus tard.

| Sujet | Proposition | Raison |
|---|---|---|
| **Périmètre v1** | Lots 0 à 2 (§7) : socle, planning, absences, dossier RH. Paie en **export**, pas en moteur. | L'audit montre que Combo lui-même sépare le produit paie (`/combo-pay-onboarding/*`, connecteurs Silae/ADP). Un moteur de paie + DSN est un second produit. |
| **Stack** | Next.js 15 (App Router, TS) · PostgreSQL + Prisma · Auth.js · Tailwind + shadcn/ui | Un déploiement, itération rapide, PWA sans stores. L'original est un SPA React/Vite + API Rails ; rien n'oblige à reprendre ce découpage. |
| **Déploiement** | `docker-compose` (app + Postgres) auto-hébergé, mobile en PWA | Données chez toi, pas d'ops cloud. |
| **CCN d'amorce** | **IDCC 1517**, moteur paramétrable pour en ajouter d'autres | Constat de l'audit. |

**Questions ouvertes :**
1. Combien d'établissements et d'équipes réels faut-il couvrir en v1 ?
2. Un seul IDCC suffit-il, ou d'autres enseignes du groupe relèvent-elles d'autres conventions ?
3. Quel logiciel de paie en aval (l'audit voit Silae et ADP côté Combo) — c'est lui qui dicte le format d'export.
4. La pointeuse est-elle utilisée ? `settings/timeclock` est une option payante ; l'audit ne prouve pas qu'elle est active.

---

## 3. Architecture

### Multi-tenant
`Account` → `Location` → `Team`. Base unique, **scoping par ligne**, appliqué par une extension Prisma qui injecte le périmètre de la session, plus **RLS PostgreSQL** en défense en profondeur. L'audit insiste : *« isolation multi-tenant et filtrage par périmètre côté serveur »* — le filtre ne doit jamais dépendre du client.

### Autorisation par capacités
Trois tables distinctes :
- `Permission` — capacité stable nommée `ressource.action.qualificatif` (ex. `planning.publish`, `planning.create.on_published`, `payroll.period.lock`, `counters.read.others`)
- `Role` — jeu de capacités, **configurable par le client**, identifié par une clé stable
- `Scope` — périmètre du membership : établissements et équipes, plus un indicateur « tous établissements »

Un unique point d'entrée serveur `can(membership, permission, resource)` ; **contrôle à chaque mutation**, jamais uniquement à l'affichage.

Familles de capacités relevées par l'audit, à reprendre telles quelles comme référentiel de départ : planning (créer sur publié/non publié, éditer publié, voir non publié, publier, dépublier, valider, invalider, supprimer, dupliquer, imprimer, labels, notes, pauses, alertes, compteurs, non-assignés, actions de masse, planning prédictif), paie (accès, exports, CRUD période, période alternative, verrouillage, export Silae/brut, synchronisation), contrats (CRUD, suppression dans le passé, éligibilité DPAE, voir salaires, documents, demande de signature), absences (gestion, prévision, contournement du délai minimal, suppression, décisions), administration, abonnement.

### Temps, fuseaux, nuits traversantes
Chaque `Location` porte un fuseau IANA — l'application auditée affiche d'ailleurs un bandeau quand le fuseau du compte diffère de celui du poste. Shifts stockés en **`timestamptz`** plus une colonne dénormalisée `localDate` servant **uniquement** au regroupement dans la grille. Toute durée se calcule depuis les instants : un shift 22h–06h la nuit du changement d'heure dure 7 h ou 9 h, jamais 8 h.

### Concurrence
Le planning est édité à plusieurs simultanément. **Verrou optimiste** (`version`) sur `WeeklySchedule` et `PayPeriod`, détection de conflit rendue à l'utilisateur, et **recalcul atomique des compteurs** dans la même transaction que la mutation de shift. Les actions de masse portent une **clé d'idempotence**.

---

## 4. Modèle de données

Nommage repris de l'audit — ce sont les agrégats observés, pas une copie de schéma.

**Identité et organisation**
`Account` · `Location` (fuseau, IDCC, jours fériés, configuration) · `Team` · `User` (identité globale, peut appartenir à plusieurs comptes) · `Membership` (User↔Account, rôle, scope, responsable hiérarchique) · `Role` · `Permission` · `Scope`

**Personnel**
`EmployeeProfile` — état civil, contact, données administratives, **bancaires et sociales chiffrées au repos**
`UserContract` — type (CDI, CDD, saisonnier, apprentissage, stage, intérim — populations confirmées par l'écran de paie), dates, temps de travail, modulation, rémunération, établissement
`Amendment` — avenant rattaché au contrat
`WorkPermit` — titre de séjour et échéance (`/dashboard-rh/residence-permit`)
`Dpae` · `PersonnelRegisterEntry` (RUP)
`Document` · `DocumentTemplate` · `SignatureRequest`

**Planning et temps**
`WeeklySchedule` — semaine × périmètre, état **brouillon / validé / publié**, `version`
`Shift` — `membershipId` **nullable** (les shifts non-assignés sont une ligne à part entière dans la grille), début/fin, **heures prévues et réelles**, `labelId`, repas, indicateur de validation
`Rest` — pause/repos, durée théorique, extension
`DailyNote` — la ligne « Notes et événements » de la grille
`Label` — étiquette/poste, **couleur** (la vue `/plannings/labels` groupe par étiquette)
`Clocking` / `ActualHours` · `SignableTimesheet` (par équipe et période, signable et téléchargeable)
`PlanningAlert` · `PlanningAnalysis`

**Absences et compteurs**
`TimeOffPolicy` · `RttPolicy` (créée une fois, **renouvellement annuel automatique**, archivable — texte de l'écran)
`TimeOff` — contrat, période, politique, statut `pending | accepted | declined | deleted | expired`
`Counter` · `LedgerOperation` — écritures, ajustements protégés, prévision

**Paie et pilotage**
`PayPeriod` — bornes, population, **verrouillage**, périodes alternatives · `PayrollReport` · `Export` · `ActivityLog`

**Communication et commerce**
`Article` · `Conversation` · `Notification` · `Subscription` · `Invoice` · `Integration`

### Relations structurantes
```
Account 1─N Location 1─N Team
User N─N Account via Membership
Membership N─1 Role ; Membership N─N Scope(Location|Team)
Membership 1─N UserContract 1─N Amendment
WeeklySchedule 1─N Shift ; Shift N─1 Membership? ; WeeklySchedule 1─N Rest
UserContract 1─N TimeOff ; UserContract 1─N Counter 1─N LedgerOperation
Location 1─N PayPeriod 1─N PayrollReport|Export
Membership 1─N Document ; Document N─1 DocumentTemplate?
```

---

## 5. Moteur de règles de convention

Piloté par les données, jamais en dur. Un `CollectiveAgreement` porte un IDCC et un jeu de paramètres versionné ; chaque règle est une **fonction pure** `(contexte) => Violation[]`, testable en table.

**Amorce IDCC 1517** — les deux règles visibles dans le libellé de configuration du compte sont les majorations **jour férié 50 %** et **dimanche 100 %**. S'y ajoutent les règles d'ordre public : durées maximales quotidienne et hebdomadaire, repos quotidien et hebdomadaire, jours consécutifs, pause après 6 h, tranches d'heures supplémentaires.

> **Aucune valeur numérique n'est fixée dans ce plan.** L'audit est muet sur les paramètres réels, et les sources publiques se contredisent d'une convention à l'autre. Les valeurs doivent être saisies depuis le texte de l'IDCC 1517 et **validées par un expert paie** avant mise en production. C'est précisément la raison du choix paramétrable.

**Exécution** — revalidation ciblée des semaines-employés impactées à chaque mutation (une modification touche la semaine courante et ses voisines par le repos quotidien), validation complète à la publication.

**Restitution non bloquante** — badge sur la cellule, panneau listant les violations, publication possible après confirmation explicite, **tracée dans le journal d'audit**. Un manager doit pouvoir passer outre en connaissance de cause.

---

## 6. Compteurs

**Congés : registre d'écritures.** `LedgerOperation` est la source de vérité (acquisition, prise, ajustement manuel, régularisation). Le solde est le cumul ; la prévision projette les acquisitions à venir. Tout ajustement manuel porte auteur, date et justification.

**Heures : calcul à la lecture, figé à la clôture.** Période ouverte → recalcul depuis `Shift`, `ActualHours` et `TimeOff`. Période close → instantané immuable écrit au verrouillage de la `PayPeriod`, pour qu'un export de mars ne bouge pas si un shift de mars est corrigé en juin. Les corrections rétroactives passent par une écriture de régularisation sur la période ouverte, jamais par réécriture du passé.

**Bandeau par employé de la grille** — l'écran affiche cinq valeurs par ligne : contrat, planifié, absences, écart, repos compensateur. Le même calcul doit alimenter la grille, le rapport de pointage et l'export de paie ; une seule implémentation, trois consommateurs.

**Coût du planning** — `settings/wage-ratio` expose un taux moyen de cotisations patronales en pourcentage et des options d'ajustement. Le coût prévisionnel s'appuie dessus et se compare à un objectif de productivité défini par établissement.

---

## 7. Phasage

Reprend le découpage en lots proposé par l'audit, qui est cohérent.

| Lot | Contenu | Livrable |
|---|---|---|
| **0 — Fondations** | Tenancy `Account/Location/Team`, identité, `Membership` ; RBAC capacités + scopes ; journal d'audit ; feature flags ; fichiers privés à URL signée courte ; jobs asynchrones ; design system original | Une organisation, des utilisateurs, des droits vérifiables |
| **1 — Cœur opérationnel** | Annuaire et profil/contrat minimal ; grille semaine, shifts, pauses, labels, notes, non-assignés ; brouillon → validé → publié **par équipe** ; absence simple avec approbation ; exports basiques | L'établissement peut planifier et publier |
| **2 — RH et conformité** | Dossier complet, DPAE, RUP, titres de séjour ; modèles de documents et signature ; `Counter`/`LedgerOperation` et politiques RTT ; entrées, sorties, fins d'essai, profils incomplets, modifications de contrat | Le dossier salarié est tenu et conforme |
| **3 — Paie et temps avancé** | `PayPeriod`, verrouillage, revue, exports ; pointage, heures réelles, feuilles signables ; connecteurs paie | La paie sort du produit |
| **4 — Extensions** | Analyses RH, planning prédictif et auto-assignation ; articles, conversations ; abonnement, marketplace et connecteurs de caisse | Confort et pilotage |

Le moteur de règles (§5) démarre au lot 1 avec les règles d'ordre public et s'enrichit au lot 2.

---

## 8. Arborescence proposée

```
planflow/
├── docker-compose.yml
├── prisma/schema.prisma          # + migrations/, seed.ts
├── src/
│   ├── app/(auth)/               # connexion, invitation, mot de passe
│   │   (app)/planning/           # vues semaine | jour | labels, impression
│   │   (app)/members/            # annuaire, dossier, contrats, compteurs
│   │   (app)/timeoffs/           # à traiter | calendrier | traitées | expirées
│   │   (app)/reports/            # paies, historique, activité, pointage
│   │   (app)/hr/                 # suivi employé, documents, analyses
│   │   (app)/settings/           # société, planification, gestion, intégrations, RGPD
│   │   kiosk/                    # pointeuse (PWA hors-ligne)
│   │   api/                      # webhooks caisses, API ouverte
│   ├── domain/
│   │   ├── access/               # capacités, scopes, can()
│   │   ├── compliance/           # moteur de règles — rules/, engine.ts, agreements/idcc1517.ts
│   │   ├── counters/             # ledger congés, heures, régularisations
│   │   └── payroll/              # variables et adaptateurs d'export
│   ├── server/                   # auth, db (extension multi-tenant), actions/, audit/
│   ├── components/               # ui/, planning/ (îlot de grille)
│   └── lib/                      # datetime (fuseaux, DST, nuits traversantes), money
└── tests/                        # unit/ (Vitest), e2e/ (Playwright)
```

**Performance de la grille** — Server Component pour le chargement, **îlot client** pour l'interaction (glisser-déposer, redimensionnement, actions de masse), mises à jour optimistes, lignes virtualisées. L'audit exige aussi accessibilité clavier et états chargement / vide / erreur / interdit sur chaque écran.

---

## 9. Vérification

**Jeu de données de départ** — une organisation, deux établissements, des équipes distinctes, une population mêlant CDI, CDD, temps partiels et un contrat en apprentissage, quatre semaines de plannings publiés, des absences longues chevauchant des semaines, des pointages en écart. C'est la base de toute vérification manuelle.

**Vitest** — le domaine, en tests de table :
- Chaque règle de convention à ses bornes (la valeur limite exacte passe, un cran en dessous échoue)
- Ledger de congés : acquisition, prise, ajustement, prévision, régularisation rétroactive
- Heures : tranches d'heures supplémentaires, **shift traversant un changement d'heure**, nuit traversante
- Autorisation : une capacité absente doit refuser la **mutation**, pas seulement masquer le bouton

**Playwright** — les parcours qui traversent les agrégats :
1. Construire une semaine, déclencher une alerte de convention, publier malgré tout → la trace apparaît au journal d'audit et le salarié voit son planning
2. Demander une absence → approuver → l'absence s'affiche sur la grille, le ledger est écrit, le solde et la prévision bougent
3. Pointer avec un écart → valider → l'écart remonte dans la période de paie → verrouiller → l'export est figé et une correction ultérieure produit une régularisation
4. Deux sessions éditant la même semaine → conflit détecté, pas de perte silencieuse

**Manuel** — `docker compose up`, puis dérouler le jeu de données ; vérifier la pointeuse hors-ligne (couper le réseau, pointer, rétablir, contrôler la synchro) et l'installation PWA.

---

## 10. Risques et conformité

- **RGPD** — le dossier contient état civil, NIR, coordonnées bancaires, titres de séjour et arrêts de travail. Les arrêts sont des **données de santé, catégorie particulière**. Exigences : minimisation, chiffrement au repos, journalisation des accès, durées de conservation, masquage, export et suppression. À traiter au lot 0, pas après. L'application auditée expose d'ailleurs un contrat de sous-traitance RGPD dédié.
- **Matrice de conformité manquante** — le document juridique référencé par l'audit est absent du dépôt ; cette section reste incomplète tant qu'il n'est pas fourni.
- **DPAE / URSSAF** — la transmission automatisée exige un raccordement déclaratif. Générer le formulaire au lot 2 ; la transmission passe par un tiers.
- **Signature électronique** — impose un prestataire de confiance qualifié. Brancher un service existant, ne pas l'implémenter.
- **Paie et DSN** — responsabilité réglementaire majeure et veille législative permanente. Motif du choix « export uniquement ».
- **Paramètres de convention** — voir §5 : à saisir depuis le texte de l'IDCC 1517 et faire valider.
- **Auditabilité** — auteur, horodatage, avant/après et justification sur contrat, absence, planning publié, période de paie et changement de permission. Les agrégats analytiques doivent être explicables depuis leurs sources.
- **Résilience des intégrations** — reprises bornées, idempotence, file d'échecs et état de synchronisation visible.

---

## 11. Règles clean room

Contraintes reprises de l'audit, à tenir pendant toute la construction :

- Ce document et l'audit servent de **liste de capacités et d'invariants**, pas de modèle de code ou de présentation.
- API, schéma de données, textes et interface **originaux**.
- Ne pas reprendre noms de classes, CSS, icônes, illustrations, ni wording propriétaire au-delà des libellés métier nécessaires.
- Traçabilité séparée : exigence observée → spécification interne → test d'acceptation.
- Ne pas supposer les règles cachées ; les valider avant de les coder.
