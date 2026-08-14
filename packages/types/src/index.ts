export type UserRole =
  | 'super_admin'
  | 'university_admin'
  | 'faculty_admin'
  | 'department_admin'
  | 'lecturer'
  | 'student'
  | 'examiner'
  | 'viewer';

export interface AuthenticatedUser {
  readonly id: string;
  readonly universityId: string;
  readonly email: string;
  readonly fullName: string;
  readonly role: UserRole;
  readonly photoUrl?: string;
}

export type Permission =
  | 'users:read'
  | 'users:write'
  | 'courses:read'
  | 'courses:write'
  | 'attendance:read'
  | 'attendance:write'
  | 'reports:read'
  | 'reports:write'
  | 'analytics:read'
  | 'settings:read'
  | 'settings:write'
  | 'audit:read'
  | 'notifications:read'
  | 'notifications:write'
  | 'announcements:read'
  | 'announcements:write'
  | 'events:read'
  | 'events:write'
  | 'clearance:verify';

export interface TokenPair {
  readonly accessToken: string;
  readonly refreshToken: string;
}

export interface RequestActor extends AuthenticatedUser {
  readonly permissions: readonly Permission[];
  readonly sessionId: string;
}

export type StaffInvitableRole = Exclude<UserRole, 'student' | 'super_admin'>;
export type StaffInvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';
export type CourseRegistrationStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';
export type RegistrationSource = 'core' | 'elective' | 'borrowed' | 'administrator';
export type CourseClassification = 'core' | 'elective';
export type AcademicPeriodPreset = 'daily' | 'weekly' | 'monthly' | 'semester' | 'custom';

export interface StaffInvitationSummary {
  readonly id: string;
  readonly email: string;
  readonly role: StaffInvitableRole;
  readonly status: StaffInvitationStatus;
  readonly expiresAt: string;
  readonly acceptedAt?: string;
  readonly revokedAt?: string;
  readonly createdAt: string;
}

export interface StudentProfile {
  readonly id: string;
  readonly userId: string;
  readonly matricNumber: string;
  readonly campusId: string;
  readonly facultyId: string;
  readonly departmentId: string;
  readonly programmeId: string;
  readonly levelId: string;
  readonly admissionSessionId: string;
  readonly photoAssetId?: string;
  readonly completionPercentage: number;
  readonly missingFields: readonly string[];
  readonly updatedAt: string;
}

export interface LecturerProfile {
  readonly id: string;
  readonly userId: string;
  readonly employeeNumber?: string;
  readonly title?: string;
  readonly campusId?: string;
  readonly facultyId?: string;
  readonly departmentId?: string;
  readonly office?: string;
  readonly biography?: string;
  readonly photoAssetId?: string;
  readonly completionPercentage: number;
  readonly missingFields: readonly string[];
  readonly updatedAt: string;
}

export interface CurriculumMappingSummary {
  readonly id: string;
  readonly courseId: string;
  readonly programmeId: string;
  readonly levelId: string;
  readonly termId: string;
  readonly classification: CourseClassification;
  readonly status: 'active' | 'inactive';
}

export interface LecturerAssignmentSummary {
  readonly id: string;
  readonly lecturerId: string;
  readonly courseId: string;
  readonly academicSessionId: string;
  readonly termId: string;
  readonly assignmentRole: 'primary' | 'co_lecturer';
  readonly status: 'active' | 'inactive';
}

export interface ApiResponse<TData> {
  readonly success: boolean;
  readonly message: string;
  readonly data: TData;
  readonly timestamp: string;
  readonly errors?: Readonly<Record<string, readonly string[]>>;
}

export interface HealthStatus {
  readonly status: 'ok';
  readonly service: string;
  readonly timestamp: string;
}

export type InstitutionType =
  | 'university'
  | 'polytechnic'
  | 'college_of_education'
  | 'technical_college'
  | 'vocational_training_centre'
  | 'institute'
  | 'academy'
  | 'nursing_health_sciences_school'
  | 'seminary'
  | 'military_paramilitary_academy'
  | 'other';

export type AcademicTerminologyPreset = InstitutionType | 'custom';

