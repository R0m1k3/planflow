# PlanFlow — spécification de construction

> **Destinataire : un orchestrateur automatisé.** Ce document est la seule source d'instructions nécessaire pour construire l'application. Il est normatif : ce qui y est écrit fait foi, ce qui n'y est pas doit être demandé, jamais inventé.
>
> **Sources fonctionnelles :**
> - [`Audit Combo/`](Audit%20Combo/INDEX.md) — 58 écrans, cartographie fonctionnelle et inventaire de crawl.
> - [`Audit Combo/dropdowns/`](Audit%20Combo/dropdowns/DROPDOWN-AUDIT.md) — 172 déclencheurs, 51 menus ouverts. **Fait foi sur les énumérations** : rôles, types de contrat, vues, statuts, actions.
> - [`matrice-conformite-rh-france-2026.md`](matrice-conformite-rh-france-2026.md) — 24 exigences réglementaires cotées P0/P1/P2, avec sources officielles. **Fait foi sur la conformité** : durées de conservation, traçabilité, RGPD, habilitations. Voir §12.
>
> **Régime : clean room.** L'audit et ce plan décrivent des *capacités* et des *invariants*. Ne recopier ni code, ni CSS, ni icônes, ni illustrations, ni wording propriétaire au-delà des libellés métier nécessaires. Concevoir une API, un schéma, des textes et une interface originaux.

---

## 0. Mode d'emploi pour l'orchestrateur

1. Lire les sections 1 à 9 en entier avant d'écrire la moindre ligne. Elles définissent des invariants transverses ; les découvrir à WP-03 impose de refaire WP-00 à WP-02.
2. Exécuter les lots de travail (§10) **dans l'ordre**. Chaque lot déclare ses dépendances, ses livrables et ses **critères d'acceptation**. Un lot n'est terminé que si tous ses critères passent en test automatisé.
3. **Signaux d'arrêt.** Interrompre et demander un arbitrage humain dans ces cas :
   - une règle de convention **non couverte** par le jeu de paramètres IDCC 1517 de §6.3 est nécessaire, ou une valeur relevant d'un accord d'entreprise (taux dimanche notamment) ;
   - un code de rubrique Silae est nécessaire (§8) ;
   - une donnée personnelle réelle serait requise pour tester ;
   - une règle concernant les **salariés mineurs** est nécessaire : la matrice de conformité les exclut explicitement de son périmètre, les règles `MINOR_*` sont donc non sourcées ;
   - un point marqué **`À VALIDER`** dans ce document bloque l'avancement.
4. Ne jamais inventer de paramètre légal, de code de paie ou de règle métier. L'absence d'information est un signal d'arrêt, pas une invitation à choisir. Les valeurs de §6.3 sont fournies **avec leur origine** (ordre public, convention, accord d'entreprise) : ne pas en ajouter par déduction.
   **Les énumérations de ce document proviennent de l'audit des menus déroulants et sont exhaustives.** Ne pas y ajouter de valeur « qui semble manquer » : une valeur absente de l'audit est une valeur à faire confirmer.
5. Langue : **interface et libellés en français**, **identifiants de code en anglais**, commentaires en anglais.

---

## 1. Contexte

Le dépôt ne contient que l'audit ; il n'y a aucun code. L'objectif est de construire **PlanFlow**, une application de gestion du personnel et des plannings multi-établissements, reprenant les capacités de Combo pour l'organisation auditée, avec la paie **exportée vers Silae**.

### Ce que l'audit corrige
Huit constats structurants, qu'une lecture de la documentation publique de Combo aurait manqués ou faussés. Ils sont listés ici parce qu'ils conditionnent des choix qui coûtent cher à reprendre.

**La convention collective n'est pas HCR.** Le compte audité est **FROUARD DISTRIBUTION / La Foir'Fouille**, configuré sur **« Commerces de détail non alimentaires (IDCC 1517) — JF 50 % et Dimanche 100 % »**, code APE **4759B — commerce de détail d'autres équipements du foyer**. C'est du commerce de détail : les durées maximales, coupures et majorations propres à l'hôtellerie-restauration ne s'appliquent pas. Les paramètres réels de l'IDCC 1517 sont en §6.3.

**Le libellé de configuration mêle deux niveaux de norme.** « JF 50 % » est une règle de l'IDCC 1517. « Dimanche 100 % » n'en est pas une : la convention ne fixe aucun taux dominical, et **il n'existe pas d'accord d'entreprise**. Le taux vient du code du travail — article L3132-27, dimanches du maire — qui impose une rémunération au moins double **et** un repos compensateur équivalent. Les deux règles vivent donc dans des référentiels différents, et la seconde emporte une obligation que le libellé ne dit pas (§6.3).

**Une partie de l'encadrement relève du forfait jours.** Certains cadres y sont, ce que l'IDCC 1517 autorise pour les cadres autonomes de niveaux VII à IX. Un salarié au forfait jours ne se planifie pas en heures et sort des règles de durée hebdomadaire — mais reste soumis aux repos. Traiter tout l'effectif en heures produirait des alertes fausses sur ces contrats et masquerait le vrai contrôle, celui de la charge (§6.5).

**L'autorisation est par capacités, pas par rôles.** L'audit relève des permissions granulaires et des rôles **configurables par le client** (`/settings/roles-permissions/:roleKey`). `Role`, `Permission` et `Scope` sont trois notions distinctes dès WP-01. Aucun écran ne teste un nom de rôle.

**Les compteurs de congés sont un registre d'écritures.** L'audit identifie `Counter` / `LedgerOperation` avec ajustements protégés et prévision. Un solde stocké serait un contresens : le solde est le cumul des écritures.

**Le verrouillage d'une période de paie n'est pas terminal.** Le menu d'actions est dépendant de l'état : une période verrouillée propose « Déverrouiller », et reste supprimable. Concevoir le verrouillage comme définitif rendrait impossible le cas le plus courant — corriger une paie avant transmission — et laisserait des exports périmés circuler sans signalement (§4.6).

**Les énumérations sont fermées et connues.** Rôles, types de contrat, vues de planning, statuts et filtres sont relevés exhaustivement dans l'audit des menus. Il n'y a rien à deviner, et deviner produit des valeurs qui n'existent nulle part.

**Le temps a trois états, pas deux.** La matrice de conformité impose de distinguer **prévu**, **réalisé** et **payé**, et interdit de conditionner le paiement à la validation d'un manager. Une application qui ne stocke que prévu et réalisé ne peut pas justifier un écart entre l'heure constatée et l'heure payée — or c'est précisément ce qu'un contrôle demande.

---

## 2. Périmètre — décisions arrêtées

| Sujet | Décision |
|---|---|
| **Établissements** | **Multi-établissements** avec équipes. Un salarié peut être rattaché à plusieurs établissements. Reporting consolidé et par établissement. |
| **Paie** | **Export vers Silae** (§8). Aucun moteur de paie, aucun bulletin, aucune DSN dans PlanFlow. |
| **Pointeuse** | **Hors périmètre.** Pas de borne, pas de PWA kiosque, pas de pointage matériel. Les heures réelles sont saisies et validées par le manager (§7.3). |
| **Convention d'amorce** | **IDCC 1517**, moteur paramétrable pour en ajouter d'autres. |
| **Stack** | Next.js 15 (App Router, TypeScript strict) · PostgreSQL 16 + Prisma · Auth.js v5 · Tailwind + shadcn/ui · Zod · Vitest + Playwright · pnpm · `docker-compose` auto-hébergé. |
| **Mobile** | PWA installable, responsive. Pas d'application native. |

**Hors périmètre v1**, à ne pas construire : moteur de paie, DSN, bulletins de paie, distribution de bulletins, signature électronique qualifiée, transmission DPAE à l'URSSAF, connecteurs de caisse, abonnement et facturation, planning prédictif, auto-assignation.

**Conservés mais différés en fin de parcours** : articles et conversations internes (WP-11, optionnel). Les analyses RH sont bien dans le périmètre v1 (WP-09).

---

## 3. Architecture et invariants transverses

Ces huit invariants s'appliquent à tout le code. Ils ne sont pas négociables et chacun fait l'objet de tests dédiés.

### 3.1 Isolation multi-tenant
Hiérarchie `Account` → `Location` → `Team`. Base unique, **scoping par ligne**.
- Une extension Prisma injecte `accountId` et le périmètre de la session sur **chaque** requête.
- **RLS PostgreSQL** activée sur toutes les tables portant `accountId`, en défense en profondeur.
- Le périmètre ne provient **jamais** d'un paramètre client. Il est dérivé de la session serveur.

### 3.2 Autorisation
Point d'entrée unique `can(membership, permissionCode, resource?)` dans `src/domain/access/`.
- Vérification **à chaque mutation**, côté serveur, avant tout effet.
- L'affichage conditionnel est un confort, jamais une sécurité.
- Toute Server Action commence par un `can(...)` ; une action sans contrôle est un défaut bloquant.

### 3.3 Temps
- Chaque `Location` porte un fuseau IANA (défaut `Europe/Paris`).
- Instants stockés en `timestamptz`. Une colonne `localDate` dénormalisée sert **uniquement** au regroupement dans la grille.
- **Toute durée se calcule depuis les instants.** Un shift 22 h–06 h la nuit du changement d'heure dure 7 h ou 9 h, jamais 8 h.
- Les nuits traversantes appartiennent à la `localDate` de leur **début**.
- Tout module de date passe par `src/lib/datetime.ts`. Aucun appel direct à `new Date()` dans le domaine.

### 3.4 Concurrence
- Verrou optimiste `version` sur `WeeklySchedule`, `Shift`, `UserContract`, `PayPeriod`. Un `UPDATE` qui ne matche pas la version lève un conflit rendu à l'utilisateur.
- Recalcul des compteurs **dans la même transaction** que la mutation qui les affecte.
- Toute action de masse et tout export portent une **clé d'idempotence** ; un rejeu retourne le résultat initial sans réexécuter.

