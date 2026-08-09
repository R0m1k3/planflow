/**
 * Pièces du dossier salarié — PLAN.md §4.7 et §3.6.
 *
 * Un dossier RH contient des pièces d'identité, des RIB et des arrêts de
 * travail. Les derniers sont des données de santé, catégorie particulière au
 * sens du RGPD : leur simple **lecture** doit être journalisée, et leur
 * stockage chiffré.
 */

export const DOCUMENT_CATEGORIES = [
  'IDENTITY',
  'BANK',
  'CONTRACT',
  'AMENDMENT',
  'SICK_NOTE',
  'WORK_PERMIT',
  'REGISTER',
  'OTHER',
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  IDENTITY: 'Pièce d’identité',
  BANK: 'Coordonnées bancaires',
  CONTRACT: 'Contrat',
  AMENDMENT: 'Avenant',
  SICK_NOTE: 'Arrêt de travail',
  WORK_PERMIT: 'Titre de séjour',
  REGISTER: 'Registre',
  OTHER: 'Autre',
};

/**
 * Catégories relevant de la santé.
 *
 * Une liste plutôt qu'un drapeau saisi à la main : laisser l'utilisateur
 * déclarer qu'un arrêt de travail n'est pas sensible reviendrait à lui laisser
 * désactiver la journalisation.
 */
const HEALTH_CATEGORIES = new Set<DocumentCategory>(['SICK_NOTE']);

export function isSensitiveCategory(category: DocumentCategory): boolean {
  return HEALTH_CATEGORIES.has(category);
}

/**
 * Types de fichiers acceptés.
 *
 * Restreint volontairement : un dossier RH reçoit des scans et des PDF. Élargir
 * aux documents bureautiques ferait entrer des formats à macros, qu'aucun usage
 * ici ne justifie.
 */
export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
] as const;

/** 20 Mio — un scan de plusieurs pages passe, une vidéo non. Choix produit. */
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

export interface UploadCandidate {
  name: string;
  mimeType: string;
  sizeBytes: number;
}

/** Motif de refus, ou `null` si la pièce est acceptable. */
export function uploadProblem(candidate: UploadCandidate): string | null {
  if (candidate.sizeBytes <= 0) {
    return 'Le fichier est vide.';
  }
  if (candidate.sizeBytes > MAX_DOCUMENT_BYTES) {
    return `Le fichier dépasse ${Math.round(MAX_DOCUMENT_BYTES / 1024 / 1024)} Mio.`;
  }
  if (!(ACCEPTED_MIME_TYPES as readonly string[]).includes(candidate.mimeType)) {
    return 'Format non accepté. Déposez un PDF ou une image (JPEG, PNG, WebP, HEIC).';
  }
  if (!candidate.name.trim()) {
    return 'Le fichier n’a pas de nom.';
  }
  return null;
}

/**
 * Nom d'affichage assaini.
 *
 * Le nom déposé par l'utilisateur ne sert **jamais** à désigner l'emplacement
 * du fichier — celui-ci porte un identifiant tiré au sort. L'assainir reste
 * utile pour l'en-tête de téléchargement, où un retour à la ligne ou un
 * guillemet permettrait d'y injecter un second champ.
 */
export function sanitiseFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/["\\]/g, '')
    .trim();
  return cleaned.slice(0, 120) || 'document';
}

/**
 * Nom en ASCII pur, pour l'en-tête `Content-Disposition`.
 *
 * Les accents y sont transmis séparément, en `filename*` ; le repli ASCII sert
 * aux clients qui ne lisent que `filename`.
 */
export function asciiFileName(name: string): string {
  return (
    sanitiseFileName(name)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, '_') || 'document'
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Kio`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mio`;
}

/**
 * Durée de validité d'un lien de téléchargement.
 *
 * Assez pour ouvrir la pièce depuis la liste, trop peu pour qu'un lien recopié
 * dans un message reste exploitable. Le lien seul ne suffit d'ailleurs pas :
 * la session et la capacité sont revérifiées à la lecture.
 */
export const DOWNLOAD_LINK_TTL_SECONDS = 120;

export function isLinkExpired(expiresAtSeconds: number, nowMs: number): boolean {
  return expiresAtSeconds * 1000 <= nowMs;
}