export interface InstitutionTerminology {
  readonly institution: string;
  readonly institutionPlural: string;
  readonly primaryUnit: string;
  readonly primaryUnitPlural: string;
  readonly department: string;
  readonly departmentPlural: string;
  readonly programme: string;
  readonly programmePlural: string;
  readonly course: string;
  readonly coursePlural: string;
  readonly educator: string;
  readonly educatorPlural: string;
  readonly student: string;
  readonly studentPlural: string;
  readonly academicPeriod: string;
  readonly academicPeriodPlural: string;
}

export interface InstitutionSettings {
  readonly institutionName: string;
  readonly institutionType: InstitutionType;
  readonly countryCode: string;
  readonly countryName: string;
  readonly logoAssetId?: string;
  readonly logoUrl?: string;
  readonly primaryColor: string;
  readonly secondaryColor: string;
  readonly terminologyPreset: AcademicTerminologyPreset;
  readonly terminologyOverrides: Partial<InstitutionTerminology>;
  readonly terminology: InstitutionTerminology;
  readonly staffTitlePreference: string;
  readonly studentIdentifierLabel: string;
  readonly studentIdentifierExample: string;
  readonly studentIdentifierPattern: string;
  readonly studentIdentifierGuidance: string;
  readonly timeZone: string;
  readonly dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  readonly attendanceRequirement: number;
  readonly qrRotationSeconds: number;
  readonly gpsRadiusMetres: number;
  readonly lateArrivalMinutes: number;
  readonly academicSession: string;
  readonly currentSemester: string;
  readonly electiveRegistrationRequiresApproval: boolean;
  readonly reminderPolicy: InstitutionReminderPolicy;
}

export type AttendanceQrMode = 'static' | 'rotating';

export type AcademicStructureKind =
  'campus' | 'faculty' | 'programme' | 'level' | 'academic_session' | 'term' | 'venue';

