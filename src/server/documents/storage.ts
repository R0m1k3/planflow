import 'server-only';

import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';

import { env } from '@/lib/env';
import { checksumBytes, decryptBytes, encryptBytes } from '@/server/crypto';

/**
 * Stockage des pièces — PLAN.md §3.6.
 *
 * Sur disque plutôt qu'en base : des mégaoctets en base rendraient toute
 * sauvegarde impraticable. Chiffré, parce qu'un arrêt de travail est une donnée
 * de santé et qu'un disque volé ne doit rien livrer.
 *
 * L'emplacement est **tiré au sort**, jamais dérivé du nom déposé. C'est ce qui
 * rend la traversée de chemin impossible par construction plutôt que par
 * filtrage — un filtre s'oublie, un identifiant aléatoire ne se négocie pas.
 */

export interface StoredFile {
  fileKey: string;
  checksum: string;
  sizeBytes: number;
}

function root(): string {
  return resolve(env.DOCUMENT_STORE);
}

/**
 * Chemin absolu d'une clé, vérifié.
 *
 * La clé vient de la base et non d'un formulaire, mais la vérification reste :
 * une donnée corrompue ou une migration maladroite ne doit pas pouvoir faire
 * écrire ailleurs que dans le magasin.
 */
function pathFor(fileKey: string): string {
  const base = root();
  const target = resolve(join(base, fileKey));
  if (target !== base && !target.startsWith(base + sep)) {
    throw new Error('Clé de fichier hors du magasin de documents');
  }
  return target;
}

/** `aa/bb/<uuid>` — deux niveaux, pour ne pas entasser des milliers d'entrées. */
function newKey(accountId: string): string {
  const id = randomUUID();
  return join(accountId, id.slice(0, 2), id.slice(2, 4), id);
}

export async function storeFile(
  accountId: string,
  content: Uint8Array,
): Promise<StoredFile> {
  const fileKey = newKey(accountId);
  const target = pathFor(fileKey);

  await mkdir(dirname(target), { recursive: true });
  // Le clair ne touche jamais le disque : on chiffre avant d'écrire, et la
  // taille comme l'empreinte se rapportent au clair, seul objet que
  // l'utilisateur reconnaît.
  await writeFile(target, encryptBytes(content), { mode: 0o600 });

  return {
    fileKey,
    checksum: checksumBytes(content),
    sizeBytes: content.byteLength,
  };
}

export interface ReadResult {
  content: Buffer;
  /** Faux si le contenu ne correspond plus à l'empreinte enregistrée. */
  intact: boolean;
}

export async function readFileByKey(
  fileKey: string,
  expectedChecksum: string,
): Promise<ReadResult> {
  const content = decryptBytes(await readFile(pathFor(fileKey)));
  return { content, intact: checksumBytes(content) === expectedChecksum };
}

/**
 * Efface le contenu.
 *
 * L'entrée en base reste, marquée supprimée : le dossier doit garder trace
 * qu'une pièce a existé et qui l'a retirée. C'est le contenu qui disparaît, pas
 * l'événement.
 */
export async function removeFile(fileKey: string): Promise<void> {
  await rm(pathFor(fileKey), { force: true });
}
