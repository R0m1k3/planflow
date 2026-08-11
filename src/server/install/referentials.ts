import type { Prisma } from '@prisma/client';

import { frenchHolidays } from '@/domain/absences/holidays';
import { IDCC_1517_PARAMETERS, IDCC_1517_PROVENANCE } from '@/domain/compliance/idcc1517';
import { POSTE_CODES, POSTE_LABELS } from '@/lib/design/postes';

/**
 * Référentiels d'une instance neuve — PLAN.md §5 et WP-02.
 *
 * Sans eux, une instance installée a le schéma et rien à quoi l'accrocher :
 * aucun type d'absence, donc aucune demande saisissable ; aucune étiquette,
 * donc aucun créneau nommé ; aucune convention, donc un moteur de règles muet
 * qui laisse passer une semaine de 60 heures sans rien dire. Le trou se
 * comblait jusqu'ici avec le seed de démonstration, qui refuse de tourner en
 * production — l'instance de production restait donc inutilisable.
 *
 * **Ce ne sont pas des données d'exemple.** Chaque ligne posée ici est soit un
 * minimum légal, soit une valeur d'amorce que le client remplace depuis les
 * réglages. Rien de fictif : ni salarié, ni planning, ni absence.
 */

const AMORCE_DATE = new Date('2026-01-01');

/** Politiques de conservation — durées et justifications de §12.5. */
const RETENTION: ReadonlyArray<
  readonly [string, number, string, string]
> = [
  ['Shift', 12, 'creation', 'Décompte des horaires : 1 an minimum (matrice n° 21).'],
  ['ForfaitDayEntry', 36, 'creation', 'Décompte des jours de forfait : 3 ans minimum.'],
  ['UserContract', 60, 'contract_end', 'Pièces contractuelles : 5 ans.'],
  [
    'PersonnelRegister',
    60,
    'employee_departure',
    'Registre du personnel : 5 ans après le départ.',
  ],
  [
    'PayrollVariable',
    72,
    'period_end',
    "Éléments d'assiette transmis au logiciel de paie : 6 ans.",
  ],
];

/**
 * Types d'absence d'amorce.
 *
 * Liste relevée sur le sélecteur du produit audité, recoupée avec les rubriques
 * du dossier de paie. Elle couvre ce qu'un commerce de détail rencontre
 * réellement — un « congé sans solde » et un « congé payé » ne suffisent pas à
 * tenir un registre.
 *
 * **Les codes sont internes et stables.** Ils ne sont montrés nulle part et ne
 * correspondent à aucune nomenclature externe : ils servent à référencer un
 * type sans dépendre de son libellé, qui se renomme.
 *
 * `silaeCode` reste **nul** : la correspondance entre un type et une rubrique
 * de paie appartient au dossier du client. La renseigner ici imputerait des
 * congés à la rubrique d'un autre cabinet.
 *
 * `À VALIDER` — les drapeaux sont des valeurs d'amorce. `isSocialSecurity` suit
 * la nature de l'arrêt et ne se discute pas ; l'acquisition de congés pendant
 * une absence, en revanche, dépend de la convention et se règle depuis
 * `/reglages/types-absence`.
 *
 * « Repos hebdomadaire » figure au sélecteur du produit audité et **pas ici** :
 * c'est un repos légal, porté par le modèle `Rest`, pas une absence qui se
 * demande. En faire un type d'absence laisserait un manager refuser une
 * obligation.
 */
const ABSENCE_TYPES = [
  // --- Congés et repos ----------------------------------------------------
  { code: 'CP', name: 'Congé payé', colorKey: 'cp', isPaid: true, social: false, notice: 30, accrual: true, justify: false },
  { code: 'RTT', name: 'RTT', colorKey: 'rtt', isPaid: true, social: false, notice: 7, accrual: true, justify: false },
  { code: 'RC', name: 'Repos compensateur', colorKey: 'rtt', isPaid: true, social: false, notice: 7, accrual: true, justify: false },
  { code: 'RC_NUIT', name: 'Repos compensateur de nuit', colorKey: 'rtt', isPaid: true, social: false, notice: 7, accrual: true, justify: false },
  { code: 'RC_HAB', name: "Repos compensateur d'habillement", colorKey: 'rtt', isPaid: true, social: false, notice: 7, accrual: true, justify: false },
  { code: 'RECUP_JF', name: 'Récupération jour férié', colorKey: 'rtt', isPaid: true, social: false, notice: 7, accrual: true, justify: false },
  { code: 'JF', name: 'Jour férié', colorKey: 'ferie', isPaid: true, social: false, notice: null, accrual: true, justify: false },
  { code: 'CSS', name: 'Congé sans solde', colorKey: 'sans-solde', isPaid: false, social: false, notice: 15, accrual: false, justify: false },

  // --- Santé et accidents — catégories particulières -----------------------
  { code: 'MAL', name: 'Arrêt maladie', colorKey: 'maladie', isPaid: false, social: true, notice: null, accrual: false, justify: true },
  { code: 'MP', name: 'Maladie professionnelle', colorKey: 'maladie', isPaid: false, social: true, notice: null, accrual: true, justify: true },
  { code: 'AT', name: 'Accident du travail', colorKey: 'maladie', isPaid: false, social: true, notice: null, accrual: true, justify: true },
  { code: 'AT_TRAJET', name: 'Accident de trajet', colorKey: 'maladie', isPaid: false, social: true, notice: null, accrual: true, justify: true },
  { code: 'VM', name: 'Visite médicale', colorKey: 'maladie', isPaid: true, social: false, notice: null, accrual: true, justify: true },

  // --- Famille -------------------------------------------------------------
  { code: 'MAT', name: 'Congé maternité', colorKey: 'famille', isPaid: false, social: true, notice: null, accrual: true, justify: true },
  { code: 'PAT', name: 'Congé paternité', colorKey: 'famille', isPaid: false, social: true, notice: null, accrual: true, justify: true },
  { code: 'PAR', name: 'Congé parental', colorKey: 'famille', isPaid: false, social: false, notice: 30, accrual: false, justify: true },
  { code: 'NAISS', name: 'Congé supplémentaire de naissance', colorKey: 'famille', isPaid: true, social: false, notice: null, accrual: true, justify: true },
  { code: 'EVT_FAM', name: 'Évènement familial', colorKey: 'famille', isPaid: true, social: false, notice: null, accrual: true, justify: true },

  // --- Formation et obligations -------------------------------------------
  { code: 'FORM', name: 'Formation', colorKey: 'formation', isPaid: true, social: false, notice: 15, accrual: true, justify: false },
  { code: 'EXAM', name: 'Congé pour examen', colorKey: 'formation', isPaid: true, social: false, notice: 15, accrual: true, justify: true },

  // --- Absences non planifiées et sanctions -------------------------------
  { code: 'ABS_JUS', name: 'Absence justifiée', colorKey: 'sans-solde', isPaid: false, social: false, notice: null, accrual: false, justify: true },
  { code: 'ABS_INJ', name: 'Absence injustifiée', colorKey: 'sans-solde', isPaid: false, social: false, notice: null, accrual: false, justify: false },
  { code: 'INDISPO', name: 'Indisponibilité ponctuelle', colorKey: 'sans-solde', isPaid: false, social: false, notice: null, accrual: false, justify: false },
  { code: 'MAP_D', name: 'Mise à pied disciplinaire', colorKey: 'sanction', isPaid: false, social: false, notice: null, accrual: false, justify: true },
  { code: 'MAP_C', name: 'Mise à pied conservatoire', colorKey: 'sanction', isPaid: false, social: false, notice: null, accrual: false, justify: true },
] as const;

