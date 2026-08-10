import 'server-only';

import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';

import { RUP_COLUMNS, type RupPerson } from '@/domain/legal/rup';
import type { RupData } from '@/server/employees/rup';

/**
 * Rendu du registre unique du personnel.
 *
 * Aucune forme n'est imposée par la loi : ce qui compte est que les mentions y
 * soient, lisibles, et que le document puisse être présenté tel quel en cas de
 * contrôle. D'où un tableau paysage sobre plutôt qu'une mise en page.
 *
 * Helvetica et l'encodage WinAnsi : les accents français y sont, et une police
 * embarquée alourdirait le fichier sans rien apporter à un tableau.
 */

const A4_LANDSCAPE: [number, number] = [841.89, 595.28];
const MARGIN = 32;
const ROW_HEIGHT = 18;
const FONT_SIZE = 8;

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' });

function cell(person: RupPerson, key: keyof RupPerson): string {
  const value = person[key];
  if (value === null || value === '') return '—';
  if (value instanceof Date) return dateFormat.format(value);
  return String(value);
}

/** Coupe au lieu de déborder : une colonne qui empiète sur la suivante rend
 *  les deux illisibles. */
function fit(text: string, font: PDFFont, size: number, width: number): string {
  if (font.widthOfTextAtSize(text, size) <= width) return text;
  let cut = text;
  while (cut.length > 1 && font.widthOfTextAtSize(`${cut}…`, size) > width) {
    cut = cut.slice(0, -1);
  }
  return `${cut}…`;
}

export async function renderRegisterPdf(data: RupData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Registre unique du personnel — ${data.locationName}`);
  pdf.setCreator('PlanFlow');

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const usable = A4_LANDSCAPE[0] - MARGIN * 2;
  const widths = RUP_COLUMNS.map((column) => column.width * usable);
  const ink = rgb(0.11, 0.11, 0.11);
  const faint = rgb(0.62, 0.62, 0.62);
  const rule = rgb(0.85, 0.85, 0.85);

  const printedOn = dateFormat.format(new Date());
  let page = pdf.addPage(A4_LANDSCAPE);
  let y = A4_LANDSCAPE[1] - MARGIN;

  const header = () => {
    page.drawText('Registre unique du personnel', {
      x: MARGIN,
      y: y - 12,
      size: 14,
      font: bold,
      color: ink,
    });
    page.drawText(
      [
        data.locationName,
        data.siret ? `SIRET ${data.siret}` : null,
        `édité le ${printedOn}`,
      ]
        .filter(Boolean)
        .join(' · '),
      { x: MARGIN, y: y - 28, size: 9, font: regular, color: faint },
    );
    y -= 48;

    let x = MARGIN;
    RUP_COLUMNS.forEach((column, index) => {
      page.drawText(column.label, {
        x,
        y: y - 10,
        size: FONT_SIZE,
        font: bold,
        color: ink,
      });
      x += widths[index] as number;
    });
    y -= 16;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: MARGIN + usable, y },
      thickness: 0.7,
      color: rule,
    });
    y -= 4;
  };

  header();

  for (const person of data.people) {
    // Nouvelle page avant d'écrire, pas après : une ligne à moitié sous la
    // marge est pire qu'une page de plus.
    if (y - ROW_HEIGHT < MARGIN + 24) {
      page = pdf.addPage(A4_LANDSCAPE);
      y = A4_LANDSCAPE[1] - MARGIN;
      header();
    }

    let x = MARGIN;
    RUP_COLUMNS.forEach((column, index) => {
      const width = widths[index] as number;
      const value = cell(person, column.key);
      page.drawText(fit(value, regular, FONT_SIZE, width - 6), {
        x,
        y: y - 12,
        size: FONT_SIZE,
        font: regular,
        color: value === '—' ? faint : ink,
      });
      x += width;
    });

    y -= ROW_HEIGHT;
    page.drawLine({
      start: { x: MARGIN, y: y + 4 },
      end: { x: MARGIN + usable, y: y + 4 },
      thickness: 0.4,
      color: rule,
    });
  }

  if (data.people.length === 0) {
    page.drawText('Aucun salarié rattaché à cet établissement.', {
      x: MARGIN,
      y: y - 12,
      size: 9,
      font: regular,
      color: faint,
    });
  }

  // Mention de pied : un registre incomplet reste un registre, mais celui qui
  // le présente doit savoir ce qui lui manque avant l'inspection.
  const pages = pdf.getPages();
  pages.forEach((current, index) => {
    current.drawText(
      [
        `Page ${index + 1} sur ${pages.length}`,
        `${data.people.length} ligne${data.people.length > 1 ? 's' : ''}`,
        data.incomplete > 0
          ? `${data.incomplete} dossier${data.incomplete > 1 ? 's' : ''} incomplet${data.incomplete > 1 ? 's' : ''}`
          : 'Mentions complètes',
      ].join(' · '),
      { x: MARGIN, y: MARGIN - 12, size: 7, font: regular, color: faint },
    );
  });

  return pdf.save();
}
