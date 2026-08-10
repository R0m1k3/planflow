import 'server-only';

import { cache } from 'react';

import type { RupPerson } from '@/domain/legal/rup';
import { peopleWithGaps } from '@/domain/legal/rup';
import { query } from '@/server/context';
import { contractLabel } from '@/server/employees/queries';

/**
 * Registre unique du personnel — lecture.
 *
 * Le registre porte **tous** ceux qui ont été employés dans l'établissement,
 * y compris les partis : c'est précisément l'historique que l'inspection vient
 * chercher. Filtrer sur les présents en ferait un trombinoscope.
 */

export interface RupData {
  locationId: string;
  locationName: string;
  siret: string | null;
  people: RupPerson[];
  /** Nombre de salariés à qui il manque au moins une mention obligatoire. */
  incomplete: number;
}

export const getRegisterData = cache(async function getRegisterData(
  locationId: string,
): Promise<RupData | null> {
  return query('members.register.export', async (db) => {
    const location = await db.location.findUnique({
      where: { id: locationId },
      select: { id: true, name: true, siret: true },
    });
    if (!location) return null;

    const contracts = await db.userContract.findMany({
      where: { locationId },
      orderBy: { startDate: 'asc' },
      include: {
        membership: {
          select: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
                nationality: true,
                birthDate: true,
              },
            },
          },
        },
      },
    });

    const jobTitleIds = [
      ...new Set(
        contracts
          .map((contract) => contract.jobTitleId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const jobTitles = await db.jobTitle.findMany({
      where: { id: { in: jobTitleIds } },
      select: { id: true, name: true },
    });
    const jobTitleNames = new Map(
      jobTitles.map((entry) => [entry.id, entry.name]),
    );

    // Une ligne par contrat, pas par personne : un salarié réembauché a deux
    // entrées et deux sorties, et les fondre effacerait l'interruption.
    const people: RupPerson[] = contracts.map((contract) => ({
      lastName: contract.membership.profile?.lastName ?? '',
      firstName: contract.membership.profile?.firstName ?? '',
      // PlanFlow ne collecte pas le sexe : la mention est exigée, la colonne
      // reste donc vide et le décompte des dossiers incomplets le signale.
      sex: null,
      nationality: contract.membership.profile?.nationality ?? null,
      birthDate: contract.membership.profile?.birthDate ?? null,
      jobTitle: contract.jobTitleId
        ? (jobTitleNames.get(contract.jobTitleId) ?? null)
        : null,
      qualification: contract.classification,
      contractLabel: contractLabel(contract.contractType),
      entryDate: contract.startDate,
      exitDate: contract.endDate,
    }));

    return {
      locationId: location.id,
      locationName: location.name,
      siret: location.siret,
      people,
      incomplete: peopleWithGaps(people),
    };
  });
});

/** Établissements pour lesquels un registre peut être tiré. */
export const listRegisterLocations = cache(
  async function listRegisterLocations(): Promise<
    Array<{ id: string; name: string; incomplete: number; total: number }>
  > {
    return query('members.register.export', async (db) => {
      const locations = await db.location.findMany({
        where: { archivedAt: null },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });

      // Le décompte des manques est calculé ici pour que l'écran puisse
      // avertir **avant** le téléchargement : découvrir un registre incomplet
      // en l'ouvrant, c'est le découvrir devant l'inspection.
      return Promise.all(
        locations.map(async (location) => {
          const contracts = await db.userContract.findMany({
            where: { locationId: location.id },
            select: {
              classification: true,
              jobTitleId: true,
              contractType: true,
              startDate: true,
              endDate: true,
              membership: {
                select: {
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                      nationality: true,
                      birthDate: true,
                    },
                  },
                },
              },
            },
          });

          const people: RupPerson[] = contracts.map((contract) => ({
            lastName: contract.membership.profile?.lastName ?? '',
            firstName: contract.membership.profile?.firstName ?? '',
            sex: null,
            nationality: contract.membership.profile?.nationality ?? null,
            birthDate: contract.membership.profile?.birthDate ?? null,
            jobTitle: contract.jobTitleId ? 'x' : null,
            qualification: contract.classification,
            contractLabel: contractLabel(contract.contractType),
            entryDate: contract.startDate,
            exitDate: contract.endDate,
          }));

          return {
            id: location.id,
            name: location.name,
            incomplete: peopleWithGaps(people),
            total: people.length,
          };
        }),
      );
    });
  },
);
