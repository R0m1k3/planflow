-- Extensions PostgreSQL dont dépendent les lots suivants.
--
-- citext  : adresses e-mail insensibles à la casse, sans dupliquer un champ
--           normalisé à côté de la valeur saisie.
-- pgcrypto: primitives utilisées par les contrôles d'intégrité (empreintes
--           d'exports, PLAN.md §8.3). Le chiffrement des colonnes sensibles
--           reste applicatif, clé hors base (PLAN.md §3.6).

CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
