import type {
  InstitutionTerminology,
  InstitutionType,
  Permission,
  StaffInvitableRole,
  UserRole,
} from '@qr/types';

export const APP_NAME = 'Attendity';
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

export const USER_ROLES: readonly UserRole[] = [
  'super_admin',
  'university_admin',
  'faculty_admin',
  'department_admin',
  'lecturer',
  'student',
  'examiner',
  'viewer',
];

export const ASSESSMENT_REGISTRATION_ROLES = [
  'university_admin',
  'lecturer',
  'examiner',
  'student',
] as const satisfies readonly UserRole[];

export const STAFF_INVITABLE_ROLES: readonly StaffInvitableRole[] = [
  'university_admin',
  'faculty_admin',
  'department_admin',
  'lecturer',
  'examiner',
  'viewer',
];

export const COURSE_REGISTRATION_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'withdrawn',
] as const;

export const COURSE_REGISTRATION_SOURCES = [
  'core',
  'elective',
  'borrowed',
  'administrator',
] as const;

export const THEME_STORAGE_KEY = 'attendity-theme';
export const THEME_TRANSITION_MS = 250;

export const ANNOUNCEMENT_CATEGORIES = [
  'academic',
  'administrative',
  'emergency',
  'event',
  'general',
] as const;
export const ANNOUNCEMENT_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export const ANNOUNCEMENT_STATUSES = [
  'draft',
  'scheduled',
  'published',
  'archived',
  'cancelled',
] as const;

export const EVENT_TYPES = [
  'orientation',
  'seminar',
  'conference',
  'workshop',
  'career_fair',
  'convocation_activity',
  'departmental_meeting',
  'student_assembly',
  'training',
  'competition',
  'examination_briefing',
  'institutional_ceremony',
  'custom',
] as const;
export const EVENT_STATUSES = [
  'draft',
  'scheduled',
  'active',
  'completed',
  'cancelled',
  'archived',
] as const;
export const EVENT_ATTENDANCE_METHODS = ['dynamic_qr', 'gps', 'face', 'manual', 'pin'] as const;
export const EVENT_PARTICIPATION_STATUSES = [
  'present',
  'late',
  'absent',
  'excused',
  'rejected',
  'pending',
] as const;

export const INSTITUTION_TYPES: readonly InstitutionType[] = [
  'university',
  'polytechnic',
  'college_of_education',
  'technical_college',
  'vocational_training_centre',
  'institute',
  'academy',
  'nursing_health_sciences_school',
  'seminary',
  'military_paramilitary_academy',
  'other',
];

export const INSTITUTION_TYPE_LABELS: Readonly<Record<InstitutionType, string>> = {
  university: 'University',
  polytechnic: 'Polytechnic',
  college_of_education: 'College of Education',
  technical_college: 'Technical College',
  vocational_training_centre: 'Vocational or Skills Training Centre',
  institute: 'Institute',
  academy: 'Academy',
  nursing_health_sciences_school: 'Nursing or Health Sciences School',
  seminary: 'Seminary',
  military_paramilitary_academy: 'Military or Paramilitary Academy',
  other: 'Other post-secondary institution',
};

export function isInstitutionType(value: unknown): value is InstitutionType {
  return typeof value === 'string' && INSTITUTION_TYPES.some((type) => type === value);
}

const UNIVERSITY_TERMINOLOGY: InstitutionTerminology = {
  institution: 'University',
  institutionPlural: 'Universities',
  primaryUnit: 'Faculty',
  primaryUnitPlural: 'Faculties',
  department: 'Department',
  departmentPlural: 'Departments',
  programme: 'Programme',
  programmePlural: 'Programmes',
  course: 'Course',
  coursePlural: 'Courses',
  educator: 'Lecturer',
  educatorPlural: 'Lecturers',
  student: 'Student',
  studentPlural: 'Students',
  academicPeriod: 'Semester',
  academicPeriodPlural: 'Semesters',
};