### 3.5 Immutabilité et audit
- `LedgerOperation`, `AuditLog` et `PayrollExport` sont **append-only**. Une correction est une écriture inverse suivie d'une nouvelle écriture, jamais un `UPDATE` ni un `DELETE`.
- Corollaire : la péremption d'un export (§4.6) est **dérivée**, jamais stockée — un export est périmé si la période a été déverrouillée après sa génération. Écrire un drapeau sur `PayrollExport` violerait l'append-only.
- `AuditLog` capture auteur, horodatage, entité, avant/après et justification pour : contrat, avenant, absence et décision, publication et dépublication de planning, validation d'heures, ouverture, **verrouillage et déverrouillage** de période, export, changement de rôle ou de permission, ajustement de compteur, accès à une donnée sensible.

### 3.6 Données sensibles
- NIR, IBAN, BIC et pièces jointes de santé **chiffrés au repos** (chiffrement applicatif par colonne, clé hors base).
- Fichiers servis par **URL signée à durée courte**, jamais par chemin public.
- Toute lecture d'une donnée de catégorie particulière est journalisée.

### 3.7 Télémétrie — ce qu'il ne faut pas reproduire
L'audit des menus a intercepté **2102 requêtes non sûres**, toutes de télémétrie tierce : Segment, LinkedIn Ads, Google Ads et Analytics, DoubleClick, Microsoft Clarity, Bing, Bugsnag, Hotjar, SatisMeter, Zendesk. Aucune n'était une requête métier.

C'est un anti-modèle à ne pas reprendre. Une application RH fait naviguer des managers sur des écrans dont l'URL et le contexte trahissent des informations sur des salariés identifiables ; les envoyer à des régies publicitaires est un problème de conformité, pas une préférence.

**Règles :**
- **Aucun traceur publicitaire ni analytique tiers.** Interdit par défaut.
- La télémétrie technique (erreurs, performance) passe par une **interface abstraite** et reste auto-hébergée ou désactivable.
- Toute sortie réseau vers un tiers est déclarée explicitement et soumise à consentement.
- Une **Content-Security-Policy** restrictive est livrée dès WP-00 et testée : elle constitue le garde-fou qui rend cette règle vérifiable plutôt que déclarative.

À noter également : dans le produit audité, les tableaux de bord d'analyse RH sont servis par un outil de BI tiers embarqué (ToucanToco). PlanFlow les construit **nativement** (WP-09) ; c'est une divergence assumée, qui évite une dépendance et une sortie de données.

### 3.8 États d'écran
Chaque écran implémente **chargement, vide, erreur, interdit**. Accessibilité clavier et contraste conformes WCAG 2.2 AA. Les bandeaux transverses sont dismissibles et non bloquants — l'audit relève explicitement que des surcouches masquaient des contrôles dans le produit observé ; ne pas reproduire ce défaut.

---

## 4. Modèle de données

Schéma Prisma normatif. Les noms d'agrégats reprennent ceux de l'audit ; ce n'est pas une copie de schéma propriétaire, dont l'audit ne dispose pas.

### 4.1 Tenancy et identité

```prisma
model Account {
  id                    String   @id @default(cuid())
  name                  String
  siren                 String?
  apeCode               String?                 // organisation auditée : "4759B"
  collectiveAgreementId String
  agreementOverrides    Json?                   // surcharges d'accord d'entreprise (§6.3) — ex. taux dimanche
  createdAt             DateTime @default(now())
}

model Location {
  id                        String  @id @default(cuid())
  accountId                 String
  name                      String
  siret                     String?
  addressLine1              String?
  postalCode                String?
  city                      String?
  timezone                  String  @default("Europe/Paris")
  employerContributionRate  Decimal @db.Decimal(5,2)   // cotisations patronales, %
  addPaidLeaveUplift        Boolean @default(false)     // majoration forfaitaire du coût
  productivityTarget        Decimal? @db.Decimal(10,2)
  silaeDossier              String?
  archivedAt                DateTime?
}

model Team {
  id         String @id @default(cuid())
  locationId String
  name       String
  position   Int
  archivedAt DateTime?
}

model User {
  id           String  @id @default(cuid())
  email        String  @unique
  passwordHash String?
  firstName    String
  lastName     String
  locale       String  @default("fr")
}

model Membership {
  id             String   @id @default(cuid())
  accountId      String
  userId         String?                       // null = salarié sans accès applicatif
  roleId         String
  lineManagerId  String?
  employeeNumber String                        // matricule interne, unique par compte
  silaeMatricule String?                       // requis avant export Silae
  status         MembershipStatus @default(INVITED)
  invitedAt      DateTime?
  archivedAt     DateTime?
  @@unique([accountId, employeeNumber])
}

enum MembershipStatus { INVITED ACTIVE ARCHIVED }

model MembershipScope {
  id           String  @id @default(cuid())
  membershipId String
  allLocations Boolean @default(false)
  locationId   String?
  teamId       String?
}
```

**Invariant** — un `Membership` sans `userId` est un salarié géré mais non connecté. Il doit rester plannifiable, contractualisable et exportable. Ne jamais présupposer l'existence d'un `User`.

### 4.2 Autorisation

```prisma
model Role {
  id        String  @id @default(cuid())
  accountId String
  key       String                    // stable, référencée par le code
  name      String                    // libellé modifiable par le client
  isSystem  Boolean @default(false)   // rôles fournis, non supprimables
  @@unique([accountId, key])
}

model Permission {
  id       String @id @default(cuid())
  code     String @unique             // "ressource.action.qualificatif"
  category String
}

model RolePermission { roleId String; permissionId String; @@id([roleId, permissionId]) }
```

Catalogue de permissions à semer : §5.

### 4.3 Personnel

```prisma
model EmployeeProfile {
  membershipId            String   @id
  birthDate               DateTime?
  birthPlace              String?
  nationality             String?
  addressLine1            String?
  postalCode              String?
  city                    String?
  country                 String?
  phone                   String?
  personalEmail           String?
  socialSecurityNumberEnc Bytes?    // chiffré
  ibanEnc                 Bytes?    // chiffré
  bicEnc                  Bytes?    // chiffré
  emergencyContactName    String?
  emergencyContactPhone   String?
}

model WorkPermit {
  id           String   @id @default(cuid())
  membershipId String
  permitType   String
  reference    String
  issuedAt     DateTime?
  expiresAt    DateTime
  documentId   String?
}

model UserContract {
  id             String       @id @default(cuid())
  membershipId   String
  locationId     String
  contractType   ContractType
  startDate      DateTime     @db.Date
  endDate        DateTime?    @db.Date
  trialEndDate   DateTime?    @db.Date

  // Organisation du temps de travail — le forfait jours exclut le décompte horaire (§6.5)
  workTimeArrangement WorkTimeArrangement @default(HOURLY)
  weeklyHours    Decimal      @db.Decimal(5,2)   // 35,00 par défaut ; ignoré si FORFAIT_JOURS
  forfaitDaysPerYear Decimal? @db.Decimal(5,1)   // 218 max, journée de solidarité incluse
  forfaitAgreementDocumentId String?             // convention individuelle écrite — obligatoire
  forfaitAgreedAt DateTime?                      // accord du salarié
  isModulated    Boolean      @default(false)
  hourlyRate     Decimal?     @db.Decimal(10,4)
  monthlySalary  Decimal?     @db.Decimal(10,2)
  jobTitleId     String?
  classification String?
  coefficient    String?
  status         ContractStatus @default(ACTIVE)
  endReason      String?
  version        Int          @default(0)
}

// Liste exhaustive relevée dans le filtre « Tous les types de contrats » (/members).
enum ContractType {
  APPRENTISSAGE
  CDD
  CDI
  DIRIGEANT_ASSIMILE_SALARIE
  DIRIGEANT_NON_SALARIE
  EXTRA
  INTERIM
  STAGIAIRE
  SAISONNIER
}
enum ContractStatus { DRAFT ACTIVE ENDED }
enum WorkTimeArrangement { HOURLY FORFAIT_JOURS }

// Suivi de charge des salariés au forfait jours (matrice n° 7).
model ForfaitDayEntry {
  id             String   @id @default(cuid())
  userContractId String
  localDate      DateTime @db.Date
  quantity       Decimal  @db.Decimal(2,1)   // 1,0 ou 0,5
  createdBy      String
  createdAt      DateTime @default(now())
  @@unique([userContractId, localDate])
}

model WorkloadReview {
  id             String   @id @default(cuid())
  userContractId String
  heldAt         DateTime @db.Date
  summary        String
  actions        String?
  documentId     String?
}

model Amendment {
  id             String   @id @default(cuid())
  userContractId String
  effectiveDate  DateTime @db.Date
  changes        Json     // { champ: { before, after } }
  reason         String?
  documentId     String?
  createdBy      String
  createdAt      DateTime @default(now())
}

model JobTitle { id String @id @default(cuid()); accountId String; name String; archivedAt DateTime? }
model Label    { id String @id @default(cuid()); accountId String; name String; color String; position Int; archivedAt DateTime? }
```

**Invariant contrats** — les périodes de deux contrats actifs d'un même `Membership` ne se chevauchent pas. Contrainte vérifiée en transaction, testée.

### 4.4 Planning

