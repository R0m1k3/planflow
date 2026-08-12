-- Types d'absence sur les comptes installés avant WP-02 — PLAN.md §7.
--
-- `installReferentials()` pose le référentiel des absences depuis WP-02, mais
-- il ne tourne qu'à la création du compte. Une instance installée **avant**
-- garde donc zéro type d'absence, et le menu « Type » du formulaire de demande
-- reste vide : le module de congés est inutilisable, sans qu'aucune erreur ne
-- le signale. Déployer le correctif ne suffit pas — d'où ce rattrapage.
--
-- Il ne s'applique qu'aux comptes dont le référentiel est **entièrement** vide.
-- Un compte qui a renommé ou archivé ses types garde les siens : personne ne
-- doit voir réapparaître un type qu'il a délibérément retiré.
--
-- La liste double celle de `referentials.ts`, à dessein. Une migration est
-- figée par nature — elle décrit l'état à rattraper au 12 août 2026, pas la
-- liste courante. Les évolutions ultérieures du référentiel se font depuis
-- `/reglages/types-absence`, pas en rééditant ce fichier.

-- `AbsenceType` porte FORCE ROW LEVEL SECURITY : la politique d'insertion vaut
-- pour le propriétaire de la table comme pour tout le monde, et une migration
-- n'a pas de compte courant. La levée tient le temps de la transaction — un
-- échec l'annule, la table ne peut pas rester ouverte.
ALTER TABLE "AbsenceType" NO FORCE ROW LEVEL SECURITY;

INSERT INTO "AbsenceType" (
  "id", "accountId", "code", "name", "colorKey",
  "isPaid", "countsAsWorkTime", "affectsPaidLeaveAccrual",
  "isSocialSecurity", "requiresJustification", "minNoticeDays"
)
SELECT
  gen_random_uuid()::text,
  a."id",
  t."code", t."name", t."colorKey",
  t."isPaid", FALSE, t."accrual",
  t."social", t."justify", t."notice"
FROM "Account" a
CROSS JOIN (
  VALUES
    -- Congés et repos
    ('CP',        'Congé payé',                          'cp',         TRUE,  TRUE,  FALSE, FALSE, 30),
    ('RTT',       'RTT',                                 'rtt',        TRUE,  TRUE,  FALSE, FALSE, 7),
    ('RC',        'Repos compensateur',                  'rtt',        TRUE,  TRUE,  FALSE, FALSE, 7),
    ('RC_NUIT',   'Repos compensateur de nuit',          'rtt',        TRUE,  TRUE,  FALSE, FALSE, 7),
    ('RC_HAB',    'Repos compensateur d''habillement',   'rtt',        TRUE,  TRUE,  FALSE, FALSE, 7),
    ('RECUP_JF',  'Récupération jour férié',             'rtt',        TRUE,  TRUE,  FALSE, FALSE, 7),
    ('JF',        'Jour férié',                          'ferie',      TRUE,  TRUE,  FALSE, FALSE, NULL),
    ('CSS',       'Congé sans solde',                    'sans-solde', FALSE, FALSE, FALSE, FALSE, 15),

    -- Santé et accidents — catégories particulières au sens du RGPD
    ('MAL',       'Arrêt maladie',                       'maladie',    FALSE, FALSE, TRUE,  TRUE,  NULL),
    ('MP',        'Maladie professionnelle',             'maladie',    FALSE, TRUE,  TRUE,  TRUE,  NULL),
    ('AT',        'Accident du travail',                 'maladie',    FALSE, TRUE,  TRUE,  TRUE,  NULL),
    ('AT_TRAJET', 'Accident de trajet',                  'maladie',    FALSE, TRUE,  TRUE,  TRUE,  NULL),
    ('VM',        'Visite médicale',                     'maladie',    TRUE,  TRUE,  FALSE, TRUE,  NULL),

    -- Famille
    ('MAT',       'Congé maternité',                     'famille',    FALSE, TRUE,  TRUE,  TRUE,  NULL),
    ('PAT',       'Congé paternité',                     'famille',    FALSE, TRUE,  TRUE,  TRUE,  NULL),
    ('PAR',       'Congé parental',                      'famille',    FALSE, FALSE, FALSE, TRUE,  30),
    ('NAISS',     'Congé supplémentaire de naissance',   'famille',    TRUE,  TRUE,  FALSE, TRUE,  NULL),
    ('EVT_FAM',   'Évènement familial',                  'famille',    TRUE,  TRUE,  FALSE, TRUE,  NULL),

    -- Formation et obligations
    ('FORM',      'Formation',                           'formation',  TRUE,  TRUE,  FALSE, FALSE, 15),
    ('EXAM',      'Congé pour examen',                   'formation',  TRUE,  TRUE,  FALSE, TRUE,  15),

    -- Absences non planifiées et sanctions
    ('ABS_JUS',   'Absence justifiée',                   'sans-solde', FALSE, FALSE, FALSE, TRUE,  NULL),
    ('ABS_INJ',   'Absence injustifiée',                 'sans-solde', FALSE, FALSE, FALSE, FALSE, NULL),
    ('INDISPO',   'Indisponibilité ponctuelle',          'sans-solde', FALSE, FALSE, FALSE, FALSE, NULL),
    ('MAP_D',     'Mise à pied disciplinaire',           'sanction',   FALSE, FALSE, FALSE, TRUE,  NULL),
    ('MAP_C',     'Mise à pied conservatoire',           'sanction',   FALSE, FALSE, FALSE, TRUE,  NULL)
) AS t ("code", "name", "colorKey", "isPaid", "accrual", "social", "justify", "notice")
WHERE NOT EXISTS (
  SELECT 1 FROM "AbsenceType" existing WHERE existing."accountId" = a."id"
);

ALTER TABLE "AbsenceType" FORCE ROW LEVEL SECURITY;