export interface AcademicStructureItem {
  readonly id: string;
  readonly kind: AcademicStructureKind;
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly parent?: {
    readonly id: string;
    readonly kind: AcademicStructureKind;
    readonly code: string;
    readonly name: string;
  };
  readonly startsAt?: string;
  readonly endsAt?: string;
  readonly isCurrent: boolean;
  readonly status: 'active' | 'inactive';
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AcademicStructurePage {
  readonly items: readonly AcademicStructureItem[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly pages: number;
  };
}

export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms';

export interface InstitutionReminderPolicy {
  readonly allowedChannels: Readonly<Record<NotificationChannel, boolean>>;
  readonly maximumWindowMinutes: number;
}

export interface ReminderChannelAvailability {
  readonly channel: NotificationChannel;
  readonly allowed: boolean;
  readonly configured: boolean;
  readonly available: boolean;
  readonly reason?: string;
}

export interface ReminderCourseOption {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly muted: boolean;
}

export interface ReminderScheduleOverride {
  readonly scheduleId: string;
  readonly enabled: boolean;
  readonly offsetMinutes?: number;
  readonly channels?: readonly NotificationChannel[];
}

export interface ReminderPreference {
  readonly enabled: boolean;
  readonly defaultOffsetMinutes: number;
  readonly channels: readonly NotificationChannel[];
  readonly preferredTimeZone?: string;
  readonly quietHours: {
    readonly enabled: boolean;
    readonly startMinute: number;
    readonly endMinute: number;
  };
  readonly mutedCourseIds: readonly string[];
  readonly overrides: readonly ReminderScheduleOverride[];
  readonly channelAvailability: readonly ReminderChannelAvailability[];
  readonly courses: readonly ReminderCourseOption[];
  readonly pushPublicKey?: string;
  readonly pushSubscribed: boolean;
  readonly updatedAt?: string;
}

export type EventNotificationClassification =
  'informational' | 'operational' | 'security' | 'mandatory';

export interface EventNotificationPreference {
  readonly enabled: boolean;
  readonly channels: readonly NotificationChannel[];
  readonly informationalEnabled: boolean;
  readonly operationalEnabled: boolean;
  readonly postEventEnabled: boolean;
  readonly reportAvailabilityEnabled: boolean;
  readonly lockedClassifications: readonly ('security' | 'mandatory')[];
  readonly channelAvailability: readonly ReminderChannelAvailability[];
  readonly updatedAt?: string;
}

export interface ClassScheduleSummary {
  readonly id: string;
  readonly courseId: string;
  readonly courseCode: string;
  readonly courseTitle: string;
  readonly lecturerId: string;
  readonly lecturerName: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly venue: string;
  readonly timeZone: string;
  readonly status: 'scheduled' | 'cancelled' | 'completed';
  readonly revision: number;
  readonly cancellationReason?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ClassSchedulePage {
  readonly items: readonly ClassScheduleSummary[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly pages: number;
  };
}

export interface ReminderHistoryItem {
  readonly id: string;
  readonly scheduleId: string;
  readonly courseCode: string;
  readonly courseTitle: string;
  readonly channel: NotificationChannel;
  readonly scheduledFor: string;
  readonly status: 'pending' | 'processing' | 'delivered' | 'failed' | 'cancelled' | 'skipped';
  readonly attemptCount: number;
  readonly deliveredAt?: string;
  readonly failureCode?: string;
  readonly createdAt: string;
}

export interface ReminderHistoryPage {
  readonly items: readonly ReminderHistoryItem[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly pages: number;
  };
}

export interface CountryPersonalization {
  readonly countryCode?: string;
  readonly countryName?: string;
  readonly demonym?: string;
  readonly statement: string;
  readonly source: 'edge' | 'provider' | 'manual' | 'fallback';
  readonly resolvedAt: string;
}

export type AttendanceRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AnalyticsKpis {
  readonly totalSessions: number;
  readonly totalCheckIns: number;
  readonly averageAttendance: number;
  readonly activeSessions: number;
  readonly registeredStudents: number;
}

export interface AttendanceTrendPoint {
  readonly date: string;
  readonly sessions: number;
  readonly checkIns: number;
  readonly attendanceRate: number;
}

export interface CourseAnalytics {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly department: string;
  readonly sessions: number;
  readonly registrations: number;
  readonly checkIns: number;
  readonly attendanceRate: number;
}

export interface AttendanceInsight {
  readonly id: string;
  readonly tone: 'positive' | 'neutral' | 'warning';
  readonly title: string;
  readonly description: string;
  readonly evidence: string;
}

export interface AttendanceRisk {
  readonly id: string;
  readonly studentId: string;
  readonly studentName: string;
  readonly registrationNumber: string;
  readonly courseId: string;
  readonly courseCode: string;
  readonly courseTitle: string;
  readonly currentAttendance: number;
  readonly projectedAttendance: number;
  readonly requiredAttendance: number;
  readonly sessionsHeld: number;
  readonly sessionsAttended: number;
  readonly level: AttendanceRiskLevel;
  readonly confidence: number;
  readonly reason: string;
  readonly recommendation: string;
}

export interface LeaderboardEntry {
  readonly id: string;
  readonly label: string;
  readonly supportingLabel: string;
  readonly attendanceRate: number;
  readonly attended: number;
  readonly possible: number;
}

export interface LiveAttendanceEntry {
  readonly id: string;
  readonly studentName: string;
  readonly registrationNumber: string;
  readonly courseCode: string;
  readonly checkedInAt: string;
  readonly status: 'present';
  readonly gpsVerified: boolean;
  readonly faceVerified: boolean;
}

export interface AnalyticsOverview {
  readonly period: {
    readonly from: string;
    readonly to: string;
    readonly days: number;
    readonly preset: AcademicPeriodPreset;
  };
  readonly kpis: AnalyticsKpis;
  readonly trend: readonly AttendanceTrendPoint[];
  readonly courses: readonly CourseAnalytics[];
  readonly departments: readonly LeaderboardEntry[];
  readonly leaderboard: readonly LeaderboardEntry[];
  readonly insights: readonly AttendanceInsight[];
  readonly risks: readonly AttendanceRisk[];
  readonly liveFeed: readonly LiveAttendanceEntry[];
  readonly generatedAt: string;
}

export interface AnalyticsReportRow {
  readonly id: string;
  readonly studentName: string;
  readonly registrationNumber: string;
  readonly courseCode: string;
  readonly courseTitle: string;
  readonly sessionsHeld: number;
  readonly sessionsAttended: number;
  readonly attendanceRate: number;
  readonly requiredAttendance: number;
  readonly riskLevel: AttendanceRiskLevel;
  readonly latestAttendanceAt?: string;
}

export interface AnalyticsReport {
  readonly reportId: string;
  readonly title: string;
  readonly scope: 'university' | 'course' | 'student' | 'risk';
  readonly generatedAt: string;
  readonly generatedBy: string;
  readonly branding: {
    readonly universityName: string;
    readonly displayName: string;
    readonly logoAssetId?: string;
    readonly logoUrl?: string;
  };
  readonly verification: {
    readonly source: 'live-attendance-data';
    readonly checksum: string;
    readonly verifiedAt: string;
  };
  readonly filters: Readonly<Record<string, string | number | undefined>>;
  readonly summary: AnalyticsKpis;
  readonly rows: readonly AnalyticsReportRow[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly pages: number;
  };
}

export interface AppNotification {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly category: string;
  readonly priority: 'low' | 'normal' | 'high' | 'urgent';
  readonly readAt?: string;
  readonly archivedAt?: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
}

export interface NotificationPage {
  readonly items: readonly AppNotification[];
  readonly unread: number;
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly pages: number;
  };
}

export type AnnouncementCategory =
  'academic' | 'administrative' | 'emergency' | 'event' | 'general';
export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';
export type AnnouncementStatus = 'draft' | 'scheduled' | 'published' | 'archived' | 'cancelled';

export interface AnnouncementAttachment {
  readonly assetId?: string;
  readonly name: string;
  readonly url: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
}

export interface UploadConfiguration {
  readonly configured: boolean;
  readonly maximumSizeBytes: number;
  readonly allowedMimeTypes: readonly string[];
  readonly provider?: 'cloudinary';
}

export interface AnnouncementAudience {
  readonly campus?: string | undefined;
  readonly facultyName?: string | undefined;
  readonly departmentId?: string | undefined;
  readonly programme?: string | undefined;
  readonly level?: string | undefined;
  readonly courseId?: string | undefined;
  readonly roles: readonly UserRole[];
}

export interface AnnouncementSummary {
  readonly id: string;
  readonly title: string;
  readonly message: string;
  readonly category: AnnouncementCategory;
  readonly priority: AnnouncementPriority;
  readonly status: AnnouncementStatus;
  readonly publisherId: string;
  readonly publisherName: string;
  readonly audience: AnnouncementAudience;
  readonly attachments: readonly AnnouncementAttachment[];
  readonly channels: readonly NotificationChannel[];
  readonly pinned: boolean;
  readonly acknowledgementRequired: boolean;
  readonly publishAt?: string;
  readonly publishedAt?: string;
  readonly expiresAt?: string;
  readonly readAt?: string;
  readonly acknowledgedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AnnouncementPage {
  readonly items: readonly AnnouncementSummary[];
  readonly unread: number;
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly pages: number;
  };
}

export interface AnnouncementDeliverySummary {
  readonly targeted: number;
  readonly delivered: number;
  readonly read: number;
  readonly acknowledged: number;
  readonly failed: number;
}

export type EventType =
  | 'orientation'
  | 'seminar'
  | 'conference'
  | 'workshop'
  | 'career_fair'
  | 'convocation_activity'
  | 'departmental_meeting'
  | 'student_assembly'
  | 'training'
  | 'competition'
  | 'examination_briefing'
  | 'institutional_ceremony'
  | 'custom';
export type EventStatus = 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled' | 'archived';
export type EventAttendanceMethod = 'dynamic_qr' | 'gps' | 'face' | 'manual' | 'pin';
export type EventParticipationStatus =
  'present' | 'late' | 'absent' | 'excused' | 'rejected' | 'pending';
export type AttendanceContextType = 'CLASS_SESSION' | 'EVENT_SESSION';

export interface EventAudience {
  readonly campus?: string | undefined;
  readonly facultyName?: string | undefined;
  readonly departmentId?: string | undefined;
  readonly programme?: string | undefined;
  readonly level?: string | undefined;
  readonly roles: readonly UserRole[];
}

export interface EventAttachment {
  readonly assetId?: string;
  readonly name: string;
  readonly url: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
}

export interface EventSummary {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly eventType: EventType;
  readonly customType?: string;
  readonly organizerId: string;
  readonly organizerName: string;
  readonly campus?: string;
  readonly venue: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly timeZone: string;
  readonly academicSession?: { readonly id: string; readonly name: string };
  readonly term?: { readonly id: string; readonly name: string };
  readonly capacity?: number;
  readonly registrationRequired: boolean;
  readonly mandatory: boolean;
  readonly audience: EventAudience;
  readonly reminderOffsetsMinutes: readonly number[];
  readonly notificationChannels: readonly NotificationChannel[];
  readonly postEventMessage?: string;
  readonly participantReportAvailable: boolean;
  readonly attendanceMethods: readonly EventAttendanceMethod[];
  readonly qrRotationSeconds: number;
  readonly gps?: {
    readonly latitude: number;
    readonly longitude: number;
    readonly maximumRadiusMetres: number;
  };
  readonly faceVerificationRequired: boolean;
  readonly manualAttendanceAllowed: boolean;
  readonly pinAttendanceAllowed: boolean;
  readonly bannerUrl?: string;
  readonly attachments: readonly EventAttachment[];
  readonly activeAttendanceSessionId?: string;
  readonly attendanceClosesAt?: string;
  readonly status: EventStatus;
  readonly registrationStatus?: 'invited' | 'registered' | 'waitlisted' | 'cancelled';
  readonly participationStatus?: EventParticipationStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface EventPage {
  readonly items: readonly EventSummary[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly pages: number;
  };
}

export interface EventParticipationRecord {
  readonly id: string;
  readonly eventId: string;
  readonly eventTitle: string;
  readonly eventType: EventType;
  readonly organizerName: string;
  readonly venue: string;
  readonly startsAt: string;
  readonly academicSession?: { readonly id: string; readonly name: string };
  readonly term?: { readonly id: string; readonly name: string };
  readonly mandatory: boolean;
  readonly status: EventParticipationStatus;
  readonly checkedInAt?: string;
  readonly methods: readonly EventAttendanceMethod[];
  readonly gpsVerified: boolean;
  readonly faceVerified: boolean;
}

export interface EventParticipationSummary {
  readonly total: number;
  readonly mandatoryAttended: number;
  readonly mandatoryMissed: number;
  readonly optionalAttended: number;
  readonly present: number;
  readonly late: number;
  readonly excused: number;
  readonly absent: number;
  readonly items: readonly EventParticipationRecord[];
  readonly filterOptions: {
    readonly academicSessions: readonly { readonly id: string; readonly name: string }[];
    readonly terms: readonly { readonly id: string; readonly name: string }[];
  };
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly pages: number;
  };
}

export interface EventParticipant {
  readonly userId: string;
  readonly name: string;
  readonly email: string;
  readonly role: UserRole;
  readonly programme?: string;
  readonly level?: string;
  readonly mandatory: boolean;
  readonly registrationStatus: 'invited' | 'registered' | 'waitlisted' | 'cancelled';
  readonly participationStatus: EventParticipationStatus;
  readonly checkedInAt?: string;
  readonly verificationMethods: readonly EventAttendanceMethod[];
  readonly excuseReason?: string;
}

export interface EventParticipantPage {
  readonly items: readonly EventParticipant[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly pages: number;
  };
}

export interface EventAnalytics {
  readonly eventId: string;
  readonly invited: number;
  readonly registered: number;
  readonly attended: number;
  readonly absent: number;
  readonly late: number;
  readonly excused: number;
  readonly rejected: number;
  readonly pending: number;
  readonly attendanceRate: number;
  readonly mandatoryCompliance: number;
  readonly verificationMethods: readonly {
    readonly method: EventAttendanceMethod;
    readonly count: number;
  }[];
  readonly checkInTimeline: readonly { readonly period: string; readonly count: number }[];
  readonly attendanceOverTime: readonly {
    readonly period: string;
    readonly attended: number;
    readonly attendanceRate: number;
  }[];
  readonly peakArrivalPeriod?: { readonly period: string; readonly count: number };
  readonly attendanceByInstitutionUnit: readonly EventAttendanceBreakdown[];
  readonly attendanceByProgramme: readonly EventAttendanceBreakdown[];
  readonly attendanceByLevel: readonly EventAttendanceBreakdown[];
  readonly attendanceByRole: readonly EventAttendanceBreakdown[];
  readonly verificationFailures: {
    readonly gps: number;
    readonly face: number;
    readonly credential: number;
    readonly duplicate: number;
    readonly suspicious: number;
    readonly total: number;
  };
  readonly eventComparison: readonly {
    readonly eventId: string;
    readonly title: string;
    readonly startsAt: string;
    readonly attendanceRate: number;
  }[];
  readonly semesterParticipation: readonly {
    readonly academicSession: string;
    readonly term: string;
    readonly invited: number;
    readonly attended: number;
    readonly attendanceRate: number;
  }[];
  readonly generatedAt: string;
}

export interface EventAttendanceBreakdown {
  readonly label: string;
  readonly invited: number;
  readonly attended: number;
  readonly attendanceRate: number;
}

export interface AuditLogSummary {
  readonly id: string;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly actorId?: string;
  readonly changedFields: readonly string[];
  readonly createdAt: string;
}

export interface AuditLogPage {
  readonly items: readonly AuditLogSummary[];
  readonly filterOptions: {
    readonly actions: readonly string[];
    readonly resourceTypes: readonly string[];
  };
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly pages: number;
  };
}