export const INSTITUTION_TERMINOLOGY: Readonly<Record<InstitutionType, InstitutionTerminology>> = {
  university: UNIVERSITY_TERMINOLOGY,
  polytechnic: {
    ...UNIVERSITY_TERMINOLOGY,
    institution: 'Polytechnic',
    institutionPlural: 'Polytechnics',
    primaryUnit: 'School',
    primaryUnitPlural: 'Schools',
  },
  college_of_education: {
    ...UNIVERSITY_TERMINOLOGY,
    institution: 'College of Education',
    institutionPlural: 'Colleges of Education',
    primaryUnit: 'School',
    primaryUnitPlural: 'Schools',
  },
  technical_college: {
    ...UNIVERSITY_TERMINOLOGY,
    institution: 'Technical College',
    institutionPlural: 'Technical Colleges',
    primaryUnit: 'Division',
    primaryUnitPlural: 'Divisions',
    programme: 'Trade or Programme',
    programmePlural: 'Trades or Programmes',
    course: 'Trade or Programme',
    coursePlural: 'Trades or Programmes',
    educator: 'Instructor',
    educatorPlural: 'Instructors',
    academicPeriod: 'Term',
    academicPeriodPlural: 'Terms',
  },
  vocational_training_centre: {
    ...UNIVERSITY_TERMINOLOGY,
    institution: 'Training Centre',
    institutionPlural: 'Training Centres',
    primaryUnit: 'Training Area',
    primaryUnitPlural: 'Training Areas',
    programme: 'Training Programme',
    programmePlural: 'Training Programmes',
    course: 'Training Programme',
    coursePlural: 'Training Programmes',
    educator: 'Facilitator',
    educatorPlural: 'Facilitators',
    academicPeriod: 'Term',
    academicPeriodPlural: 'Terms',
  },
  institute: {
    ...UNIVERSITY_TERMINOLOGY,
    institution: 'Institute',
    institutionPlural: 'Institutes',
    primaryUnit: 'Division',
    primaryUnitPlural: 'Divisions',
    course: 'Programme',
    coursePlural: 'Programmes',
    educator: 'Facilitator',
    educatorPlural: 'Facilitators',
  },
  academy: {
    ...UNIVERSITY_TERMINOLOGY,
    institution: 'Academy',
    institutionPlural: 'Academies',
    primaryUnit: 'School',
    primaryUnitPlural: 'Schools',
    educator: 'Instructor',
    educatorPlural: 'Instructors',
    academicPeriod: 'Term',
    academicPeriodPlural: 'Terms',
  },
  nursing_health_sciences_school: {
    ...UNIVERSITY_TERMINOLOGY,
    institution: 'Health Sciences School',
    institutionPlural: 'Health Sciences Schools',
    primaryUnit: 'School',
    primaryUnitPlural: 'Schools',
    educator: 'Lecturer',
    educatorPlural: 'Lecturers',
  },
  seminary: {
    ...UNIVERSITY_TERMINOLOGY,
    institution: 'Seminary',
    institutionPlural: 'Seminaries',
    primaryUnit: 'School',
    primaryUnitPlural: 'Schools',
    academicPeriod: 'Term',
    academicPeriodPlural: 'Terms',
  },
  military_paramilitary_academy: {
    ...UNIVERSITY_TERMINOLOGY,
    institution: 'Academy',
    institutionPlural: 'Academies',
    primaryUnit: 'Command or School',
    primaryUnitPlural: 'Commands or Schools',
    educator: 'Instructor',
    educatorPlural: 'Instructors',
    student: 'Cadet',
    studentPlural: 'Cadets',
    academicPeriod: 'Term',
    academicPeriodPlural: 'Terms',
  },
  other: {
    ...UNIVERSITY_TERMINOLOGY,
    institution: 'Institution',
    institutionPlural: 'Institutions',
    primaryUnit: 'Academic Unit',
    primaryUnitPlural: 'Academic Units',
    educator: 'Educator',
    educatorPlural: 'Educators',
    academicPeriod: 'Term',
    academicPeriodPlural: 'Terms',
  },
};

export function getInstitutionTerminology(
  institutionType: InstitutionType,
  overrides: Partial<InstitutionTerminology> = {},
): InstitutionTerminology {
  return { ...INSTITUTION_TERMINOLOGY[institutionType], ...overrides };
}

export const GENERIC_COUNTRY_TRUST_STATEMENT =
  'Trusted attendance infrastructure for institutions of higher learning.';

