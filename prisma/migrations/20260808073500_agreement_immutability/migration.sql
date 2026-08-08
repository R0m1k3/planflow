-- Immutabilité ciblée d'une version de convention.
--
-- Le blocage total posé avec la table interdisait aussi d'y consigner une
-- approbation, qui est pourtant un acte postérieur légitime : une version est
-- chargée, puis relue et approuvée par le gestionnaire de paie.
--
-- Ce qui doit rester figé, c'est le **contenu** — paramètres, IDCC, version,
-- date d'effet — parce que c'est lui qui rend une paie antérieure
-- reproductible. Corriger une valeur passe par une nouvelle version datée.

DROP TRIGGER IF EXISTS collective_agreement_append_only ON "CollectiveAgreement";

CREATE OR REPLACE FUNCTION planflow_agreement_frozen() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'Une version de convention ne se supprime pas : une paie antérieure doit rester reproductible.'
      USING ERRCODE = 'restrict_violation';
  END IF;

  IF NEW."parameters"::text IS DISTINCT FROM OLD."parameters"::text
     OR NEW."idcc" IS DISTINCT FROM OLD."idcc"
     OR NEW."version" IS DISTINCT FROM OLD."version"
     OR NEW."effectiveFrom" IS DISTINCT FROM OLD."effectiveFrom" THEN
    RAISE EXCEPTION
      'Le contenu d''une version de convention est figé. Publier une nouvelle version datée.'
      USING ERRCODE = 'restrict_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER collective_agreement_frozen
  BEFORE UPDATE OR DELETE ON "CollectiveAgreement"
  FOR EACH ROW EXECUTE FUNCTION planflow_agreement_frozen();
