/**
 * Correspondances Silae du dossier FROUARD DISTRIBUTION.
 *
 * **Données de dossier, pas de produit.** Ces codes appartiennent au
 * paramétrage Silae de ce client et n'ont aucune valeur pour un autre : deux
 * clients du même cabinet ne partagent pas leurs rubriques. Ils vivent donc
 * dans le seed, jamais dans `src/domain/payroll` — écrire `HS-HS50` dans un
 * calcul rendrait l'outil inutilisable au deuxième dossier, et incorrigible
 * sans livraison le jour où le cabinet renumérote.
 *
 * **Source** : configuration de l'intégration Silae du compte, relevée le
 * 11 août 2026. Ce ne sont pas des codes déduits d'une documentation publique —
 * il n'en existe pas : Silae impose que le fichier d'import soit le miroir du
 * paramétrage du dossier.
 *
 * `À VALIDER` — quatre rubriques du dossier portent un préfixe `AB-` **sans
 * numéro** (voir `INCOMPLETE_IN_DOSSIER`). Elles ne sont pas reprises ici :
 * importer un code tronqué ferait échouer l'import de paie, ou pire, le ferait
 * réussir en imputant à la mauvaise rubrique.
 */

/** Rubriques laissées vides ou incomplètes dans le paramétrage du dossier. */
export const INCOMPLETE_IN_DOSSIER = [
  { label: 'Évènement familial', observed: 'AB-' },
  { label: 'Repos compensateur de nuit', observed: 'AB-' },
  { label: "Repos compensateur d'habillement", observed: 'AB-' },
  { label: 'Visite médicale', observed: 'AB-' },
] as const;

/**
 * Code d'absence par type PlanFlow.
 *
 * La valeur est la **partie après `AB-`**, comme le stocke
 * `AbsenceType.silaeCode` : le préfixe est ajouté à la sérialisation.
 */
export const ABSENCE_CODES: Record<string, string> = {
  // Congés payés → AB-300
  CP: '300',
  // RTT → AB-310
  RTT: '310',
  // Arrêt maladie - Initial → AB-100. L'extension n'est pas paramétrée au
  // dossier : un arrêt prolongé se saisit aujourd'hui à la main côté paie.
  MAL: '100',
  // Congé sans solde → AB-632
  SS: '632',
  // Repos compensateur de remplacement → AB-335
  RC: '335',
};

/**
 * Code Silae par élément de paie calculé.
 *
 * Les trois codes qui manquaient à la conception — 50 %, complémentaires à
 * 10 % et à 25 % — sont désormais connus. `FORFAIT_DAYS` reste absent : aucune
 * rubrique de forfait jours n'existe au paramétrage, et l'inventer produirait
 * un export refusé au premier cadre autonome.
 */
export const ELEMENT_CODES: Record<string, string> = {
  WORKED_DAYS: 'Nombre total de jours travailles',
  WORKED_HOURS: 'Heures travaillees',
  MISSING_HOURS: 'Heures manquantes au contrat',
  SUNDAY_HOURS: 'EV-HDimanche',
  HOLIDAY_HOURS: 'EV-HFerie',
  OVERTIME_25: 'HS-HS25',
  OVERTIME_50: 'HS-HS50',
  COMPLEMENTARY_10: 'HS-HC10',
  COMPLEMENTARY_25: 'HS-HC25',
};

/**
 * Catalogue complet relevé au dossier.
 *
 * Conservé en entier — y compris les rubriques que PlanFlow ne calcule pas
 * encore — parce qu'il documente ce que le dossier accepte. Le jour où les
 * heures de nuit ou les paniers repas entrent au périmètre, le code est déjà
 * là et n'aura pas à être redemandé au cabinet.
 *
 * Les taux de nuit sont recopiés **tels quels**. Leur numérotation surprend
 * (`EV-HNuit24-2` pour 10 %, `EV-HNuit2-4` pour 20 %) : c'est le paramétrage du
 * dossier, et le « corriger » ici imputerait la majoration à la mauvaise
 * rubrique.
 */
