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
docker compose up --build
```

Aucune variable n'est requise. La clé de chiffrement est **produite au premier démarrage** et affichée une fois dans les journaux — notez-la, elle vit dans un volume distinct de la base et des documents.

L'application écoute sur <http://localhost:9317> — port peu courant à dessein, le service étant censé passer par un reverse-proxy. Les migrations s'appliquent au démarrage du conteneur.

La pile attend un réseau externe nommé `nginx_default`, celui du reverse-proxy. S'il n'existe pas encore :

```bash
docker network create nginx_default
```

Seule l'application y est attachée. La base reste sur le réseau privé de la pile : l'exposer au réseau du proxy la rendrait joignable par tout ce qu'il héberge.

### Avec Portainer

Portainer ne lit pas de fichier `.env`, mais **aucune variable n'est obligatoire** : la pile démarre telle quelle.

Une seule mérite d'être renseignée dans la section **Environment variables** : `APP_URL`, avec l'adresse publique réelle. Sans elle, les liens des messages — invitations comprises — pointeront vers `localhost` et personne ne pourra les suivre.

Les autres ont une valeur par défaut utilisable : `POSTGRES_PASSWORD`, `POSTGRES_USER`, `POSTGRES_DB`, `APP_PORT` (9317). `ENCRYPTION_KEY` peut être fournie si vous gérez vos secrets ailleurs ; sinon elle est produite au premier démarrage.

**Après le premier déploiement, relevez la clé dans les journaux du conteneur `app` et conservez-la hors du serveur.**

### Si l’application ne démarre pas : `P1000`

Le journal du conteneur `app` dit toujours quoi faire. Trois cas, dans l’ordre de fréquence.

**`[bootstrap] Le compte d’amorçage « planflow » est lui-même refusé.`**

C’est le piège classique de PostgreSQL en conteneur, et il n’a rien à voir avec le rôle applicatif. **`POSTGRES_PASSWORD` n’est lu qu’à l’initialisation du volume.** Un volume créé lors d’un déploiement antérieur — y compris un déploiement qui avait échoué pour une autre raison — garde le mot de passe d’alors. Le changer dans la pile n’y touche pas : le volume ne se réinitialise jamais.

La base est encore vide ? Repartez d’un volume neuf, c’est le plus sûr :

```bash
docker compose down
docker volume rm planflow_db-data
docker compose up -d
```

La base contient déjà quelque chose ? Réalignez le mot de passe. L’image PostgreSQL fait confiance aux connexions par socket locale, donc l’ancien mot de passe n’est pas nécessaire :

```bash
docker compose exec db psql -U planflow \
  -c "ALTER USER planflow PASSWORD 'planflow-interne';"