```prisma
model WeeklySchedule {
  id          String         @id @default(cuid())
  locationId  String
  teamId      String
  isoYear     Int
  isoWeek     Int
  status      ScheduleStatus @default(DRAFT)
  publishedAt DateTime?
  publishedBy String?
  version     Int            @default(0)
  @@unique([teamId, isoYear, isoWeek])
}

enum ScheduleStatus { DRAFT VALIDATED PUBLISHED }

model Shift {
  id                 String   @id @default(cuid())
  weeklyScheduleId   String
  membershipId       String?                     // null = shift non assigné
  localDate          DateTime @db.Date
  startAt            DateTime @db.Timestamptz
  endAt              DateTime @db.Timestamptz
  breakMinutes       Int      @default(0)
  actualStartAt      DateTime? @db.Timestamptz
  actualEndAt        DateTime? @db.Timestamptz
  actualBreakMinutes Int?
  labelId            String?
  mealCount          Int      @default(0)
  isValidated        Boolean  @default(false)
  validatedAt        DateTime?
  validatedBy        String?
  note               String?
  version            Int      @default(0)
}

model Rest {
  id               String   @id @default(cuid())
  weeklyScheduleId String
  membershipId     String
  localDate        DateTime @db.Date
  restType         RestType
  minutes          Int?
}

enum RestType { WEEKLY_REST COMPENSATORY_REST }

model DailyNote {
  id               String   @id @default(cuid())
  weeklyScheduleId String
  localDate        DateTime @db.Date
  content          String
}

model Holiday {
  id         String   @id @default(cuid())
  accountId  String
  locationId String?                 // null = tous établissements
  date       DateTime @db.Date
  name       String
  isWorked   Boolean  @default(false)
}
```

**`À VALIDER`** — l'audit décrit `Rest` comme « pause/repos, durée théorique, extension », ce qui est ambigu. Ce plan tranche : les pauses **dans** un shift sont `Shift.breakMinutes` ; `Rest` marque un repos **de journée** (hebdomadaire ou compensateur). Faire confirmer avant WP-04.

### 4.5 Absences et compteurs

```prisma
model AbsenceType {
  id                    String  @id @default(cuid())
  accountId             String
  code                  String
  name                  String
  color                 String
  isPaid                Boolean
  countsAsWorkTime      Boolean
  affectsPaidLeaveAccrual Boolean
  isSocialSecurity      Boolean @default(false)  // maladie, maternité, AT — filtre dédié au journal des absences
  silaeCode             String?              // partie <code> de AB-<code>
  requiresJustification Boolean @default(false)
  minNoticeDays         Int?
  @@unique([accountId, code])
}

model TimeOff {
  id                      String        @id @default(cuid())
  userContractId          String
  absenceTypeId           String
  startDate               DateTime      @db.Date
  startHalfDay            Boolean       @default(false)
  endDate                 DateTime      @db.Date   // dernier jour d'absence
  endHalfDay              Boolean       @default(false)
  status                  TimeOffStatus @default(PENDING)
  requestedBy             String
  requestedAt             DateTime      @default(now())
  decidedBy               String?
  decidedAt               DateTime?
  decisionComment         String?
  justificationDocumentId String?
}

enum TimeOffStatus { PENDING ACCEPTED DECLINED CANCELLED EXPIRED }

model Counter {
  id                      String      @id @default(cuid())
  userContractId          String
  counterType             CounterType
  acquisitionPeriodStart  DateTime    @db.Date
  acquisitionPeriodEnd    DateTime    @db.Date
  @@unique([userContractId, counterType, acquisitionPeriodStart])
}

enum CounterType { PAID_LEAVE RTT COMPENSATORY_REST MODULATION OVERTIME }

model LedgerOperation {
  id            String        @id @default(cuid())
  counterId     String
  kind          LedgerKind
  quantity      Decimal       @db.Decimal(10,4)   // signé
  unit          LedgerUnit
  effectiveDate DateTime      @db.Date
  sourceType    LedgerSource
  sourceId      String?
  reason        String?
  reversesId    String?       @unique            // écriture inverse
  createdBy     String
  createdAt     DateTime      @default(now())
}

enum LedgerKind   { ACCRUAL TAKEN ADJUSTMENT CARRY_OVER EXPIRY REGULARISATION }
enum LedgerUnit   { DAY HOUR }
enum LedgerSource { TIMEOFF PAY_PERIOD MANUAL SYSTEM }

model RttPolicy {
  id          String   @id @default(cuid())
  accountId   String
  name        String
  daysPerYear Decimal  @db.Decimal(5,2)
  periodStart String                        // "MM-DD"
  autoRenew   Boolean  @default(true)
  status      PolicyStatus @default(ACTIVE)
}

enum PolicyStatus { ACTIVE ARCHIVED }

model RttPolicyAssignment { id String @id @default(cuid()); rttPolicyId String; userContractId String }
```

**Invariant ledger** — aucune ligne n'est jamais modifiée ni supprimée. Une correction crée une écriture portant `reversesId`, puis la nouvelle écriture. Le solde est `SUM(quantity)`. Contrainte applicative testée, plus un trigger PostgreSQL interdisant `UPDATE`/`DELETE`.

### 4.6 Paie

```prisma
model PayPeriod {
  id          String        @id @default(cuid())
  locationId  String
  label       String
  startDate   DateTime      @db.Date
  endDate     DateTime      @db.Date
  kind        PayPeriodKind @default(MAIN)
  populations ContractType[]
  status      PayPeriodStatus @default(OPEN)
  lockedAt    DateTime?
  lockedBy    String?
  unlockedAt  DateTime?                     // dernier déverrouillage — sert à dériver la péremption des exports
  unlockedBy  String?
  version     Int           @default(0)
  @@unique([locationId, startDate, endDate, kind])
}

enum PayPeriodKind   { MAIN ALTERNATIVE }
enum PayPeriodStatus { OPEN LOCKED }

model PayPeriodSnapshot {
  id                String   @id @default(cuid())
  payPeriodId       String
  membershipId      String
  plannedMinutes    Int
  actualMinutes     Int
  absenceMinutes    Int
  overtimeByBracket Json      // [{ fromHour, toHour, rate, minutes }]
  absenceBreakdown  Json      // [{ absenceTypeId, days, minutes }]
  variables         Json      // [{ code, quantity, unit }]
  computedAt        DateTime  @default(now())
  @@unique([payPeriodId, membershipId])
}

model PayrollExport {
  id             String   @id @default(cuid())
  payPeriodId    String
  format         ExportFormat
  fileKey        String
  checksum       String
  rowCount       Int
  idempotencyKey String   @unique
  generatedBy    String
  generatedAt    DateTime @default(now())
}

enum ExportFormat { SILAE GENERIC_CSV RAW }
```

**Invariant période** — le verrouillage écrit les `PayPeriodSnapshot` et interdit toute mutation de `Shift`, `TimeOff` ou heures réelles dont la `localDate` tombe dans la période.

**Le déverrouillage existe.** L'audit montre un menu d'actions dépendant de l'état : une période ouverte propose « Verrouiller la période de paie », une période verrouillée propose « **Déverrouiller** la période de paie ». Les deux proposent « Supprimer la période de paie ».

Conséquences normatives :
- `payroll.period.unlock` rouvre la période aux mutations. L'action est journalisée avec justification obligatoire.
- Un **nouveau verrouillage recalcule intégralement** les instantanés. Ils ne sont donc pas immuables au sens strict : c'est le couple (instantané, `PayrollExport`) qui porte la preuve, et `PayrollExport` reste append-only.
- Un export déjà généré pour une période ensuite déverrouillée est **périmé**. Sans ce signalement, un fichier transmis à Silae cesse de correspondre aux données sans que rien ne l'indique. La péremption est **dérivée**, jamais stockée : `PayrollExport.generatedAt < PayPeriod.unlockedAt`. `PayrollExport` reste ainsi strictement append-only (§3.5).
- La suppression reste possible sur une période verrouillée : elle exige `payroll.period.delete`, une confirmation explicite et une entrée d'audit conservant le périmètre supprimé.
- Une correction sur période close **sans** déverrouillage passe par une régularisation sur la période ouverte suivante.

**Carte de période** — chaque période s'affiche avec son libellé, ses bornes, les compteurs **Entrées**, **Sorties** et **Extras**, la liste des populations incluses, un menu **Actions** (verrouiller/déverrouiller, supprimer) et un menu **Exports** distinct.

### 4.7 Documents, conformité, transverse

```prisma
model DocumentTemplate { id String @id @default(cuid()); accountId String; name String; bodyHtml String; availableFields Json; archivedAt DateTime? }

model Document {
  id             String   @id @default(cuid())
  accountId      String
  membershipId   String?
  category       DocumentCategory
  name           String
  fileKey        String
  mimeType       String
  sizeBytes      Int
  checksum       String
  isSensitive    Boolean  @default(false)   // santé : journalisation de lecture
  retentionUntil DateTime?
  templateId     String?
  uploadedBy     String
  uploadedAt     DateTime @default(now())
}

enum DocumentCategory { IDENTITY BANK CONTRACT AMENDMENT SICK_NOTE WORK_PERMIT REGISTER OTHER }

model CollectiveAgreement {
  id            String   @id @default(cuid())
  idcc          String
  name          String
  parameters    Json                        // §6
  version       Int
  effectiveFrom DateTime @db.Date
}

model ComplianceViolation {
  id                    String   @id @default(cuid())
  weeklyScheduleId      String
  membershipId          String?
  ruleCode              String
  severity              Severity
  localDate             DateTime? @db.Date
  message               String
  context               Json
  detectedAt            DateTime @default(now())
  acknowledgedBy        String?
  acknowledgedAt        DateTime?
  acknowledgementReason String?
}

enum Severity { INFO WARNING BLOCKING }

model AuditLog {
  id                String   @id @default(cuid())
  accountId         String
  actorMembershipId String?
  action            String
  entityType        String
  entityId          String
  before            Json?
  after             Json?
  reason            String?
  ip                String?
  userAgent         String?
  occurredAt        DateTime @default(now())
  @@index([accountId, entityType, entityId])
}

model Integration    { id String @id @default(cuid()); accountId String; provider String; credentialsEnc Bytes?; config Json; status String }
model SilaeCodeMapping { id String @id @default(cuid()); accountId String; kind SilaeCodeKind; internalRef String; silaeCode String }
enum SilaeCodeKind { HOURS ABSENCE VARIABLE }

// Verrou de conformité (§12.4) : une fonctionnalité de contrôle reste inactive
// tant que notice, remise et avis CSE ne sont pas renseignés.
model FeatureFlag {
  id              String    @id @default(cuid())
  accountId       String?
  key             String
  enabled         Boolean   @default(false)
  noticeDocumentId String?
  noticeDeliveredAt DateTime?
  cseOpinionAt    DateTime?
  activatedAt     DateTime?
}

// Durées de conservation (§12.5) — une ligne par objet, avec sa justification.
model RetentionPolicy {
  id            String   @id @default(cuid())
  accountId     String
  objectType    String                    // "Shift", "UserContract", "Document:SICK_NOTE"…
  durationMonths Int
  startPoint    String                    // "creation", "contract_end", "employee_departure"…
  justification String
  legalHold     Boolean  @default(false)
  effectiveFrom DateTime @db.Date
}
model Notification { id String @id @default(cuid()); membershipId String; notificationType String; payload Json; readAt DateTime? }
```

