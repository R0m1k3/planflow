-- ---------------------------------------------------------------------------
-- Retrait de l'envoi des plannings par SMS.
--
-- Le drapeau était un consentement recueilli pour un canal qui n'a jamais
-- existé : aucun envoi de SMS n'est branché, et il n'est pas prévu de l'être.
-- Un consentement conservé sans finalité est une donnée collectée sans base
-- légale — la minimisation impose de la supprimer, pas de la garder « au cas
-- où ».
-- ---------------------------------------------------------------------------

ALTER TABLE "EmployeeProfile" DROP COLUMN IF EXISTS "smsSchedules";