docker compose restart app
```

**`[bootstrap] Aucun identifiant d’amorçage fourni`** — le service `app` n’a pas `POSTGRES_PASSWORD`. Il l’a par défaut dans le compose fourni ; son absence signale une variable vidée à la main.

**Aucune ligne `[bootstrap]` du tout** — l’image tourne sur une version antérieure à ce mécanisme. Reconstruisez-la (`docker compose up -d --build`, ou dans Portainer *Update the stack* avec *Re-pull image and redeploy*). Un simple redémarrage réutilise l’image existante.

### Première installation

Les migrations posent le schéma, rien de plus : une instance neuve n'a **aucun compte et aucun utilisateur**. Il n'y a rien à semer pour démarrer — et surtout pas le jeu de démonstration (`pnpm db:seed:demo`), réservé au harnais de tests : des salariés inventés dans un annuaire réel se confondent avec de vrais salariés, et il refuse de toute façon de tourner en production.

À la place, la première visite est redirigée vers `/installation`. L'écran demande le nom de l'entreprise, un premier établissement avec son fuseau horaire, et le compte qui administrera l'instance. Il crée le compte, le catalogue des capacités, les cinq rôles fournis, et vous connecte.

Il pose aussi les **référentiels** sans lesquels rien ne s'accroche : les douze étiquettes de planning, cinq types d'absence, la convention d'amorce IDCC 1517 avec l'origine de chacun de ses paramètres, les durées de conservation et les jours fériés des deux prochaines années. Ce ne sont pas des exemples mais des minima : sans type d'absence aucune demande n'est saisissable, et sans convention le moteur de règles laisse passer une semaine de soixante heures sans rien dire. Tout se modifie ensuite depuis les réglages — la convention notamment, qui se réédite en version datée.

Deux choses à savoir :

- **L'écran ne se rouvre pas.** Il crée un propriétaire sans demander de session ; le laisser accessible ensuite reviendrait à offrir tous les droits au premier visiteur. Une ligne en base marque l'installation, et cette ligne ne se modifie ni ne s'efface depuis l'application. Remettre une instance à zéro est un geste d'exploitant, fait depuis la base.
- **Un second facteur vous sera demandé aussitôt.** Le rôle propriétaire donne accès aux rémunérations et à la distribution des droits ; l'application l'exige avant d'ouvrir quoi que ce soit. Prévoyez une application d'authentification à portée de main, et conservez les codes de secours affichés à l'enrôlement — ils ne sont montrés qu'une fois.

Le fuseau horaire n'est pas cosmétique : il décide des durées travaillées, changement d'heure compris. Un établissement outre-mer se déclare avec le sien.

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

`ENCRYPTION_KEY` chiffre au repos les colonnes sensibles exigées par le plan (§3.6) — NIR, IBAN, BIC — ainsi que les secrets de second facteur, le mot de passe du serveur d'envoi et **les pièces du dossier salarié**.

```bash
openssl rand -base64 32
```

Elle n'est **pas** livrée avec l'image — une clé publiée dans un dépôt ne protégerait rien. Elle est produite au premier démarrage du conteneur, affichée une fois dans les journaux, et conservée dans le volume `planflow_secrets`. Fournir `ENCRYPTION_KEY` explicitement l'emporte toujours, pour un déploiement qui gère ses secrets par ailleurs — en gardant à l'esprit qu'une variable d'environnement s'affiche dans `docker inspect` et dans l'interface de gestion, ce qui n'en fait pas un meilleur coffre qu'un fichier.

Elle vit **hors de la base** : une sauvegarde volée ne doit pas suffire à lire ces colonnes. La perdre rend ces données irrécupérables — la sauvegarder séparément et documenter sa rotation. Elle chiffre également les secrets de second facteur et le mot de passe du serveur d'envoi.

### Sauvegardes

Deux choses à sauvegarder **ensemble**, plus une à garder à part :

| Quoi | Où |
|---|---|
| Base de données | volume `planflow_db-data` |
| Pièces du dossier salarié | volume `planflow_documents` |
| Clé de chiffrement | volume `planflow_secrets` — **ailleurs**, jamais dans la même sauvegarde |

Restaurer l'un sans l'autre rend un dossier amputé : les pièces référencées en base pointeraient vers des fichiers absents. Et sans la clé, le volume des documents est illisible — c'est précisément ce qu'on attend de lui si quelqu'un l'emporte.

### Second facteur — accès de secours

Les rôles qui lisent les rémunérations ou distribuent les droits doivent porter un second facteur (matrice n° 15) : tant qu'il n'est pas activé, l'application ne leur ouvre aucun écran. Chaque activation délivre dix codes de secours, affichés **une seule fois**.

PlanFlow étant auto-hébergé, il n'y a pas d'éditeur à appeler si un administrateur perd à la fois son téléphone et ses codes. Le retrait se fait alors depuis le serveur :

```bash
pnpm mfa:reset adresse@example.fr
```

Le retrait révoque les sessions ouvertes et s'inscrit au journal d'audit. Il n'est délibérément pas exposé dans l'application : l'exécuter demande déjà un accès au serveur, c'est-à-dire davantage que ce que le second facteur protège.

### Durées de conservation

Aucune durée n'est appliquée par défaut : la matrice interdit d'aligner tout sur cinq ans, et un objet sans politique déclarée se conserve. Les durées se déclarent dans Réglages → Durées de conservation, chacune avec sa justification — elle devra être défendue lors d'un contrôle.

La purge doit tourner périodiquement, par exemple en `cron` :

```bash
pnpm retention:purge --dry   # inventaire, n'efface rien
pnpm retention:purge         # efface les pièces échues, compte par compte
```

Une conservation à titre probatoire (*legal hold*) suspend la purge des objets qu'elle vise, quelle que soit leur échéance. Les journaux d'audit y échappent par construction : ils doivent survivre aux données qu'ils décrivent, sans quoi il deviendrait impossible de démontrer que la purge a eu lieu.

## Vérifier

```bash
pnpm verify      # typecheck + lint + tests unitaires
pnpm test:e2e    # build, serveur standalone, tests de bout en bout
```

`pnpm verify` est ce que la CI exécute sur chaque *pull request*, suivi du build et des tests end-to-end.

## Configuration de la base — à ne pas rater

**L'application ne doit pas se connecter en superutilisateur PostgreSQL.**

En docker-compose c'est déjà réglé : d'abord `docker/init-app-role.sh` au premier démarrage, puis le service `db-init` qui le rejoue **à chaque `docker compose up`** — et seulement ensuite l'application. Le rôle `planflow_app`, `NOSUPERUSER NOBYPASSRLS`, propriétaire de la base — il lui faut ce droit pour appliquer les migrations, et les politiques sont déclarées en `FORCE` précisément pour s'appliquer aussi au propriétaire.

L'idempotence n'est pas un luxe : une base déjà en place dont le rôle manque (ou dont le mot de passe a changé) ne doit pas exiger de SQL à la main. Le service `db-init` corrige les deux cas à chaque relance, et l'application n'est démarrée qu'une fois sa tâche terminée.

Le script ne s'exécute qu'à la **première** initialisation du volume. Sur une installation déjà en place, jouer le même SQL à la main puis basculer `DATABASE_URL` sur ce rôle.

Au démarrage, l'application vérifie ses propres privilèges : elle refuse de se lancer si la base porte plus d'un compte, et se contente d'un avertissement visible dans les journaux s'il n'y en a qu'un — bloquer une installation mono-compte fermerait l'accès de l'entreprise à ses données pour un risque de fuite entre clients qui n'existe pas.

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