export type EligibilityDecision = 'eligible' | 'not_eligible' | 'pending';
export type ClearanceReportStatus = 'valid' | 'revoked' | 'expired';

export interface CourseEligibility {
  readonly registrationId: string;
  readonly registrationNumber: string;
  readonly courseId: string;
  readonly courseCode: string;
  readonly courseTitle: string;
  readonly sessionsHeld: number;
  readonly present: number;
  readonly late: number;
  readonly absent: number;
  readonly excused: number;
  readonly attendancePercentage: number;
  readonly requiredPercentage: number;
  readonly attendanceScore: number;
  readonly currentStreak: number;
  readonly decision: EligibilityDecision;
  readonly calculatedAt: string;
}

export interface ClearanceReportSummary {
  readonly id: string;
  readonly reportId: string;
  readonly version: number;
  readonly status: ClearanceReportStatus;
  readonly registrationNumber: string;
  readonly studentName: string;
  readonly courseCode: string;
  readonly courseTitle: string;
  readonly attendancePercentage: number;
  readonly requiredPercentage: number;
  readonly decision: EligibilityDecision;
  readonly issuedAt: string;
  readonly revokedAt?: string;
  readonly revokedReason?: string;
  readonly checksum: string;
  readonly downloadCount: number;
  readonly printCount: number;
}