const COUNTRY_DEMONYMS: Readonly<Record<string, string>> = {
  AE: 'Emirati',
  AR: 'Argentine',
  AT: 'Austrian',
  AU: 'Australian',
  BE: 'Belgian',
  BR: 'Brazilian',
  BW: 'Botswanan',
  CA: 'Canadian',
  CH: 'Swiss',
  CI: 'Ivorian',
  CL: 'Chilean',
  CM: 'Cameroonian',
  CN: 'Chinese',
  CO: 'Colombian',
  CZ: 'Czech',
  DE: 'German',
  DK: 'Danish',
  EG: 'Egyptian',
  ES: 'Spanish',
  ET: 'Ethiopian',
  FI: 'Finnish',
  FR: 'French',
  GB: 'British',
  GH: 'Ghanaian',
  GR: 'Greek',
  HK: 'Hong Kong',
  HU: 'Hungarian',
  ID: 'Indonesian',
  IE: 'Irish',
  IL: 'Israeli',
  IN: 'Indian',
  IS: 'Icelandic',
  IT: 'Italian',
  JM: 'Jamaican',
  JP: 'Japanese',
  KE: 'Kenyan',
  KR: 'South Korean',
  LK: 'Sri Lankan',
  MA: 'Moroccan',
  MX: 'Mexican',
  MY: 'Malaysian',
  MZ: 'Mozambican',
  NA: 'Namibian',
  NG: 'Nigerian',
  NL: 'Dutch',
  NO: 'Norwegian',
  NZ: 'New Zealand',
  PE: 'Peruvian',
  PH: 'Philippine',
  PK: 'Pakistani',
  PL: 'Polish',
  PT: 'Portuguese',
  RO: 'Romanian',
  RW: 'Rwandan',
  SA: 'Saudi',
  SE: 'Swedish',
  SG: 'Singaporean',
  SN: 'Senegalese',
  TH: 'Thai',
  TR: 'Turkish',
  TZ: 'Tanzanian',
  UG: 'Ugandan',
  US: 'American',
  VN: 'Vietnamese',
  ZA: 'South African',
  ZM: 'Zambian',
  ZW: 'Zimbabwean',
};

export function normalizeCountryCode(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) && !['A1', 'A2', 'O1', 'T1', 'XX'].includes(code)
    ? code
    : undefined;
}

export function countryNameFromCode(value: unknown): string | undefined {
  const code = normalizeCountryCode(value);
  if (!code) return undefined;
  const name = new Intl.DisplayNames(['en'], { type: 'region' }).of(code);
  return name && name !== code ? name : undefined;
}

export function demonymForCountry(value: unknown): string | undefined {
  const code = normalizeCountryCode(value);
  return code ? COUNTRY_DEMONYMS[code] : undefined;
}

export function formatCountryTrustStatement(input?: {
  readonly countryCode?: string;
  readonly countryName?: string;
}): { readonly statement: string; readonly demonym?: string } {
  const countryCode = normalizeCountryCode(input?.countryCode);
  const demonym = demonymForCountry(countryCode);
  if (demonym)
    return {
      statement: `Trusted attendance infrastructure for ${demonym} institutions of higher learning.`,
      demonym,
    };
  const countryName = input?.countryName?.trim() || countryNameFromCode(countryCode);
  return countryName
    ? {
        statement: `Trusted attendance infrastructure for institutions of higher learning in ${countryName}.`,
      }
    : { statement: GENERIC_COUNTRY_TRUST_STATEMENT };
}

export const ROLE_PERMISSIONS: Readonly<Record<UserRole, readonly Permission[]>> = {
  super_admin: [
    'users:read',
    'users:write',
    'courses:read',
    'courses:write',
    'attendance:read',
    'attendance:write',
    'reports:read',
    'reports:write',
    'analytics:read',
    'settings:read',
    'settings:write',
    'audit:read',
    'notifications:read',
    'notifications:write',
    'announcements:read',
    'announcements:write',
    'events:read',
    'events:write',
    'clearance:verify',
  ],
  university_admin: [
    'users:read',
    'users:write',
    'courses:read',
    'courses:write',
    'attendance:read',
    'attendance:write',
    'reports:read',
    'reports:write',
    'analytics:read',
    'settings:read',
    'settings:write',
    'audit:read',
    'notifications:read',
    'notifications:write',
    'announcements:read',
    'announcements:write',
    'events:read',
    'events:write',
  ],
  faculty_admin: [
    'users:read',
    'courses:read',
    'attendance:read',
    'reports:read',
    'analytics:read',
    'notifications:read',
    'announcements:read',
    'announcements:write',
    'events:read',
    'events:write',
  ],
  department_admin: [
    'users:read',
    'courses:read',
    'attendance:read',
    'reports:read',
    'analytics:read',
    'notifications:read',
    'announcements:read',
    'announcements:write',
    'events:read',
    'events:write',
  ],
  lecturer: [
    'courses:read',
    'attendance:read',
    'attendance:write',
    'reports:read',
    'analytics:read',
    'notifications:read',
    'notifications:write',
    'announcements:read',
    'announcements:write',
    'events:read',
    'events:write',
  ],
  student: [
    'attendance:read',
    'reports:read',
    'notifications:read',
    'notifications:write',
    'announcements:read',
    'events:read',
  ],
  examiner: [
    'attendance:read',
    'clearance:verify',
    'notifications:read',
    'announcements:read',
    'events:read',
  ],
  viewer: [
    'attendance:read',
    'reports:read',
    'analytics:read',
    'announcements:read',
    'events:read',
  ],
};
