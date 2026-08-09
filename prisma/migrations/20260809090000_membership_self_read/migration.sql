-- Lecture de son propre rattachement — préalable à l'authentification.
--
-- `resolveSession` doit trouver le compte d'un utilisateur **avant** de pouvoir
-- poser `app.account_id` : c'est le rattachement qui le désigne. Sans cette
-- politique, la seule façon d'y parvenir serait de connecter l'application avec
-- un compte qui contourne la row-level security — c'est-à-dire de la désactiver
-- partout pour résoudre un cas d'amorçage.
--
-- La politique reste étroite : elle n'ouvre que les lignes dont l'utilisateur
-- est le titulaire, et seulement quand `app.user_id` a été posé — ce que ne fait
-- que la résolution de session, sur un identifiant tiré d'un jeton déjà validé.

CREATE OR REPLACE FUNCTION planflow_current_user() RETURNS text AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '');
$$ LANGUAGE sql STABLE;

CREATE POLICY membership_self_read ON "Membership"
  FOR SELECT
  USING ("userId" IS NOT NULL AND "userId" = planflow_current_user());