export async function installReferentials(
  tx: Prisma.TransactionClient,
  accountId: string,
  locationId: string,
): Promise<void> {
  // --- Étiquettes de planning --------------------------------------------
  // La palette est celle du produit, calculée pour rester distinguable en
  // vision daltonienne. Les libellés se renomment depuis les réglages.
  for (const [index, code] of POSTE_CODES.entries()) {
    await tx.label.create({
      data: {
        accountId,
        code: code.toUpperCase(),
        name: POSTE_LABELS[code],
        paletteKey: code,
        position: index,
      },
    });
  }

  // --- Types d'absence ----------------------------------------------------
  for (const type of ABSENCE_TYPES) {
    await tx.absenceType.create({
      data: {
        accountId,
        code: type.code,
        name: type.name,
        colorKey: type.colorKey,
        isPaid: type.isPaid,
        countsAsWorkTime: false,
        affectsPaidLeaveAccrual: type.accrual,
        isSocialSecurity: type.social,
        requiresJustification: type.justify,
        minNoticeDays: type.notice,
      },
    });
  }

  // --- Convention d'amorce ------------------------------------------------
  // IDCC 1517 par défaut (PLAN.md §2), remplaçable depuis les réglages : la
  // convention se réédite en version datée, elle ne se modifie pas.
  await tx.collectiveAgreement.create({
    data: {
      accountId,
      idcc: '1517',
      name: 'Commerces de détail non alimentaires',
      parameters: IDCC_1517_PARAMETERS as never,
      version: 1,
      effectiveFrom: AMORCE_DATE,
      source:
        'Sources secondaires publiques — À VALIDER contre le texte consolidé Legifrance',
    },
  });

  // --- Registre de paramétrage juridique ----------------------------------
  // L'origine de chaque valeur — ordre public, convention, accord d'entreprise
  // — décide de ce qui s'impose et de ce qui se négocie. Elle est enregistrée
  // avec sa source, pas seulement commentée dans le code (§12.7).
  for (const entry of IDCC_1517_PROVENANCE) {
    await tx.legalConfigEntry.create({
      data: {
        accountId,
        domain: 'temps',
        key: entry.key,
        value: `${entry.label} : ${entry.value}`,
        source: `[${entry.origin}] ${entry.source}`,
        population: 'Tous salariés',
        effectiveFrom: AMORCE_DATE,
      },
    });
  }

  // --- Durées de conservation ---------------------------------------------
  for (const [objectType, durationMonths, startPoint, justification] of RETENTION) {
    await tx.retentionPolicy.create({
      data: {
        accountId,
        objectType,
        durationMonths,
        startPoint,
        justification,
        effectiveFrom: AMORCE_DATE,
      },
    });
  }

  // --- Jours fériés --------------------------------------------------------
  // Calculés, pas listés : une table écrite à la main n'est juste que l'année
  // où on l'écrit. Un férié manquant se décompte comme un jour de congé, et le
  // salarié perd un jour sans que personne ne le voie.
  //
  // Seul le 1er mai est chômé de droit. Les jours garantis par la convention
  // sont choisis par l'employeur : ils ne se devinent pas ici.
  const currentYear = new Date().getUTCFullYear();
  for (const year of [currentYear, currentYear + 1]) {
    for (const holiday of frenchHolidays(year)) {
      await tx.holiday.create({
        data: {
          accountId,
          locationId,
          localDate: new Date(`${holiday.isoDate}T00:00:00Z`),
          name: holiday.name,
          isPaidOff: holiday.isoDate.slice(5) === '05-01',
        },
      });
    }
  }

  // Aucun dimanche du maire n'est posé : la liste est arrêtée par arrêté
  // municipal, établissement par établissement. En inventer rendrait opposable
  // un quota qui n'a été autorisé nulle part.
}
