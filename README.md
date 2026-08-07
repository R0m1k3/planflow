# PlanFlow

Gestion du personnel, des plannings et des temps, multi-établissements, auto-hébergée. La paie est **exportée vers Silae** ; PlanFlow ne produit ni bulletin ni DSN.

La spécification de construction est [`PLAN.md`](PLAN.md). Elle est normative : en cas d'écart entre le code et le plan, c'est le plan qui a raison, ou le plan qui doit être corrigé — jamais l'écart qui s'installe.

| Document | Rôle |
|---|---|
| [`PLAN.md`](PLAN.md) | Spécification : périmètre, modèle de données, règles, lots de travail |
| [`matrice-conformite-rh-france-2026.md`](matrice-conformite-rh-france-2026.md) | Exigences réglementaires françaises, cotées P0/P1/P2 |
| [`Audit Combo/`](Audit%20Combo/INDEX.md) | Audit fonctionnel du produit de référence |

## État

**WP-00 — socle.** Next.js, Prisma, base de données, en-têtes de sécurité, tests, CI, image Docker. Aucun écran métier : ils arrivent à partir de WP-01 (tenancy, identité, autorisation).

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
