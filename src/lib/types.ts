export const ENTITY_IDS = {
  USERS: "USERS",
  ROLES: "ROLES",
  USERS_PRIVILEGES: "USERS_PRIVILEGES",
  AUDIT_EVENTS: "AUDIT_EVENTS",
  SETTINGS: "SETTINGS",
  TAGS: "TAGS",
} as const;

export type EntityId = (typeof ENTITY_IDS)[keyof typeof ENTITY_IDS];
export type RouteId = EntityId;

export const PERMISSION_ACTIONS = ["create", "read", "update", "delete"] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export type PermissionRequirement = {
  entity: EntityId;
  action: PermissionAction;
};

export type Permission = {
  entity: EntityId;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
};

export type Role = {
  id: string;
  name: string;
  active: boolean;
  routes: RouteId[];
  permissions: Permission[];
  createdAt?: string;
  updatedAt?: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  isAdmin: boolean;
  roles: Role[];
  permissions: Permission[];
  createdAt?: string;
  updatedAt?: string;
};

export type Session = {
  familyId: string;
  current: boolean;
  issuedAt: string;
  lastSeenAt: string;
  expiresAt: string;
  clientLabel: string;
  ipPrefix?: string;
};

export type AuditEvent = {
  id: string;
  occurredAt: string;
  category: string;
  action: string;
  outcome: string;
  actorId: string;
  subjectType: string;
  subjectId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
};

export type AuditFilters = {
  action: string;
  outcome: string;
  actorId: string;
  subjectId: string;
  from: string;
  to: string;
};

export type PublicSettings = {
  displayName: string;
  logoUrl: string;
  defaultLocale: string;
};

export type AppSettings = PublicSettings & {
  version: number;
  updatedAt?: string;
  updatedBy?: string;
};

export type ThemePreference = "light" | "dark" | "system";

export type PersonalPreferences = {
  theme: ThemePreference;
  locale: string;
  timeZone: string;
};

export type CursorPage<T> = {
  data: T[];
  limit: number;
  hasNext: boolean;
  nextCursor?: string;
};

export type ApiEnvelope<T> = {
  status: number;
  message: string;
  data: T;
};

export type ApiProblem = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
  requestId?: string;
  errors?: Array<{ field: string; code: string }>;
};

export type PetSpecies = "dog" | "cat" | "other";
export type PetSex = "male" | "female" | "unknown";
export type PetSize = "" | "small" | "medium" | "large" | "giant";
export type PetVisibility = "hidden" | "lost_only" | "always";
export type PetPublicField =
  | "photo"
  | "species"
  | "breed"
  | "color"
  | "sex"
  | "age"
  | "size"
  | "distinctiveFeatures"
  | "allergies"
  | "specialConditions"
  | "surgeries"
  | "temperament"
  | "ownerName"
  | "contactButton"
  | "comuna"
  | "secondOwner";

export type PetHealth = {
  allergies: string[];
  surgeries: string[];
  specialConditions: string[];
  temperament: string;
};

export type PetOwner = {
  fullName: string;
  address: string;
  comuna: string;
  phone: string;
  phoneAlt: string;
};

export type PetSecondOwner = {
  fullName: string;
  phone: string;
};

export type Pet = {
  id: string;
  name: string;
  species: PetSpecies;
  breed: string;
  color: string;
  sex: PetSex;
  birthDate: string;
  chipNumber: string;
  weightKg: number | null;
  size: PetSize;
  distinctiveFeatures: string;
  health: PetHealth;
  owner: PetOwner;
  secondOwner: PetSecondOwner;
  publicVisibility: Record<PetPublicField, PetVisibility>;
  photoUrl?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type PetRequest = Omit<Pet, "id" | "photoUrl" | "createdAt" | "updatedAt" | "secondOwner" | "version"> & {
  version?: number;
  secondOwner?: PetSecondOwner;
};

export type TagKind = "physical" | "digital";
export type TagStatus = "unassigned" | "active" | "disabled";

export type PetTag = {
  id: string;
  code: string;
  kind: TagKind;
  status: TagStatus;
  petId?: string;
  activatedAt?: string;
  disabledAt?: string;
  createdAt: string;
  url: string;
};

export type TagBatch = {
  id: string;
  label: string;
  quantity: number;
  createdBy?: string;
  createdAt: string;
};

export type PublicProfile = {
  name: string;
  photoUrl?: string;
  species?: string;
  breed?: string;
  color?: string;
  sex?: string;
  size?: string;
  ageMonths?: number;
  distinctiveFeatures?: string;
  allergies?: string[];
  specialConditions?: string[];
  surgeries?: string[];
  temperament?: string;
  ownerFirstName?: string;
  secondOwnerFirstName?: string;
  comuna?: string;
  canContact: boolean;
  lost: boolean;
};

export type PublicTagView = {
  state: "active" | "unassigned" | "disabled";
  profile?: PublicProfile;
};

export type ScanReceipt = {
  scanId: string;
  scanToken: string;
};

export type PublicContact = {
  phone: string;
  whatsappUrl: string;
};

export type ScanMessage = {
  id: string;
  body: string;
  finderName?: string;
  finderPhone?: string;
  createdAt: string;
};

export type ScanWithMessages = {
  id: string;
  tagCode: string;
  scannedAt: string;
  userAgentFamily: "ios" | "android" | "desktop" | "other";
  phoneRevealedAt?: string;
  location?: ScanLocation;
  messages: ScanMessage[];
};

export type ScanLocation = {
  lat: number;
  lng: number;
  accuracyM: number;
  at: string;
};

export type NotificationPayload = {
  petName: string;
  tagCode: string;
  scannedAt: string;
  device?: "ios" | "android" | "desktop" | "other";
  location?: ScanLocation;
  message?: { body: string; finderName?: string; finderPhone?: string };
  phoneRevealed?: boolean;
};

export type AppNotification = {
  id: string;
  kind: "tag_scanned" | "location_shared" | "finder_message" | "phone_revealed";
  petId: string;
  tagId: string;
  scanId?: string;
  payload: NotificationPayload;
  readAt?: string;
  createdAt: string;
};

export type FinderMessageInput = {
  body: string;
  finderName?: string;
  finderPhone?: string;
  website?: string;
};