---

## 5. Catalogue des permissions

À semer en base à WP-01. Les codes sont **stables** : le code les référence, jamais les libellés.

**Planning** — `planning.view`, `planning.view_unpublished`, `planning.create`, `planning.create_on_published`, `planning.edit`, `planning.edit_published`, `planning.delete`, `planning.duplicate`, `planning.publish`, `planning.unpublish`, `planning.validate`, `planning.invalidate`, `planning.bulk_actions`, `planning.unassigned.view`, `planning.alerts.view`, `planning.alerts.acknowledge`, `planning.counters.view`, `planning.labels.manage`, `planning.notes.manage`, `planning.print`

**Personnel** — `members.view`, `members.create`, `members.edit`, `members.archive`, `members.delete`, `members.salary.view`, `members.contract.create`, `members.contract.edit`, `members.contract.delete_past`, `members.documents.view`, `members.documents.manage`, `members.register.export`, `members.dpae.check`

**Heures** — `hours.view`, `hours.edit_actual`, `hours.validate`

**Absences et compteurs** — `timeoff.view_own`, `timeoff.view_others`, `timeoff.request`, `timeoff.decide`, `timeoff.delete`, `timeoff.bypass_notice`, `timeoff.forecast.view`, `counters.view_own`, `counters.view_others`, `counters.adjust`

**Paie** — `payroll.access`, `payroll.period.create`, `payroll.period.update`, `payroll.period.delete`, `payroll.period.alternative`, `payroll.period.lock`, `payroll.period.unlock`, `payroll.export`, `payroll.export.silae`, `payroll.export.raw`

**Administration** — `settings.access`, `settings.locations.manage`, `settings.teams.manage`, `settings.agreement.manage`, `settings.jobtitles.manage`, `settings.templates.manage`, `settings.integrations.manage`, `settings.notifications.manage`, `settings.roles.manage`, `role_config.assign_owner_level`, `audit.view`

**Communication (WP-11)** — `articles.view`, `articles.manage`, `conversations.access`

### Rôles semés
Liste exhaustive relevée dans le filtre « Tous les rôles » (`/members`) — **cinq rôles, pas davantage** :

| Clé | Libellé |
|---|---|
| `owner` | Propriétaire |
| `admin` | Admin |
| `director` | Directeur |
| `manager` | Manager |
| `employee` | Employé |

Ces jeux de permissions sont un **point de départ modifiable par le client** ; ils ne doivent jamais être codés en dur dans les écrans. Seul `owner` détient `role_config.assign_owner_level`.

---

## 6. Moteur de règles de convention

### 6.1 Conception
`src/domain/compliance/`. Une `CollectiveAgreement` porte un `parameters: Json` **versionné**. Chaque règle est une **fonction pure** :

```ts
type Rule = (ctx: ComplianceContext) => Violation[]
```

`ComplianceContext` fournit : les shifts de la semaine évaluée **et des semaines adjacentes** (nécessaires au repos quotidien et hebdomadaire), les absences, le contrat, l'âge du salarié, le calendrier des jours fériés de l'établissement, et les paramètres de la convention.

Aucun `Date` natif : tout passe par `src/lib/datetime.ts`.

### 6.2 Codes de règles à implémenter
`MAX_DAILY_WORK` · `MAX_DAILY_AMPLITUDE` · `MIN_DAILY_REST` · `MIN_WEEKLY_REST` · `MAX_WEEKLY_WORK_ABSOLUTE` · `MAX_WEEKLY_WORK_AVERAGED` · `MAX_CONSECUTIVE_WORK_DAYS` · `MIN_BREAK_AFTER_THRESHOLD` · `PART_TIME_MIN_WEEKLY_HOURS` · `CONTRACT_HOURS_DEVIATION` · `OVERLAPPING_SHIFTS` · `SHIFT_DURING_ABSENCE` · `SUNDAY_WORK` · `SUNDAY_MAYOR_QUOTA` · `HOLIDAY_WORK` · `FORFAIT_DAYS_EXCEEDED` · `FORFAIT_WORKLOAD_REVIEW_MISSING` · `FORFAIT_REST_INSUFFICIENT` · `MINOR_MAX_DAILY_WORK` · `MINOR_MIN_DAILY_REST` · `MINOR_NIGHT_WORK`

`OVERLAPPING_SHIFTS` et `SHIFT_DURING_ABSENCE` sont de sévérité **`BLOCKING`** : ce sont des incohérences de données, pas des arbitrages. Toutes les autres sont **`WARNING`**.

### 6.3 Paramètres IDCC 1517

Jeu de paramètres d'amorce, à charger en base comme `CollectiveAgreement { idcc: "1517", version: 1 }`. Chaque valeur porte son origine : **OP** = ordre public (code du travail, s'impose quelle que soit la convention), **CCN** = disposition propre à l'IDCC 1517, **ENT** = relève d'un accord d'entreprise.

**Durées et repos**

| Paramètre | Valeur | Origine |
|---|---|---|
| Durée hebdomadaire de référence | **35 h** (151,67 h/mois ; 1 607 h/an) — confirmée par l'employeur, aucune annualisation d'entreprise | OP |
| `MAX_DAILY_WORK` | **10 h** | CCN |
| `MAX_WEEKLY_WORK_ABSOLUTE` | **48 h** | CCN |
| `MAX_WEEKLY_WORK_AVERAGED` | **44 h sur 12 semaines consécutives** | CCN |
| `MIN_DAILY_REST` | 11 h consécutives | OP |
| `MIN_WEEKLY_REST` | 35 h consécutives (24 + 11) | OP |
| `MIN_BREAK_AFTER_THRESHOLD` | 20 min après 6 h de travail | OP |
| `MAX_CONSECUTIVE_WORK_DAYS` | **10 jours** — en cas de semaines de 6 jours sur 2 semaines | CCN |

**Temps partiel**

| Paramètre | Valeur | Origine |
|---|---|---|
| `PART_TIME_MIN_WEEKLY_HOURS` | **24 h** | CCN |
| Dérogation | 21 h (aide-étalagiste, employé niveau 2) | CCN |
| Cas particuliers | 6 h (nettoyage, démonstrateurs, marchés) | CCN |
| Heures complémentaires — jusqu'à 1/10 de la durée contractuelle | **+10 %** | CCN |
| Heures complémentaires — au-delà, plafond 1/3 | **+25 %** | CCN |

**Heures supplémentaires**

| Tranche | Majoration | Origine |
|---|---|---|
| 36ᵉ à 43ᵉ heure (8 premières au-delà de 35 h) | **+25 %** | CCN |
| À partir de la 44ᵉ | **+50 %** | CCN |
| Contingent annuel | **180 h** | CCN |
| Contrepartie obligatoire en repos au-delà du contingent | 50 % si ≤ 20 salariés · **100 % si > 20 salariés** | CCN |

**Modulation** — plafond 1 600 h/an ; 44 h/semaine au plus sur des périodes de 10 semaines ; haute activité limitée à 5 semaines consécutives et 16 semaines par an. **CCN**

**Jours fériés** — c'est la règle que le libellé « JF 50 % » du paramétrage désigne.

| Paramètre | Valeur | Origine |
|---|---|---|
| 1er mai | Chômé obligatoire ; si travaillé, **+100 %** | OP |
| Autres jours fériés chômés | **3 par année civile**, choisis par l'employeur | CCN |
| `HOLIDAY_WORK` — travail un jour férié légal | Indemnité = **50 %** des heures effectuées, en sus du salaire | CCN |
| Substitution | Sur **demande du salarié**, repos compensateur = **moitié** du temps travaillé ce jour-là, à prendre sous 6 mois, non cumulable avec les congés payés sauf accord de l'employeur | CCN |

**Travail de nuit** — plage 21 h – 6 h ; non imposable aux salariés de 55 ans et plus. **CCN**

**Dimanche — le taux vient du code du travail, pas de la convention**

L'IDCC 1517 ne fixe aucun taux dominical. **Il n'existe pas d'accord d'entreprise chez Frouard Distribution.** Le « Dimanche 100 % » du paramétrage s'explique donc par l'**article L3132-27** du code du travail, qui régit les *dimanches du maire* :

| Paramètre | Valeur | Origine |
|---|---|---|
| `SUNDAY_WORK` — rémunération | **Au moins le double** de la rémunération normalement due, soit +100 % | OP (L3132-27) |
| `SUNDAY_WORK` — repos | **Repos compensateur équivalent en durée**, en plus de la majoration | OP (L3132-27) |
| `SUNDAY_MAYOR_QUOTA` | **12 dimanches maximum par année civile**, liste arrêtée avant le 31 décembre pour l'année suivante | OP (L3132-26) |

Trois conséquences pour l'implémentation :