export interface ClearanceReportDetail extends ClearanceReportSummary {
  readonly verificationCode: string;
  readonly verificationUrl: string;
  readonly university: {
    readonly name: string;
    readonly logoAssetId?: string;
    readonly logoUrl?: string;
  };
  readonly faculty: string;
  readonly department: string;
  readonly student: {
    readonly id: string;
    readonly name: string;
    readonly matricNumber: string;
    readonly photoAssetId?: string;
    readonly photoUrl?: string;
    readonly programme: string;
    readonly level: string;
  };
  readonly academicSession: string;
  readonly semester: string;
  readonly course: { readonly id: string; readonly code: string; readonly title: string };
  readonly courseRegistrationConfirmed: true;
  readonly statistics: Omit<
    CourseEligibility,
    'registrationId' | 'registrationNumber' | 'courseId' | 'courseCode' | 'courseTitle'
  >;
  readonly generatedBy: string;
  readonly digitalSignature: string;
}

export interface ClearanceArchivePage {
  readonly items: readonly ClearanceReportSummary[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly pages: number;
  };
}

export interface ClearanceVerification {
  readonly verified: boolean;
  readonly verificationTime: string;
  readonly reportId?: string;
  readonly status: ClearanceReportStatus | 'not_found' | 'tampered';
  readonly warning?: string;
  readonly student?: {
    readonly name: string;
    readonly matricNumber: string;
    readonly photoUrl?: string;
  };
  readonly course?: { readonly code: string; readonly title: string };
  readonly attendancePercentage?: number;
  readonly requiredPercentage?: number;
  readonly eligibility?: EligibilityDecision;
  readonly issueDate?: string;
}
