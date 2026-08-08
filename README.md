# PlanFlow

Gestion du personnel, des plannings et des temps, multi-établissements, auto-hébergée. La paie est **exportée vers Silae** ; PlanFlow ne produit ni bulletin ni DSN.

La spécification de construction est [`PLAN.md`](PLAN.md). Elle est normative : en cas d'écart entre le code et le plan, c'est le plan qui a raison, ou le plan qui doit être corrigé — jamais l'écart qui s'installe.

| Document | Rôle |
|---|---|
| [`PLAN.md`](PLAN.md) | Spécification : périmètre, modèle de données, règles, lots de travail |
| [`matrice-conformite-rh-france-2026.md`](matrice-conformite-rh-france-2026.md) | Exigences réglementaires françaises, cotées P0/P1/P2 |
| [`Audit Combo/`](Audit%20Combo/INDEX.md) | Audit fonctionnel du produit de référence |

## État

Neuf lots livrés. **Aucun écran ne lit plus de données de démonstration** : le
répertoire `src/lib/demo` a disparu.

| Lot | Contenu |
|---|---|
| WP-00 | Socle : Next.js, PostgreSQL, CSP restrictive, CI, sauvegardes |
| WP-01 | Tenancy, identité, autorisation : RLS, audit append-only, 70 capacités, cinq rôles |
| WP-02 | Référentiels et registre de paramétrage juridique |
| WP-03 | Dossiers salariés, contrats et avenants, forfait jours |
| WP-04 | Planning : quatre vues, publication par équipe, impression |
| WP-05 | Moteur de règles de convention, effectif-daté |
| WP-06 | Absences, registre de compteurs, calendrier |
| WP-07 | Heures prévu/réalisé/payé, périodes de paie verrouillables |
| WP-08 | Export Silae, format relevé sur un export réel du dossier |
| WP-09 | Tableau de bord RH : indicateurs explicables |

Restent WP-10 (documents) et WP-11 (communication, optionnel), ainsi que deux
points nommés à l'intérieur des lots livrés : la régularisation automatique sur
la période suivante et l'information au retour d'arrêt.

### Ce qui attend une décision du client

Ces points sont des **signaux d'arrêt** au sens de `PLAN.md` : ils ne se
devinent pas.

- Les **codes d'absence Silae** (`AB-100`, `AB-200`, `AB-300`, `AB-630`) : leur
  existence est connue, leur signification non. L'export refuse de tourner tant
  que la correspondance n'est pas confirmée.
- Le **régime dominical** applicable aux magasins, qui détermine si la
  majoration de 100 % et le repos compensateur sont les bonnes contreparties.
- Les **règles applicables aux mineurs**, sans source primaire au dossier.

## Démarrer

### Avec Docker

```bash
cp .env.example .env
# Renseigner POSTGRES_PASSWORD et ENCRYPTION_KEY (voir ci-dessous)
docker compose up --build
```

L'application écoute sur <http://localhost:3000>. Les migrations s'appliquent au démarrage du conteneur.

### En local

Nécessite Node 22, pnpm 10 et un PostgreSQL 16 accessible.

```bash
pnpm install
cp .env.example .env          # renseigner DATABASE_URL et ENCRYPTION_KEY
pnpm db:generate
pnpm db:deploy
pnpm dev
```

### Clé de chiffrement

`ENCRYPTION_KEY` chiffre au repos les colonnes sensibles exigées par le plan (§3.6) : NIR, IBAN, BIC.

```bash
openssl rand -base64 32
```

Elle vit **hors de la base** : une sauvegarde volée ne doit pas suffire à lire ces colonnes. La perdre rend ces données irrécupérables — la sauvegarder séparément et documenter sa rotation.

## Vérifier

```bash
pnpm verify      # typecheck + lint + tests unitaires
pnpm test:e2e    # build, serveur standalone, tests de bout en bout
```

`pnpm verify` est ce que la CI exécute sur chaque *pull request*, suivi du build et des tests end-to-end.

## Configuration de la base — à ne pas rater

**L'application ne doit pas se connecter en superutilisateur PostgreSQL.**

Un superutilisateur contourne la *row-level security*, y compris déclarée en `FORCE`. Connecter PlanFlow avec un tel compte désactive silencieusement la seconde couche d'isolation multi-tenant : les requêtes fonctionnent, les tests applicatifs passent, et rien n'indique que la protection a disparu — jusqu'au jour où quelqu'un lit les données d'un autre établissement.

```sql
CREATE ROLE planflow_app LOGIN PASSWORD '…' NOSUPERUSER NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO planflow_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO planflow_app;
```

Les migrations, elles, s'appliquent avec un compte propriétaire distinct.

L'application vérifie ce point au démarrage : elle refuse de démarrer en production sur une base mal configurée, et se contente d'un avertissement en développement. `GET /api/sante` expose l'état sous `tenantIsolation`.

## Choix structurants

**Aucun traceur tiers.** L'audit du produit de référence a intercepté 2102 requêtes de traçage — Segment, LinkedIn Ads, Google Ads, DoubleClick, Clarity, Hotjar — et aucune requête métier. Une application RH ne doit pas envoyer un contexte de navigation portant sur des salariés identifiables à des régies publicitaires. Deux garde-fous rendent la règle vérifiable plutôt que déclarative :

- une Content-Security-Policy qui ne nomme **aucune** origine externe, posée par requête avec un nonce (`src/proxy.ts`) ;
- un test qui échoue si une dépendance de traçage apparaît dans `package.json`.

Pour de la télémétrie technique, passer par une interface abstraite auto-hébergée.

**Le serveur testé est celui qui est déployé.** Les tests end-to-end lancent le serveur `standalone`, celui que l'image Docker exécute — pas `next dev`, dont la politique de sécurité est volontairement plus permissive.

## Structure

```
src/
├── app/                 écrans (App Router)
├── lib/
│   ├── env.ts           contrat d'environnement, validé à l'import
│   └── security/csp.ts  politique de sécurité, fonction pure et testable
├── server/
│   ├── db.ts            client Prisma — le scoping multi-tenant s'y greffe au WP-01
│   └── health.ts
└── proxy.ts             en-têtes de sécurité par requête
prisma/                  schéma et migrations
tests/
├── unit/                Vitest
└── e2e/                 Playwright
```

## Écarts assumés par rapport au plan

Trois choix diffèrent de ce qu'annonçait `PLAN.md` §2, et le plan a été mis à jour en conséquence.

| Sujet | Plan initial | Retenu | Raison |
|---|---|---|---|
| Next.js | 15 | **16.3** | Version stable courante ; démarrer un greenfield une majeure en retard n'a pas de contrepartie. |
| Authentification | Auth.js v5 | **Sessions maison en base** | Auth.js v5 est encore en beta. Le besoin se limite à identifiants et invitation, sans OAuth, et la matrice de conformité (n° 23) impose la **révocation de session** — immédiate avec des sessions en base, malaisée avec des jetons JWT. |
| Convention Next | `middleware.ts` | **`proxy.ts`** | Next 16 a renommé la convention ; `middleware` est déprécié. |