1. La majoration **et** le repos compensateur sont dus. Ne générer que la majoration serait un manquement — le repos est un droit distinct, à écrire au ledger `COMPENSATORY_REST`.
2. Le quota de 12 dimanches est **comptable et opposable**. Chaque `Location` porte la liste des dimanches autorisés pour l'année ; planifier au-delà déclenche une violation.
3. Le refus d'un salarié de travailler le dimanche ne peut être sanctionné. Règle informative, jamais bloquante.

> **`À VALIDER` — quel régime dominical ?** L3132-27 s'applique aux dimanches du maire. Les zones touristiques, zones commerciales et ZTI relèvent de régimes distincts, dont les contreparties sont fixées par accord — inexistant ici. Confirmer sous quel régime ouvrent les magasins : c'est ce qui détermine si le taux de 100 % et le repos compensateur sont bien les bons.

Le mécanisme de surcharge `Account.agreementOverrides` reste en place pour d'éventuelles règles d'entreprise futures, mais **n'est pas utilisé aujourd'hui** : aucune règle du périmètre ne relève d'un accord d'entreprise.

#### Ce qui reste à valider — `À VALIDER`

Ces valeurs proviennent de sources secondaires publiques (Code du travail numérique, LégiSocial, ressources conventionnelles), **pas du texte primaire sur Legifrance**. Elles sont suffisantes pour construire et tester le moteur ; elles ne le sont pas pour engager une paie. Avant mise en production :

1. Recouper le jeu ci-dessus avec le **texte consolidé de l'IDCC 1517 sur Legifrance**, et dater la version chargée.
2. Obtenir l'**accord d'entreprise Frouard Distribution** : il porte le taux dimanche, et peut déroger sur la modulation, le contingent et les repos.
3. Faire confirmer par le gestionnaire de paie Silae, qui détient les usages effectivement appliqués.

L'écran de paramètres (§9) reste donc indispensable : ces valeurs sont un **point de départ chargé en base**, jamais des constantes dans le code. Un test vérifie que le moteur produit des résultats différents avec deux jeux de paramètres distincts.

### 6.4 Forfait jours

L'IDCC 1517 est l'**accord collectif habilitant** — aucun accord d'entreprise n'est nécessaire.

| Paramètre | Valeur | Origine |
|---|---|---|
| Éligibilité | Cadres autonomes, **niveaux VII, VIII et IX** | CCN |
| Plafond annuel | **218 jours** (ou 436 demi-journées), **journée de solidarité incluse** | CCN |
| Période | Année civile ou toute période de 12 mois de date à date | CCN |
| Formalisme | **Convention individuelle écrite** + accord du salarié | OP |
| Conservation du décompte | **3 ans minimum** | Matrice n° 7 |

**Règles d'implémentation :**
- Le forfait s'active **contrat par contrat** depuis la fiche salarié, via `workTimeArrangement`. C'est un attribut du contrat, pas du salarié : un changement d'organisation passe par un avenant.
- Activation **refusée** tant que `forfaitAgreementDocumentId` et `forfaitAgreedAt` ne sont pas renseignés. La convention individuelle n'est pas une formalité : sans elle le forfait est inopposable.
- Un contrat au forfait jours est **exclu** des règles horaires — `MAX_DAILY_WORK`, `MAX_WEEKLY_WORK_*`, heures supplémentaires, heures complémentaires — et de la comparaison au contrat hebdomadaire. Les appliquer produirait un bruit d'alertes qui masquerait le vrai contrôle.
- Il reste **soumis aux repos** : `MIN_DAILY_REST`, `MIN_WEEKLY_REST`, et à une surveillance d'amplitude.
- Règles propres : `FORFAIT_DAYS_EXCEEDED` (dépassement du plafond), `FORFAIT_WORKLOAD_REVIEW_MISSING` (entretien annuel non tenu), `FORFAIT_REST_INSUFFICIENT`.
- Le décompte se fait en jours et demi-journées via `ForfaitDayEntry` ; l'entretien annuel de charge est tracé par `WorkloadReview`.
- Export Silae : les jours de forfait ne sont pas des heures. Le mapping utilise un code dédié, à obtenir du dossier Silae (§8.2).

### 6.5 Exécution et restitution
- À chaque mutation de shift : revalidation **ciblée** des couples (salarié, semaine) impactés, y compris les semaines adjacentes.
- À la publication : validation complète du périmètre publié.
- Restitution **non bloquante** pour les `WARNING` : badge sur la cellule, panneau latéral listant les violations. La publication reste possible **après confirmation explicite**, qui écrit `acknowledgedBy`, `acknowledgedAt`, `acknowledgementReason` et une entrée `AuditLog`.
- Les `BLOCKING` empêchent l'enregistrement.

---

## 7. Compteurs et heures

### 7.1 Congés — registre
`LedgerOperation` est la source de vérité. Le solde est `SUM(quantity)` sur le `Counter`. La prévision projette les acquisitions restantes de la période en cours.

Écritures automatiques : acquisition à la clôture de chaque période de paie, prise à l'acceptation d'un `TimeOff`, contre-passation à l'annulation, report et expiration en fin de période d'acquisition. Ajustement manuel réservé à `counters.adjust`, **justification obligatoire**.

### 7.2 Décompte des jours d'absence
Règles normatives :
- Une absence court du premier jour **jusqu'au dernier jour d'absence inclus** — soit la veille de la reprise. Le champ `endDate` porte ce dernier jour, pas la date de retour.
- Les demi-journées sont portées par `startHalfDay` / `endHalfDay`.
- Le décompte exclut les jours non travaillés selon le calendrier de l'établissement et le rythme du contrat.
- **Un jour férié dans une période de congé n'est pas décompté** en congé payé. L'implémentation le retire du décompte ; elle n'oblige pas l'utilisateur à scinder sa demande.
- Deux absences acceptées ne peuvent pas se chevaucher pour un même contrat. Contrainte vérifiée en transaction.

### 7.3 Heures — sans pointeuse, mais trois états
Il n'y a **pas de pointage matériel**. La matrice de conformité (exigences 4 et 5) impose néanmoins de distinguer **trois** grandeurs, pas deux :

| État | Source | Champ |
|---|---|---|
| **Prévu** | Le planning publié | `startAt`, `endAt`, `breakMinutes` |
| **Réalisé** | Ce que le salarié a effectivement fait | `actualStartAt`, `actualEndAt`, `actualBreakMinutes` |
| **Payé** | Ce qui part en paie après application des règles | `PayPeriodSnapshot` |

Règles normatives :
- Heures réelles absentes → **les heures prévues font foi** comme réalisé.
- **Le paiement n'est jamais conditionné à la validation.** Une ligne non validée par un manager part quand même en paie sur la base du réalisé. Bloquer le paiement d'heures accomplies faute de validation est précisément ce que la matrice interdit.
- Un workflow d'autorisation d'heures supplémentaires **ne supprime jamais** des heures accomplies. Il les qualifie — autorisées ou non — et la qualification est tracée.
- Toute correction conserve **valeur avant, valeur après, motif, auteur et date**.
- **Pas d'arrondi défavorable systématique.** La règle d'arrondi est un paramètre explicite du registre §12.7, pas une constante enfouie.
- L'écran `/reports/heures` liste par salarié : prévu, réalisé, écart, payé, statut ; sélection multiple et validation groupée.

### 7.4 Bandeau de compteurs de la grille
Chaque ligne salarié affiche cinq valeurs : **heures contractuelles · planifié · absences · écart · repos compensateur**.

**Une seule implémentation** dans `src/domain/counters/` alimente la grille, le rapport d'heures et l'export de paie. Trois calculs divergents seraient un défaut majeur — c'est la première cause d'écart entre un planning et un bulletin.

### 7.5 Coût du planning
Coût prévisionnel = somme des heures × taux horaire du contrat × (1 + `employerContributionRate`), plus la majoration forfaitaire si `addPaidLeaveUplift`. Comparé à l'objectif de productivité de l'établissement. Visible sous `planning.counters.view`.

---

## 8. Export Silae

Seule intégration de paie du périmètre v1. `src/domain/payroll/adapters/silae.ts`, derrière une interface `PayrollExportAdapter` qui laisse la place à d'autres formats.

### 8.1 Format
- **CSV, UTF-8, séparateur `;`**
- En-tête : `matricule;code paie;décompte;date début;date fin;`
- Une ligne par couple (salarié, code de paie) sur la période.

### 8.2 Codes
Trois familles, préfixées :
| Famille | Préfixe | Source du code |
|---|---|---|
| Heures | `HS-` | `SilaeCodeMapping` kind `HOURS` |
| Absences | `AB-` | `AbsenceType.silaeCode` |
| Éléments variables | `EV-` | `SilaeCodeMapping` kind `VARIABLE` |

> **Signal d'arrêt.** Les codes réels appartiennent au dossier Silae du client et se lisent dans « Saisie des éléments variables ». **Ne pas les inventer.** Livrer l'écran de correspondance (`/settings/integrations/silae`) et une table vide ; demander les codes avant la première mise en production.

### 8.3 Règles d'export
- **Pré-contrôle bloquant** : tout salarié inclus doit avoir un `silaeMatricule` et tout élément exporté un code mappé. À défaut, l'export échoue en listant précisément les manques — il ne produit jamais un fichier partiel silencieux.
- L'export ne porte que sur une `PayPeriod` **verrouillée**, et lit exclusivement les `PayPeriodSnapshot`.
- **Idempotence** : un réexport de la même période produit le même fichier et le même `checksum`. L'import Silae écrase les données de la même période pour les mêmes salariés ; l'export doit donc être rejouable sans effet de bord.
- Chaque génération écrit un `PayrollExport` et une entrée d'audit.

---

## 9. Routes et écrans

Structure de navigation cible. Les routes sont propres à PlanFlow ; l'audit sert d'inventaire de capacités, pas de plan d'URL à copier.

