-- Première installation — PLAN.md §5.
--
-- Après les migrations, une instance neuve a le schéma mais aucun compte et
-- aucun utilisateur : personne ne peut se connecter, et le seed installe des
-- données de démonstration qu'une production ne doit pas recevoir. L'écran
-- d'installation comble ce trou ; cette table est ce qui l'empêche de se
-- rouvrir une fois refermé.

CREATE TABLE "Installation" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "accountId" TEXT NOT NULL,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Installation_pkey" PRIMARY KEY ("id")
);

-- Le doublon devient impossible, et non seulement improbable : deux
-- installations concurrentes se disputent une clé primaire, et la perdante
-- annule tout son travail au lieu de créer un second propriétaire.
ALTER TABLE "Installation"
  ADD CONSTRAINT "Installation_singleton" CHECK ("id" = 'singleton');

CREATE UNIQUE INDEX "Installation_accountId_key" ON "Installation"("accountId");

ALTER TABLE "Installation"
  ADD CONSTRAINT "Installation_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "Account"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Volontairement **hors** row-level security.
--
-- C'est toute sa raison d'être : la politique de `Account` ne laisse voir que
-- le compte courant, donc une instance installée paraît vierge à une requête
-- sans session. Poser la question à `Account` rouvrirait l'écran
-- d'installation — et donc la création d'un propriétaire — à n'importe quel
-- visiteur. Cette table ne porte que l'existence d'une installation et un
-- identifiant de compte, que le lien d'invitation transmet déjà en clair.

-- Ni UPDATE ni DELETE : une instance installée ne redevient pas vierge sur une
-- requête de l'application. La contrepartie est assumée — la suppression en
-- cascade d'un compte bute sur ce trigger, si bien que remettre une instance à
-- zéro est un geste d'exploitant, fait depuis la base et non depuis un écran.
CREATE TRIGGER installation_append_only
  BEFORE UPDATE OR DELETE ON "Installation"
  FOR EACH ROW EXECUTE FUNCTION planflow_deny_write();
