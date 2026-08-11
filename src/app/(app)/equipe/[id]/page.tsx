import { notFound } from 'next/navigation';

import {
  PersonalInfoPanel,
  type ProfileFields,
  type SensitiveFields,
} from '@/app/(app)/equipe/[id]/PersonalInfoPanel';
import { EmptyState } from '@/components/ui/Card';
import { getEmployee } from '@/server/employees/queries';

export const dynamic = 'force-dynamic';

/** `null` et `undefined` deviennent la chaîne vide : un `<input>` non contrôlé
 *  affiche « null » sinon. */
const text = (value: string | null | undefined): string => value ?? '';

export default async function PersonalTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employee = await getEmployee(id);
  if (!employee) notFound();

  if (!employee.profile) {
    return (
      <EmptyState
        title="Aucun dossier personnel"
        description="Ce salarié n’a pas de dossier. Il a probablement été créé hors de l’application ; reprenez sa création depuis la liste de l’équipe."
      />
    );
  }

  const profile: ProfileFields = {
    gender: text(employee.profile.gender),
    firstName: text(employee.profile.firstName),
    birthName: text(employee.profile.birthName),
    lastName: text(employee.profile.lastName),
    birthDate: employee.profile.birthDate
      ? employee.profile.birthDate.toISOString().slice(0, 10)
      : '',
    birthPlace: text(employee.profile.birthPlace),
    birthCountry: text(employee.profile.birthCountry),
    birthDepartment: text(employee.profile.birthDepartment),
    nationality: text(employee.profile.nationality),
    maritalStatus: text(employee.profile.maritalStatus),
    dependents:
      employee.profile.dependents === null
        ? ''
        : String(employee.profile.dependents),
    personalEmail: text(employee.profile.personalEmail),
    phone: text(employee.profile.phone),
    landline: text(employee.profile.landline),
    addressLine1: text(employee.profile.addressLine1),
    addressLine2: text(employee.profile.addressLine2),
    postalCode: text(employee.profile.postalCode),
    city: text(employee.profile.city),
    country: text(employee.profile.country),
    emergencyContactName: text(employee.profile.emergencyContactName),
    emergencyContactPhone: text(employee.profile.emergencyContactPhone),
  };

  const sensitive: SensitiveFields | null = employee.profile.sensitive
    ? {
        socialSecurityNumber: text(
          employee.profile.sensitive.socialSecurityNumber,
        ),
        iban: text(employee.profile.sensitive.iban),
        bic: text(employee.profile.sensitive.bic),
      }
    : null;

  return (
    <PersonalInfoPanel
      membershipId={employee.id}
      profile={profile}
      sensitive={sensitive}
      canEdit={employee.canEdit}
    />
  );
}