| Zone | Routes |
|---|---|
| **Auth** | `/connexion`, `/mot-de-passe/oubli`, `/mot-de-passe/reinitialisation`, `/invitation/:token` |
| **Accueil** | `/` — suivi hebdomadaire, raccourcis, alertes |
| **Planning** | `/planning/semaine`, `/planning/jour`, `/planning/etiquettes`, `/planning/mois`, `/planning/presences`, `/planning/impression` |
| **Équipe** | `/equipe`, `/equipe/:id/profil`, `/contrats`, `/documents`, `/absences`, `/temps`, `/acces`, `/compteurs/:counterId` |
| **Absences** | `/absences/a-traiter`, `/calendrier`, `/traitees`, `/expirees` |
| **Rapports** | `/rapports/paies`, `/rapports/historique`, `/rapports/heures`, `/rapports/activite` |
| **RH** | `/rh` (aperçu), `/rh/entrees`, `/sorties`, `/fins-essai`, `/profils-incomplets`, `/compteurs-conges`, `/journal-absences`, `/titres-sejour`, `/modifications-contrat`, `/rh/analyses/{effectifs,heures,absences}` |
| **Réglages** | `/reglages/compte`, `/etablissements`, `/equipes`, `/convention`, `/emplois`, `/etiquettes`, `/types-absence`, `/politiques-rtt`, `/modeles-documents`, `/roles`, `/roles/:roleKey`, `/integrations/silae`, `/preferences`, `/impression`, `/productivite`, `/rgpd` |

**Écrans du produit audité volontairement absents** : pointeuse et ses réglages, bulletins de paie et distribution, signature électronique, abonnement et facturation, marketplace et connecteurs de caisse, ADP.

### Filtres et énumérations d'écran
Relevés à l'audit des menus, exhaustifs. À implémenter tels quels.

| Écran | Filtre | Valeurs |
|---|---|---|
| Équipe | Rôle | Tous · Propriétaire · Admin · Directeur · Manager · Employé |
| Équipe | Type de contrat | Tous · les 9 valeurs de `ContractType` |
| Établissements | État | Établissements actifs · Établissements archivés |
| Profils incomplets | Complétude | Informations RUP et DPAE manquantes · RUP manquantes · DPAE manquantes |
| Journal des absences | Nature | Toutes les absences · Uniquement les absences Sécurité sociale |
| Politiques RTT | Actions de ligne | Assigner des employés · Archiver |
| Période de paie | Actions | Verrouiller **ou** Déverrouiller selon l'état · Supprimer |

**Conséquence sur le modèle** — le filtre « profils incomplets » impose de distinguer, champ par champ, ce qui est **requis pour le registre du personnel (RUP)** de ce qui est **requis pour la DPAE**. Deux jeux de champs obligatoires distincts, tous deux calculables sur un dossier. À porter dans `src/domain/compliance/completeness.ts`.

**Modèles de documents** — les variables disponibles sont **scopées par établissement** (« Variables par établissement »). Un modèle rendu pour un salarié résout ses variables dans le contexte de l'établissement de son contrat.

**Statuts de signature** *(hors périmètre v1, à respecter si le module est construit plus tard)* : Échoué · En attente · En cours d'envoi · Expiré · Signé.

### Vues de planning
Le sélecteur de vue expose **cinq** entrées, liste exhaustive relevée à l'audit :

| Vue | Contenu |
|---|---|
| **Vue par employés** | Grille semaine, lignes = salariés. Vue par défaut. |
| **Vue par jour** | Chronologie horaire d'une journée, groupée par équipe, avec courbe d'effectif. |
| **Vue par étiquettes** | Grille semaine, lignes = étiquettes/postes plutôt que salariés. |
| **Vue par mois** | Vue mensuelle condensée. |
| **Vue des présences et absences** | Vue centrée sur qui est présent et qui est absent. |

Les cinq vues lisent le **même modèle** et partagent règles de validation et état de publication. Ne pas dupliquer la logique par vue — c'est la première source de divergence entre écrans.

### Grille de planning — comportement normatif
Reproduire ces comportements observés à l'écran, avec une interface originale :
- Colonnes lundi→dimanche, numéro de semaine, jour courant distingué.
- **Regroupement par équipe**, chaque équipe portant son propre état de publication et son action publier/dépublier. La publication est **par équipe**, pas par établissement.
- Chaque équipe expose une ligne **« Notes et événements »** et une ligne **« Shifts non assignés »**.
- Shift : bloc coloré par étiquette, libellé, plage horaire, durée de pause, badge d'écart, marque de validation.
- Absences : barres continues sur plusieurs jours, portant le libellé du type et la durée en jours.
- Bandeau de cinq compteurs par ligne salarié (§7.4).
- Navigation de semaine, filtres, sélection des vues, actions de masse.

**Performance** — Server Component pour le chargement, **îlot client** pour l'interaction, mises à jour optimistes, lignes virtualisées au-delà de 50 lignes. Cible : rendu initial d'une semaine de 80 salariés sous 1,5 s, interaction de glisser-déposer sous 100 ms.

---

## 10. Lots de travail

Ordre imposé. Chaque lot est livrable, testé et mergeable seul.

### WP-00 — Socle
**Dépend de :** rien
**Livre :** `docker-compose.yml` (app + Postgres 16), projet Next.js 15 TypeScript strict, Prisma, Tailwind + shadcn/ui, Vitest, Playwright, CI GitHub Actions (lint, typecheck, test, build), **Content-Security-Policy restrictive** (§3.7), sauvegardes chiffrées et restauration testée, SBOM, registre des sous-traitants (matrice n° 16 et 17), `.env.example`, `README.md`.
**Critères d'acceptation**
- `docker compose up` démarre l'application et la base, migrations appliquées.
- CI verte sur un dépôt propre.
- `pnpm typecheck` sans erreur en mode strict.
- Un test vérifie que la CSP interdit toute origine tierce et qu'aucune dépendance de traçage n'est installée.

### WP-01 — Tenancy, identité, autorisation
**Dépend de :** WP-00
**Livre :** modèles §4.1 et §4.2 ; extension Prisma de scoping ; RLS PostgreSQL ; Auth.js (mot de passe + invitation par e-mail) ; `can()` ; catalogue de permissions §5 semé ; rôles semés ; `AuditLog` ; chiffrement de colonnes ; stockage de fichiers à URL signée ; **MFA administrateurs et RH**, revue d'accès et accès « break glass » tracé (matrice n° 15) ; **table `RetentionPolicy` et jobs de purge** (§12.5) ; dictionnaire donnée → finalité → base → destinataire → durée (n° 14) ; runbook de violation et alerte sur export massif (n° 23).
**Critères d'acceptation**
- Un membership scopé sur l'établissement A ne peut **lire ni écrire** une donnée de l'établissement B — testé au niveau requête, pas seulement UI.
- Une Server Action appelée sans la permission requise échoue **avant** tout effet de bord.
- Désactiver le scoping applicatif laisse la RLS bloquer l'accès (test d'intégration dédié).
- Toute mutation produit une entrée `AuditLog` avec avant/après.
- Un rôle personnalisé créé par un client modifie effectivement l'accès, sans changement de code.

### WP-02 — Organisation et référentiels
**Dépend de :** WP-01
**Livre :** établissements, équipes, jours fériés, emplois, étiquettes, types d'absence, convention collective et écran de paramètres ; réglages compte, préférences, productivité, taux de cotisations ; **registre de paramétrage juridique** (§12.7) ; **verrou d'activation notice + CSE** (§12.4).
**Critères d'acceptation**
- Création d'un compte à deux établissements et plusieurs équipes de bout en bout.
- Fuseau par établissement effectif sur l'affichage et les calculs.
- Les paramètres de convention sont éditables et versionnés.

### WP-03 — Personnel et contrats
**Dépend de :** WP-02
**Livre :** `Membership`, `EmployeeProfile`, `UserContract`, `Amendment`, `WorkPermit` ; annuaire filtrable et trié ; dossier salarié ; invitation ; salarié sans compte ; export du registre unique du personnel ; **bascule forfait jours dans la fiche salarié** (§6.4) avec `ForfaitDayEntry` et `WorkloadReview`.
**Critères d'acceptation**
- Un salarié **sans `userId`** est créable, plannifiable et contractualisable.
- Deux contrats actifs chevauchants sont refusés.
- Un avenant conserve l'historique et n'écrase pas le contrat.
- `members.salary.view` absente masque la rémunération **et** la refuse côté API.
- Le passage au forfait jours est **refusé** sans convention individuelle jointe et date d'accord du salarié.
- Un contrat au forfait jours n'est plus planifiable en heures et n'apparaît pas dans les compteurs horaires.
- L'export du registre contient les mentions légales attendues.

### WP-04 — Planning
**Dépend de :** WP-03
**Livre :** `WeeklySchedule`, `Shift`, `Rest`, `DailyNote`, `Label` ; **les cinq vues** (employés, jour, étiquettes, mois, présences et absences) ; création, déplacement, redimensionnement, duplication, actions de masse ; shifts non assignés ; brouillon → validé → publié **par équipe** ; notifications de publication ; impression PDF.
**Critères d'acceptation**
- Grille conforme à §9, y compris lignes notes et non-assignés.
- Les cinq vues lisent le même modèle : une modification faite dans une vue est immédiatement correcte dans les quatre autres — test croisé obligatoire.
- La publication est par équipe et notifie les salariés concernés.
- `planning.view_unpublished` absente masque les semaines non publiées côté serveur.
- Deux sessions modifiant la même semaine → conflit détecté, aucune perte silencieuse.
- Un shift 22 h–06 h la nuit du changement d'heure est compté 7 h ou 9 h selon le sens.
- Semaine de 80 salariés sous les cibles de §9.