export const DOSSIER_CATALOGUE: Array<{ label: string; code: string }> = [
  { label: 'Absence formation rémunérée', code: 'AB-410' },
  { label: 'Absence injustifiée - Non payé', code: 'AB-630' },
  { label: 'Absence injustifiée - Payé', code: 'AB-631' },
  { label: 'Absence justifiée - Non payé', code: 'AB-630' },
  { label: 'Absence justifiée - Payé', code: 'AB-631' },
  { label: 'Accident du travail - Initial', code: 'AB-120' },
  { label: 'Arrêt maladie - Initial', code: 'AB-100' },
  { label: 'Chômage partiel', code: 'AB-609' },
  { label: 'Congé maternité', code: 'AB-200' },
  { label: 'Congé parental', code: 'AB-230' },
  { label: 'Congé paternité', code: 'AB-210' },
  { label: 'Congé sans solde', code: 'AB-632' },
  { label: 'Congés payés', code: 'AB-300' },
  { label: 'Jours fériés chômés (heures)', code: 'AB-301' },
  { label: 'Maladie professionnelle - Initial', code: 'AB-110' },
  { label: 'Mise à pied conservatoire', code: 'AB-641' },
  { label: 'Mise à pied disciplinaire', code: 'AB-640' },
  { label: 'Repos compensateur de remplacement', code: 'AB-335' },
  { label: 'Retard', code: 'AB-630' },
  { label: 'RTT', code: 'AB-310' },

  { label: 'Heures complémentaires (5 %)', code: 'HS-HC5' },
  { label: 'Heures complémentaires (10 %)', code: 'HS-HC10' },
  { label: 'Heures complémentaires (25 %)', code: 'HS-HC25' },
  { label: 'Heures supplémentaires (0 %)', code: 'HS-HS00' },
  { label: 'Heures supplémentaires (10 %)', code: 'HS-HS10' },
  { label: 'Heures supplémentaires (15 %)', code: 'HS-HS15' },
  { label: 'Heures supplémentaires (20 %)', code: 'HS-HS20' },
  { label: 'Heures supplémentaires (25 %)', code: 'HS-HS25' },
  { label: 'Heures supplémentaires (50 %)', code: 'HS-HS50' },
  { label: 'Heures supplémentaires (100 %)', code: 'HS-HS100' },
  { label: 'Heures travaillées majorées (dimanche) 10 %', code: 'HS-HS10-D' },
  { label: 'Heures travaillées majorées (dimanche) 15 %', code: 'HS-HS15-D' },
  { label: 'Heures travaillées majorées (dimanche) 30 %', code: 'HS-HS30-D' },
  { label: 'Heures travaillées majorées (dimanche) 33 %', code: 'HS-HS33-D' },
  { label: 'Heures travaillées majorées (dimanche) 50 %', code: 'HS-HS50-D' },
  { label: 'Heures travaillées majorées (dimanche) 100 %', code: 'EV-HDimanche' },
  { label: 'Heures travaillées majorées (1er mai)', code: 'C01' },
  { label: 'Heures travaillées majorées (jours fériés)', code: 'EV-HFerie' },

  { label: 'Coupures', code: 'EV-nb-coupure' },
  { label: 'Heures de nuit (0 %)', code: 'EV-HNuit-0' },
  { label: 'Heures de nuit (5 %)', code: 'EV-HNuit2-5' },
  { label: 'Heures de nuit (10 %)', code: 'EV-HNuit24-2' },
  { label: 'Heures de nuit (20 %)', code: 'EV-HNuit2-4' },
  { label: 'Heures de nuit (25 %)', code: 'EV-HNuit2-6' },
  { label: 'Heures de nuit (30 %)', code: 'EV-HNuit2-3' },
  { label: 'Heures de nuit (50 %)', code: 'EV-HNuit' },
  { label: 'Repas : avantage en nature', code: 'EV-A01' },
  { label: 'Repas : indemnité repas', code: 'EV-A02' },
  { label: 'Repas : prime de panier', code: 'EV-PrimePanier' },
  { label: 'Repas : titre restaurant', code: 'EV-TitreRestaurant' },

  { label: 'Entrée / Sortie', code: 'Entree / Sortie' },
  { label: 'Heures manquantes au contrat', code: 'Heures manquantes au contrat' },
  { label: 'Heures normales', code: 'Heures normales' },
  { label: 'Heures travaillées', code: 'Heures travaillees' },
  { label: 'Heures travaillées (extra)', code: 'Heures travaillees (extra)' },
  { label: 'Nombre total de jours travaillés', code: 'Nombre total de jours travailles' },
  { label: 'Note transport', code: 'Note transport' },
  { label: 'Nouveau solde RCR', code: 'Nouveau solde RCR' },
  { label: 'RCR à payer', code: 'RCR a payer' },
  { label: 'Solde de modulation', code: 'Solde de modulation' },
];