### WP-05 — Moteur de règles
**Dépend de :** WP-04
**Livre :** moteur §6 **effectif-daté** (§12.2), les 17 règles, `ComplianceViolation`, revalidation ciblée, panneau d'alertes, confirmation tracée à la publication, écran de paramètres, **jeu IDCC 1517 de §6.3 semé en base** avec l'origine de chaque valeur (OP / CCN / ENT) et sa source datée.
**Critères d'acceptation**
- Chaque règle a un test aux bornes : la valeur limite exacte passe, un cran au-delà déclenche.
- Modifier un shift revalide la semaine **et ses voisines**.
- Publier malgré un `WARNING` exige une confirmation et écrit l'acquittement et l'audit.
- Un `BLOCKING` empêche l'enregistrement.
- Aucune valeur de convention n'est codée en dur — vérifié par un test qui charge deux jeux de paramètres différents.
- Les tranches d'heures supplémentaires IDCC 1517 sont exactes aux bornes : 43 h donne 8 h à +25 %, 45 h donne 8 h à +25 % et 2 h à +50 %.
- Un jour férié travaillé produit l'indemnité de 50 % ; la substitution en repos n'est proposée que **sur demande du salarié**.
- Le dimanche produit **à la fois** la majoration de 100 % et le repos compensateur équivalent ; l'un sans l'autre est un échec.
- Planifier un 13ᵉ dimanche du maire dans l'année déclenche `SUNDAY_MAYOR_QUOTA`.
- Un contrat au forfait jours ne déclenche **aucune** règle horaire, mais déclenche bien les règles de repos et de charge.

### WP-06 — Absences et compteurs
**Dépend de :** WP-05
**Livre :** `TimeOff`, `AbsenceType`, `Counter`, `LedgerOperation`, `RttPolicy` ; demande, file à traiter, décision, calendrier, traitées, expirées ; affichage sur la grille ; soldes et prévision ; ajustement manuel ; trigger d'immutabilité du ledger ; **acquisition et report de congés payés** (§12.3) ; **notification d'information au retour d'arrêt**, horodatée avec preuve de remise ; vue manager sans motif médical (n° 9).
**Critères d'acceptation**
- `endDate` porte le dernier jour d'absence ; un test couvre explicitement la confusion avec la date de reprise.
- Un jour férié dans un congé n'est pas décompté, **sans** scission manuelle.
- Deux absences acceptées chevauchantes sont refusées.
- Accepter écrit au ledger ; annuler contre-passe ; le solde reste juste après un aller-retour.
- `UPDATE` et `DELETE` sur `LedgerOperation` sont rejetés par la base.
- Un ajustement manuel sans justification est refusé.
- Une politique RTT se reconduit automatiquement ; archivée, elle cesse de le faire.

### WP-07 — Heures et périodes de paie
**Dépend de :** WP-06
**Livre :** heures réelles et validation (§7.3) ; `PayPeriod`, populations, période alternative, verrouillage ; `PayPeriodSnapshot` ; rapport d'heures ; journal d'activité.
**Critères d'acceptation**
- Sans heures réelles, le prévu fait foi partout.
- Le verrouillage fige les instantanés et **refuse** toute mutation dans la période.
- Le déverrouillage rouvre les mutations, exige une justification et journalise l'action.
- Un nouveau verrouillage recalcule les instantanés ; tout export antérieur est marqué **périmé**.
- Une correction après verrouillage, sans déverrouiller, produit une régularisation sur la période suivante, sans réécrire le passé.
- Grille, rapport d'heures et instantané donnent des chiffres **identiques** sur un même jeu de données — test croisé obligatoire.

### WP-08 — Export Silae
**Dépend de :** WP-07
**Livre :** adaptateur §8, écran de correspondance des codes, `silaeMatricule` sur le membership, export générique CSV, historique des exports.
**Critères d'acceptation**
- Fichier conforme : UTF-8, `;`, en-tête exact, préfixes `HS-`/`AB-`/`EV-`.
- Un matricule ou un code manquant fait **échouer** l'export avec la liste des manques ; aucun fichier partiel.
- Réexport de la même période → `checksum` identique.
- Export refusé sur une période non verrouillée.
- Déverrouiller une période marque ses exports antérieurs comme périmés, et l'historique le montre.

### WP-09 — Tableau de bord RH
**Dépend de :** WP-08
**Livre :** aperçu et indicateurs ; entrées, sorties, fins de période d'essai, profils incomplets, compteurs de congés, journal des absences, titres de séjour, modifications de contrat ; analyses effectifs, heures, absences.
**Critères d'acceptation**
- Chaque indicateur est **explicable** : un clic mène aux lignes sources.
- Les échéances de titres de séjour et de périodes d'essai remontent dans les fenêtres attendues.
- Les agrégats respectent le périmètre du membership.

### WP-10 — Documents
**Dépend de :** WP-09
**Livre :** GED par salarié, modèles de documents et génération, catégories, rétention, journalisation des lectures sensibles, brouillon DPAE.
**Critères d'acceptation**
- Les fichiers ne sont accessibles que par URL signée expirante.
- La lecture d'un document de santé est journalisée.
- Un modèle génère un document avec les champs du dossier.
- La DPAE est **générée**, jamais transmise (§12).

### WP-11 — Communication *(optionnel)*
**Dépend de :** WP-10
**Livre :** articles et conversations internes.

### Transverse — RGPD
À traiter **dans chaque lot**, pas en fin de projet : minimisation, chiffrement, journalisation des accès, rétention, export et suppression sur demande.

---

## 11. Stratégie de test

**Vitest — domaine pur, en tables**
- Chaque règle de convention, aux bornes.
- Ledger : acquisition, prise, ajustement, contre-passation, report, expiration, régularisation rétroactive.
- Heures : tranches d'heures supplémentaires, **changement d'heure**, **nuit traversante**, absence de valeurs réelles.
- Décompte d'absence : dernier jour vs reprise, demi-journées, jour férié inclus, chevauchement.
- Autorisation : chaque permission absente doit refuser la **mutation**.

**Tests d'intégration — base réelle**
- Scoping multi-tenant au niveau requête.
- RLS active indépendamment du code applicatif.
- Immutabilité du ledger **et de `PayrollExport`** imposée par la base.
- Conflits de version sur écriture concurrente.
- Refus de mutation sur une période verrouillée ; acceptation après déverrouillage.
- Absence de dépendance de traçage tierce et CSP effective (§3.7).

**Playwright — parcours traversants**
1. Construire une semaine, déclencher une alerte, publier après confirmation → acquittement et audit écrits, salarié notifié.
2. Demander un congé → accepter → barre visible sur la grille, ledger écrit, solde et prévision à jour → annuler → contre-passation, solde restauré.
3. Saisir un écart d'heures → valider → période de paie → verrouiller → export Silae → réexport identique.
4. **Cycle de déverrouillage** : verrouiller → exporter → déverrouiller → corriger un shift → reverrouiller → l'export initial apparaît **périmé**, le nouvel export diffère du premier.
5. Deux sessions sur la même semaine → conflit rendu, pas de perte.
6. Un manager de l'établissement A tente d'atteindre une ressource de B → refus serveur.
7. Passer d'une vue de planning à l'autre après modification → les cinq vues concordent.

**Jeux de tests imposés par la matrice de conformité**
Repris de sa section « Jeux de tests d'acceptation indispensables ». Ceux hors périmètre PlanFlow (DSN, forfait jours, astreintes) sont écartés tant que §12.6 n'a pas tranché.

- planning produisant moins de 11 h de repos, plus de 10 h/jour, plus de 48 h/semaine, ou une moyenne supérieure à 44 h sur 12 semaines ;
- pause manquante après 6 h ;
- correction rétroactive d'un pointage **après clôture**, avec piste avant-après ;
- heures supplémentaires à cheval sur deux mois mais dans la même semaine civile ;
- temps partiel et heures complémentaires ;
- forfait jours dépassant le plafond, repos insuffisant, entretien annuel manquant ;
- 13ᵉ dimanche du maire planifié dans l'année civile ;
- congés acquis pendant un arrêt maladie, information au retour, report de 15 mois ;
- départ d'un salarié : RUP, purge progressive, export, conservation des pièces dues ;
- restauration d'une sauvegarde ancienne **suivie de l'application des suppressions échues** ;
- manager tentant d'accéder au motif médical, au salaire, au RIB ou à un autre établissement ;
- **changement de règle à date d'effet** : reproduction exacte d'une paie antérieure, et nouveau calcul après la date.

**Jeu de données de départ** — un compte, **deux établissements**, plusieurs équipes, une trentaine de salariés mêlant CDI, CDD, temps partiels, un apprenti et **un mineur** (règles dédiées), dont au moins un salarié sans compte utilisateur et un rattaché à deux établissements ; quatre semaines publiées, des absences longues chevauchant des semaines, un jour férié en milieu de congé, des écarts d'heures, une semaine incluant un changement d'heure. **Données entièrement fictives.**

---

## 12. Conformité

Cette section applique [`matrice-conformite-rh-france-2026.md`](matrice-conformite-rh-france-2026.md) au périmètre PlanFlow. La matrice fait foi ; ce qui suit indique **comment** chaque exigence se traduit en produit, et lesquelles sortent du périmètre.

> **Portée de la matrice.** Elle couvre l'employeur privé français et les **salariés majeurs**. Les mineurs en sont explicitement exclus. Les règles `MINOR_*` de §6.2 doivent donc être sourcées séparément avant d'être activées — signal d'arrêt.

### 12.1 Exigences P0 portées par PlanFlow

| # matrice | Exigence | Traduction produit | Lot |
|---|---|---|---|
| 1 | Règle applicable versionnée et datée | `CollectiveAgreement` effectif-daté, §12.2 | WP-05 |
| 2 | Durée légale et maxima | Règles §6.2 ; dérogation avec motif et habilitation, jamais silencieuse | WP-05 |
| 3 | Repos et pauses | `MIN_DAILY_REST`, `MIN_WEEKLY_REST`, `MIN_BREAK_AFTER_THRESHOLD` ; **l'acquittement n'efface pas l'anomalie**, il la trace | WP-05 |
| 4 | Décompte fiable du temps | Prévu / réalisé / payé (§7.3), corrections avant-après tracées, pas d'arrondi défavorable systématique | WP-07 |
| 5 | Heures supplémentaires et complémentaires | Tranches §6.3 ; **le workflow d'autorisation ne supprime jamais des heures accomplies** | WP-07 |
| 8 | Congés payés | Acquisition, report 15 mois, information au retour d'arrêt (§12.3) | WP-06 |
| 9 | Absences et données de santé | Écran manager « autorisé / indisponible » **sans motif médical** ; coffre séparé pour les justificatifs | WP-06 |
| 13 | Registre unique du personnel | Export par établissement, ordre d'embauche, mentions spécifiques, corrections tracées | WP-03 |
| 14 | Finalités, bases légales, minimisation | Dictionnaire donnée → finalité → base → destinataire → durée, livré comme artefact | WP-01 |
| 15 | Habilitations et confidentialité | RBAC §3.2 + **MFA administrateurs et RH**, revue d'accès périodique, déprovisionnement immédiat, masquage salaires/NIR/RIB/santé, accès support « break glass » tracé | WP-01 |
| 16 | Sécurité de l'auto-hébergement | TLS, sauvegardes chiffrées, gestion des secrets, sauvegardes 3-2-1, restauration testée, SBOM, environnement de test pseudonymisé | WP-00 |
| 17 | Sous-traitants et transferts | Registre fournisseurs, **blocage des télémétries inutiles** (§3.7), réversibilité testée | WP-00 |
| 19 | Information préalable et CSE | **Verrou produit** : toute fonctionnalité de contrôle reste désactivée tant que notice, date de remise et avis CSE ne sont pas renseignés (§12.4) | WP-02 |
| 21 | Politique de conservation | Table §12.5, base active / archive séparées, purges testées | WP-01 |
| 22 | Intégrité, clôture, correction | Clôture de période, écritures correctives non destructives, **rejeu déterministe**, séparation saisie/validation | WP-07 |
| 23 | Violation de données et continuité | Runbook incident, registre de violations, **alerte sur export massif**, notification CNIL sous 72 h, PRA | WP-01 |
| 24 | Portabilité et sortie | Exports PDF/CSV filtrés, paquet de départ salarié, manifeste et empreinte | WP-09 |

### 12.2 Moteur effectif-daté — exigence n° 1 et n° 22

La matrice impose de pouvoir **reproduire à l'identique une paie antérieure** après un changement de règle. C'est plus fort qu'un simple versionnement :

- `CollectiveAgreement` porte `effectiveFrom` ; les versions coexistent et ne se remplacent pas.
- Tout calcul mémorise la **version de règle appliquée**, jointe au `PayPeriodSnapshot`.
- **Aucune modification rétroactive silencieuse** : changer un paramètre crée une nouvelle version datée, jamais une mise à jour en place.
- Chaque version conserve source (URL ou PDF), date d'effet, auteur, approbateur et diff.

Test d'acceptation : charger une règle v1, calculer une période, publier la v2 à une date d'effet postérieure, recalculer — la période antérieure doit produire **exactement** le résultat d'origine.

### 12.3 Congés payés — exigence n° 8

Paramètres d'ordre public à charger :

| Paramètre | Valeur |
|---|---|
| Acquisition | **2,5 jours ouvrables par mois** de travail effectif |
| Acquisition pendant maladie non professionnelle | **2 jours ouvrables par mois**, plafond **24 jours par an** |
| Report après arrêt de travail | **15 mois** lorsque applicable |
| Information au retour d'arrêt | Le salarié doit être informé de ses droits et de la date limite de prise **dans le mois** suivant sa reprise |

L'information au retour est une **obligation active**, pas un affichage : PlanFlow génère la notification, l'horodate et conserve la preuve de remise. Prévoir aussi le paramétrage ouvrables/ouvrés, le fractionnement et l'ancienneté — ces derniers relèvent de l'accord d'entreprise, donc `À VALIDER`.

### 12.4 Verrou d'activation — exigence n° 19

Aucune donnée ne peut être collectée par un dispositif qui n'a pas été porté à la connaissance du salarié. Traduction produit : un **feature flag de conformité** qui refuse l'activation tant que ne sont pas renseignés la notice d'information, sa date de remise, l'avis ou la consultation du CSE et la date d'activation. Le verrou est vérifié côté serveur, pas seulement à l'écran.

Ce verrou s'applique à toute fonctionnalité de contrôle ajoutée ultérieurement — pointeuse, géolocalisation, biométrie, planning algorithmique. Il justifie aussi l'exclusion du **planning prédictif** du périmètre v1 : la matrice exige une AIPD préalable pour tout scoring ou optimisation algorithmique.

### 12.5 Durées de conservation — exigence n° 21

La matrice est explicite : les minima légaux ne sont ni universels ni une autorisation de tout garder. **Ne pas appliquer « 5 ans partout ».** Une table `RetentionPolicy` porte, par objet, la durée, son point de départ et sa justification.

| Objet | Durée | Portée PlanFlow |
|---|---|---|
| Décompte des horaires et astreintes | **1 an minimum** | Oui — `Shift`, heures réelles |
| Décompte des jours de forfait | **3 ans minimum** | Oui — `ForfaitDayEntry` |
| Jours des forfaits jours | **3 ans** | Conditionnel (§12.6) |
| Contrats, salaires, primes, indemnités | **5 ans** | Oui — `UserContract`, `Amendment` |
| Registre unique du personnel | **5 ans après le départ** | Oui |
| Éléments d'assiette et données DSN | **6 ans** | Oui — les variables exportées vers Silae alimentent l'assiette |
| Bulletins de paie | 5 ans ; disponibilité 50 ans ou jusqu'aux 75 ans du salarié | **Non** — PlanFlow ne détient aucun bulletin |
| Géolocalisation | 2 mois, 1 an ou 5 ans **selon la finalité** | Sans objet — non collectée |

Base active et archive intermédiaire sont **séparées**. Les purges sont automatiques, testées, et un *legal hold* nominatif peut les suspendre. Les sauvegardes suivent le même calendrier : soit l'expiration s'y propage, soit une restauration est suivie d'une purge.

> **Arbitrage à rendre — `À VALIDER`.** Le décompte horaire brut a un minimum d'un an, alors que les éléments justifiant la paie se conservent plus longtemps. La matrice demande de trancher explicitement plutôt que d'aligner tout sur la durée la plus longue. Décision attendue avant WP-07.

### 12.6 Hors périmètre v1, mais couverts par la matrice

| Sujet | Décision |
|---|---|
| **Bulletins et bulletin électronique** (n° 10, 11) | Hors périmètre — Silae les produit et les conserve. PlanFlow n'hérite d'aucune obligation de disponibilité longue. |
| **DSN, événements, PAS** (n° 12) | Hors périmètre. PlanFlow **alimente** l'assiette : ses variables exportées relèvent donc de la conservation à 6 ans. |
| **Astreintes** (n° 6, P1) | Non modélisées. `À VALIDER` : y a-t-il des astreintes en magasin ? Si oui, entité dédiée, délai de prévenance de 15 jours et requalification des interventions en travail effectif. |
| **Forfait jours** (n° 7, P1) | **Au périmètre** — §6.4. Certains cadres y sont ; l'IDCC 1517 est l'accord habilitant. Décompte conservé 3 ans. |
| **Géolocalisation** (n° 20, P2) | Non collectée. Ne pas l'introduire sans AIPD. |
| **AIPD** (n° 18) | Requise avant biométrie, géolocalisation, scoring ou planning algorithmique. Aucun de ces éléments n'est au périmètre v1. |

### 12.7 Registre de paramétrage — livrable

La matrice impose un **paramétrage juridique signé avant migration**, couvrant huit domaines : identité juridique, populations, temps, rémunération, absences, paie/DSN, vie privée, sécurité. Chaque réponse porte **valeur, source, date d'effet, population, approbateur, date de validation et pièce jointe**.

Ce registre est un **livrable de WP-02**, pas une note : un écran d'administration le tient à jour et il s'exporte. Sans lui, aucune valeur de §6.3 n'est opposable.

### 12.8 Autres risques

- **Paramètres de convention** — le jeu IDCC 1517 de §6.3 vient de sources secondaires. Recoupement Legifrance daté, accord d'entreprise et confirmation du gestionnaire Silae avant d'engager une paie. Le taux dimanche n'est **pas** conventionnel.
- **Absence d'accord d'entreprise** — confirmée par l'employeur. Aucune règle du périmètre ne repose donc sur une norme d'entreprise : tout vient de l'ordre public ou de l'IDCC 1517. Conséquence directe — pas de dérogation à 12 h/jour, pas de moyenne portée à 46 h, pas d'annualisation propre. Le mécanisme de surcharge existe mais reste vide.
- **Codes de paie Silae** — signal d'arrêt §8.2.
- **DPAE** — générée seulement ; la transmission URSSAF exige un raccordement déclaratif, hors périmètre.
- **Signature électronique** — exige un prestataire qualifié. Ne pas implémenter de substitut maison, qui n'aurait aucune valeur probante.
- **Traceurs tiers** — §3.7. Interdits par défaut, CSP livrée et testée dès WP-00. C'est la divergence la plus délibérée avec le produit audité, et elle rejoint l'exigence n° 17.

---

## 13. Règles clean room

- Ce document et l'audit sont une **liste de capacités et d'invariants**, pas un modèle de code ou de présentation.
- API, schéma, textes et interface **originaux**.
- Ne pas reprendre noms de classes, CSS, icônes, illustrations, ni wording propriétaire au-delà des libellés métier nécessaires.
- Traçabilité : exigence observée → spécification interne → test d'acceptation.
- Ne pas supposer les règles cachées ; les faire valider avant de les coder.
