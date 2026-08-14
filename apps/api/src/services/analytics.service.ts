import { createHash, randomUUID } from 'node:crypto';
import type {
  AnalyticsDataset,
  AnalyticsRegistrationRecord,
} from '../repositories/analytics.repository.js';
import { analyticsRepository } from '../repositories/analytics.repository.js';
import type {
  AnalyticsKpis,
  AnalyticsOverview,
  AcademicPeriodPreset,
  AnalyticsReport,
  AnalyticsReportRow,
  AttendanceInsight,
  AttendanceRisk,
  AttendanceRiskLevel,
  CourseAnalytics,
  LeaderboardEntry,
  RequestActor,
} from '@qr/types';
import { InstitutionStructureModel } from '../models/institution-structure.model.js';
import { SystemSettingsModel } from '../models/system-settings.model.js';

const DAY = 86_400_000;
const riskWeight: Readonly<Record<AttendanceRiskLevel, number>> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

export function calculatePercentage(value: number, total: number): number {
  return total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function registrationMap(registrations: readonly AnalyticsRegistrationRecord[]) {
  return new Map(
    registrations.map((registration) => [
      `${registration.studentId}:${registration.courseId}`,
      registration,
    ]),
  );
}

export function calculateRiskLevel(
  current: number,
  projected: number,
  required: number,
  sessions: number,
): AttendanceRiskLevel {
  if (sessions === 0 || required === 0) return 'low';
  if (sessions >= 3 && current <= required - 20) return 'critical';
  if (current < required && projected < required) return 'high';
  if (current < required + 5) return 'medium';
  return 'low';
}

export function calculateRiskRecommendation(
  attended: number,
  held: number,
  required: number,
  level: AttendanceRiskLevel,
): string {
  if (held === 0) return 'Attend the first scheduled lecture to establish your attendance record.';
  if (level === 'low') return 'Maintain your current attendance pattern.';
  if (required >= 100)
    return 'Attend every remaining lecture and contact your lecturer about the missed sessions.';
  const needed = Math.max(1, Math.ceil((required * held - 100 * attended) / (100 - required)));
  return `Attend the next ${needed} lecture${needed === 1 ? '' : 's'} to reach the requirement if no further sessions are missed.`;
}

export function calculateAttendanceRisks(dataset: AnalyticsDataset): readonly AttendanceRisk[] {
  const courseMap = new Map(dataset.courses.map((course) => [course.id, course]));
  const studentMap = new Map(dataset.students.map((student) => [student.id, student]));
  const sessionsByCourse = new Map<string, typeof dataset.sessions>();
  for (const course of dataset.courses)
    sessionsByCourse.set(
      course.id,
      dataset.sessions
        .filter((session) => session.courseId === course.id && session.status === 'closed')
        .sort((a, b) => a.openedAt.getTime() - b.openedAt.getTime()),
    );
  const result = dataset.registrations.map((registration) => {
    const course = courseMap.get(registration.courseId);
    const student = studentMap.get(registration.studentId);
    if (!course || !student) return undefined;
    const sessions = sessionsByCourse.get(course.id) ?? [];
    const attendedSessionIds = new Set(
      dataset.records
        .filter(
          (record) => record.courseId === course.id && record.studentId === registration.studentId,
        )
        .map((record) => record.sessionId),
    );
    const attended = sessions.filter((session) => attendedSessionIds.has(session.id)).length;
    const recent = sessions.slice(-5);
    const recentAttended = recent.filter((session) => attendedSessionIds.has(session.id)).length;
    const current = calculatePercentage(attended, sessions.length);
    const recentRate = calculatePercentage(recentAttended, recent.length);
    const projected = sessions.length ? Math.round(current * 0.7 + recentRate * 0.3) : 0;
    const level = calculateRiskLevel(
      current,
      projected,
      course.attendanceRequirement,
      sessions.length,
    );
    return {
      id: registration.id,
      studentId: student.id,
      studentName: student.fullName,
      registrationNumber: registration.registrationNumber,
      courseId: course.id,
      courseCode: course.code,
      courseTitle: course.title,
      currentAttendance: current,
      projectedAttendance: projected,
      requiredAttendance: course.attendanceRequirement,
      sessionsHeld: sessions.length,
      sessionsAttended: attended,
      level,
      confidence: sessions.length ? Math.min(95, 50 + sessions.length * 5) : 0,
      reason:
        sessions.length === 0
          ? 'No completed lecture has been recorded for this course.'
          : `${attended} of ${sessions.length} completed lectures attended; recent attendance is ${recentRate}%.`,
      recommendation: calculateRiskRecommendation(
        attended,
        sessions.length,
        course.attendanceRequirement,
        level,
      ),
    } satisfies AttendanceRisk;
  });
  return result
    .filter((item): item is AttendanceRisk => item !== undefined)
    .sort(
      (a, b) =>
        riskWeight[b.level] - riskWeight[a.level] ||
        a.currentAttendance - b.currentAttendance ||
        a.studentName.localeCompare(b.studentName),
    );
}

function courseAnalytics(dataset: AnalyticsDataset): readonly CourseAnalytics[] {
  return dataset.courses
    .map((course) => {
      const sessions = dataset.sessions.filter((session) => session.courseId === course.id);
      const registrations = dataset.registrations.filter(
        (registration) => registration.courseId === course.id,
      );
      const records = dataset.records.filter((record) => record.courseId === course.id);
      return {
        id: course.id,
        code: course.code,
        title: course.title,
        department: course.departmentName,
        sessions: sessions.length,
        registrations: registrations.length,
        checkIns: records.length,
        attendanceRate: calculatePercentage(records.length, sessions.length * registrations.length),
      };
    })
    .sort((a, b) => b.attendanceRate - a.attendanceRate || a.code.localeCompare(b.code));
}

function kpis(dataset: AnalyticsDataset, courses: readonly CourseAnalytics[]): AnalyticsKpis {
  const uniqueStudents = new Set(
    dataset.registrations.map((registration) => registration.studentId),
  ).size;
  const possible = courses.reduce(
    (total, course) => total + course.sessions * course.registrations,
    0,
  );
  return {
    totalSessions: dataset.sessions.length,
    totalCheckIns: dataset.records.length,
    averageAttendance: calculatePercentage(dataset.records.length, possible),
    activeSessions: dataset.sessions.filter((session) => session.status === 'open').length,
    registeredStudents: uniqueStudents,
  };
}

function studentLeaderboard(dataset: AnalyticsDataset): readonly LeaderboardEntry[] {
  const students = new Map(dataset.students.map((student) => [student.id, student]));
  const result = [...new Set(dataset.registrations.map((item) => item.studentId))].map(
    (studentId) => {
      const registrations = dataset.registrations.filter((item) => item.studentId === studentId);
      const courseIds = new Set(registrations.map((item) => item.courseId));
      const sessions = dataset.sessions.filter((session) => courseIds.has(session.courseId));
      const sessionIds = new Set(sessions.map((session) => session.id));
      const records = dataset.records.filter(
        (record) => record.studentId === studentId && sessionIds.has(record.sessionId),
      );
      const student = students.get(studentId);
      return {
        id: studentId,
        label: student?.fullName ?? 'Student',
        supportingLabel: registrations[0]?.registrationNumber ?? 'No registration number',
        attendanceRate: calculatePercentage(records.length, sessions.length),
        attended: records.length,
        possible: sessions.length,
      };
    },
  );
  return result
    .filter((item) => item.possible > 0)
    .sort((a, b) => b.attendanceRate - a.attendanceRate || b.attended - a.attended)
    .slice(0, 10);
}

function departmentLeaderboard(
  dataset: AnalyticsDataset,
  courses: readonly CourseAnalytics[],
): readonly LeaderboardEntry[] {
  const names = [...new Set(dataset.courses.map((course) => course.departmentName))];
  return names
    .map((name) => {
      const entries = courses.filter((course) => course.department === name);
      const attended = entries.reduce((total, course) => total + course.checkIns, 0);
      const possible = entries.reduce(
        (total, course) => total + course.sessions * course.registrations,
        0,
      );
      return {
        id: name,
        label: name,
        supportingLabel: `${entries.length} course${entries.length === 1 ? '' : 's'}`,
        attendanceRate: calculatePercentage(attended, possible),
        attended,
        possible,
      };
    })
    .filter((entry) => entry.possible > 0)
    .sort((a, b) => b.attendanceRate - a.attendanceRate)
    .slice(0, 10);
}

export function deriveAttendanceInsights(
  trend: AnalyticsOverview['trend'],
  departments: readonly LeaderboardEntry[],
  riskRows: readonly AttendanceRisk[],
): readonly AttendanceInsight[] {
  const result: AttendanceInsight[] = [];
  const midpoint = Math.floor(trend.length / 2);
  const first = trend.slice(0, midpoint);
  const second = trend.slice(midpoint);
  const average = (items: typeof trend) => {
    const measured = items.filter((item) => item.sessions > 0);
    return measured.length
      ? Math.round(
          measured.reduce((total, item) => total + item.attendanceRate, 0) / measured.length,
        )
      : 0;
  };
  const previousRate = average(first);
  const currentRate = average(second);
  if (first.some((item) => item.sessions) && second.some((item) => item.sessions)) {
    const difference = currentRate - previousRate;
    result.push({
      id: 'period-comparison',
      tone: difference > 0 ? 'positive' : difference < 0 ? 'warning' : 'neutral',
      title:
        difference > 0
          ? 'Attendance improved in the latest period'
          : difference < 0
            ? 'Attendance declined in the latest period'
            : 'Attendance remained stable',
      description: `The latest half of this reporting period averaged ${currentRate}% attendance compared with ${previousRate}% previously.`,
      evidence: `${Math.abs(difference)} percentage-point ${difference >= 0 ? 'increase' : 'decrease'}`,
    });
  }
  const bestDepartment = departments[0];
  if (bestDepartment)
    result.push({
      id: 'department-leader',
      tone: 'positive',
      title: `${bestDepartment.label} leads attendance`,
      description: `It has the highest measured department attendance rate in the selected period.`,
      evidence: `${bestDepartment.attendanceRate}% across ${bestDepartment.possible} attendance opportunities`,
    });
  const atRisk = riskRows.filter((risk) => risk.level === 'high' || risk.level === 'critical');
  if (atRisk.length)
    result.push({
      id: 'risk-count',
      tone: 'warning',
      title: `${atRisk.length} registration${atRisk.length === 1 ? '' : 's'} require attention`,
      description: 'Their current and projected attendance are below their course requirements.',
      evidence: `${atRisk.filter((risk) => risk.level === 'critical').length} critical; ${atRisk.filter((risk) => risk.level === 'high').length} high risk`,
    });
  const busiest = [...trend].sort((a, b) => b.checkIns - a.checkIns)[0];
  if (busiest?.checkIns)
    result.push({
      id: 'busiest-day',
      tone: 'neutral',
      title: `${busiest.date} recorded the most check-ins`,
      description: 'This was the busiest attendance day in the selected period.',
      evidence: `${busiest.checkIns} verified check-in${busiest.checkIns === 1 ? '' : 's'}`,
    });
  if (!result.length)
    result.push({
      id: 'insufficient-data',
      tone: 'neutral',
      title: 'More attendance history is needed',
      description: 'Insights will appear after lectures close and students record attendance.',
      evidence: 'No comparable completed attendance periods yet',
    });
  return result;
}

function dateRange(days: number, now = new Date()): { from: Date; to: Date } {
  const to = now;
  const from = new Date(to.getTime() - (days - 1) * DAY);
  from.setUTCHours(0, 0, 0, 0);
  return { from, to };
}

export interface AnalyticsPeriodQuery {
  readonly period?: AcademicPeriodPreset;
  readonly days?: number;
  readonly from?: Date;
  readonly to?: Date;
}

export interface AnalyticsPeriodSettings {
  readonly timeZone: string;
  readonly currentTermStart?: Date;
  readonly currentTermEnd?: Date;
}

function zonedParts(date: Date, timeZone: string) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: values.year!,
    month: values.month!,
    day: values.day!,
    hour: values.hour!,
    minute: values.minute!,
    second: values.second!,
  };
}

function zonedMidnight(year: number, month: number, day: number, timeZone: string): Date {
  const desired = Date.UTC(year, month - 1, day);
  let instant = desired;
  for (let pass = 0; pass < 3; pass += 1) {
    const actual = zonedParts(new Date(instant), timeZone);
    const represented = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    instant += desired - represented;
  }
  return new Date(instant);
}

export function buildAnalyticsReportRows(
  dataset: AnalyticsDataset,
  scope: 'university' | 'course' | 'student' | 'risk',
): readonly AnalyticsReportRow[] {
  const latestByRegistration = new Map<string, Date>();
  for (const record of dataset.records) {
    const key = `${record.studentId}:${record.courseId}`;
    const current = latestByRegistration.get(key);
    if (!current || record.checkedInAt > current) latestByRegistration.set(key, record.checkedInAt);
  }
  return calculateAttendanceRisks(dataset)
    .filter((risk) => risk.sessionsHeld > 0)
    .filter((risk) => scope !== 'risk' || risk.level === 'high' || risk.level === 'critical')
    .map((risk) => {
      const latestAttendance = latestByRegistration.get(`${risk.studentId}:${risk.courseId}`);
      return {
        id: `${risk.studentId}:${risk.courseId}`,
        studentName: risk.studentName,
        registrationNumber: risk.registrationNumber,
        courseCode: risk.courseCode,
        courseTitle: risk.courseTitle,
        sessionsHeld: risk.sessionsHeld,
        sessionsAttended: risk.sessionsAttended,
        attendanceRate: risk.currentAttendance,
        requiredAttendance: risk.requiredAttendance,
        riskLevel: risk.level,
        ...(latestAttendance ? { latestAttendanceAt: latestAttendance.toISOString() } : {}),
      } satisfies AnalyticsReportRow;
    })
    .sort((a, b) => {
      if (a.latestAttendanceAt && b.latestAttendanceAt)
        return (
          b.latestAttendanceAt.localeCompare(a.latestAttendanceAt) ||
          a.studentName.localeCompare(b.studentName) ||
          a.registrationNumber.localeCompare(b.registrationNumber)
        );
      if (a.latestAttendanceAt) return -1;
      if (b.latestAttendanceAt) return 1;
      return (
        a.studentName.localeCompare(b.studentName) ||
        a.registrationNumber.localeCompare(b.registrationNumber)
      );
    });
}

function calendarParts(value: string): {
  readonly year: number;
  readonly month: number;
  readonly day: number;
} {
  const [year, month, day] = value.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined)
    throw Object.assign(new Error('Report dates must use the YYYY-MM-DD format.'), {
      statusCode: 422,
    });
  return { year, month, day };
}

function calendarDateKey(date: Date, timeZone: string): string {
  const local = zonedParts(date, timeZone);
  return [local.year, local.month, local.day]
    .map((value, index) => (index === 0 ? String(value) : String(value).padStart(2, '0')))
    .join('-');
}

export function resolveReportDateRange(
  timeZone: string,
  fromValue?: string,
  toValue?: string,
  now = new Date(),
): {
  readonly from: Date;
  readonly to: Date;
  readonly fromKey: string;
  readonly toKey: string;
  readonly days: number;
} {
  const toKey = toValue ?? calendarDateKey(now, timeZone);
  const toParts = calendarParts(toKey);
  const toSerial = new Date(Date.UTC(toParts.year, toParts.month - 1, toParts.day));
  const defaultFromSerial = new Date(toSerial);
  defaultFromSerial.setUTCDate(defaultFromSerial.getUTCDate() - 29);
  const fromKey = fromValue ?? defaultFromSerial.toISOString().slice(0, 10);
  const fromParts = calendarParts(fromKey);
  const fromSerial = Date.UTC(fromParts.year, fromParts.month - 1, fromParts.day);
  const selectedToSerial = Date.UTC(toParts.year, toParts.month - 1, toParts.day);
  const days = Math.round((selectedToSerial - fromSerial) / DAY) + 1;
  if (days < 1)
    throw Object.assign(new Error('The report start date must not be after the end date.'), {
      statusCode: 422,
    });
  if (days > 366)
    throw Object.assign(new Error('Report ranges cannot exceed one year.'), { statusCode: 422 });
  const nextDay = new Date(selectedToSerial);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return {
    from: zonedMidnight(fromParts.year, fromParts.month, fromParts.day, timeZone),
    to: new Date(
      zonedMidnight(
        nextDay.getUTCFullYear(),
        nextDay.getUTCMonth() + 1,
        nextDay.getUTCDate(),
        timeZone,
      ).getTime() - 1,
    ),
    fromKey,
    toKey,
    days,
  };
}

export function selectAnalyticsReportRows<T>(
  rows: readonly T[],
  page: number,
  limit: number,
  complete: boolean,
): {
  readonly rows: readonly T[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly pages: number;
  };
} {
  if (complete)
    return {
      rows,
      pagination: { page: 1, limit: rows.length, total: rows.length, pages: rows.length ? 1 : 0 },
    };
  const offset = (page - 1) * limit;
  return {
    rows: rows.slice(offset, offset + limit),
    pagination: { page, limit, total: rows.length, pages: Math.ceil(rows.length / limit) },
  };
}

export function resolveAnalyticsPeriod(
  settings: AnalyticsPeriodSettings,
  query: AnalyticsPeriodQuery,
  now = new Date(),
): { from: Date; to: Date; preset: AcademicPeriodPreset; days: number } {
  if (query.days !== undefined && !query.period) {
    const range = dateRange(query.days, now);
    return { ...range, preset: 'custom', days: query.days };
  }
  const preset = query.period ?? 'monthly';
  let from: Date;
  let to = now;
  if (preset === 'custom') {
    if (!query.from || !query.to)
      throw Object.assign(new Error('Custom analytics require both start and end dates.'), {
        statusCode: 422,
      });
    from = query.from;
    to = query.to;
  } else if (preset === 'semester') {
    if (!settings.currentTermStart)
      throw Object.assign(
        new Error('Configure a current academic term with dates before using semester analytics.'),
        { statusCode: 422 },
      );
    from = settings.currentTermStart;
    if (settings.currentTermEnd && settings.currentTermEnd < to) to = settings.currentTermEnd;
  } else {
    const local = zonedParts(now, settings.timeZone);
    const anchor = new Date(Date.UTC(local.year, local.month - 1, local.day));
    if (preset === 'weekly')
      anchor.setUTCDate(anchor.getUTCDate() - ((anchor.getUTCDay() + 6) % 7));
    if (preset === 'monthly') anchor.setUTCDate(1);
    from = zonedMidnight(
      anchor.getUTCFullYear(),
      anchor.getUTCMonth() + 1,
      anchor.getUTCDate(),
      settings.timeZone,
    );
  }
  if (from > to)
    throw Object.assign(new Error('The analytics start date must not be after the end date.'), {
      statusCode: 422,
    });
  if (to.getTime() - from.getTime() > 366 * DAY)
    throw Object.assign(new Error('Analytics ranges cannot exceed one year.'), { statusCode: 422 });
  return {
    from,
    to,
    preset,
    days: Math.max(1, Math.ceil((to.getTime() - from.getTime()) / DAY) + 1),
  };
}

export class AnalyticsService {
  private async period(actor: RequestActor, query: AnalyticsPeriodQuery) {
    const [settings, term] = await Promise.all([
      SystemSettingsModel.findOne({ universityId: actor.universityId })
        .select('timeZone')
        .lean()
        .exec(),
      InstitutionStructureModel.findOne({
        universityId: actor.universityId,
        kind: 'term',
        isCurrent: true,
        status: 'active',
      })
        .select('startsAt endsAt')
        .lean()
        .exec(),
    ]);
    return resolveAnalyticsPeriod(
      {
        timeZone: settings?.timeZone ?? 'Africa/Lagos',
        ...(term?.startsAt ? { currentTermStart: term.startsAt } : {}),
        ...(term?.endsAt ? { currentTermEnd: term.endsAt } : {}),
      },
      query,
    );
  }

  private async reportPeriod(actor: RequestActor, from?: string, to?: string) {
    const settings = await SystemSettingsModel.findOne({ universityId: actor.universityId })
      .select('timeZone')
      .lean()
      .exec();
    return resolveReportDateRange(settings?.timeZone ?? 'Africa/Lagos', from, to);
  }

  async overview(
    actor: RequestActor,
    query: AnalyticsPeriodQuery = {},
  ): Promise<AnalyticsOverview> {
    const { from, to, days, preset } = await this.period(actor, query);
    const dataset = await analyticsRepository.dataset(actor, from, to);
    return this.composeOverview(dataset, from, to, days, preset);
  }

  async myRisks(actor: RequestActor, days = 365): Promise<readonly AttendanceRisk[]> {
    if (actor.role !== 'student')
      throw Object.assign(new Error('Only students can access personal attendance risk.'), {
        statusCode: 403,
      });
    const { from, to } = dateRange(days);
    return calculateAttendanceRisks(
      await analyticsRepository.dataset(actor, from, to, { studentId: actor.id }),
    );
  }

  async courseRisks(
    actor: RequestActor,
    courseId: string,
    days = 365,
  ): Promise<readonly AttendanceRisk[]> {
    const { from, to } = dateRange(days);
    return calculateAttendanceRisks(
      await analyticsRepository.dataset(actor, from, to, { courseId }),
    );
  }

  async report(
    actor: RequestActor,
    input: {
      readonly scope: 'university' | 'course' | 'student' | 'risk';
      readonly courseId?: string;
      readonly studentId?: string;
      readonly from?: string;
      readonly to?: string;
      readonly page: number;
      readonly limit: number;
      readonly complete?: boolean;
    },
  ): Promise<AnalyticsReport> {
    const studentId = actor.role === 'student' ? actor.id : input.studentId;
    const period = await this.reportPeriod(actor, input.from, input.to);
    const [dataset, branding] = await Promise.all([
      analyticsRepository.dataset(actor, period.from, period.to, {
        ...(input.courseId ? { courseId: input.courseId } : {}),
        ...(studentId ? { studentId } : {}),
      }),
      analyticsRepository.branding(actor.universityId),
    ]);
    const overview = this.composeOverview(dataset, period.from, period.to, period.days, 'custom');
    const allRows = buildAnalyticsReportRows(dataset, input.scope);
    const selectedRows = selectAnalyticsReportRows(
      allRows,
      input.page,
      input.limit,
      input.complete ?? false,
    );
    const label =
      input.scope === 'risk'
        ? 'Attendance Risk Report'
        : input.scope === 'course'
          ? 'Course Attendance Report'
          : input.scope === 'student'
            ? 'Student Attendance Report'
            : 'University Attendance Report';
    const generatedAt = new Date().toISOString();
    const appliedFilters = {
      from: period.fromKey,
      to: period.toKey,
      courseId: input.courseId,
      studentId,
    };
    const checksum = createHash('sha256')
      .update(JSON.stringify({ summary: overview.kpis, rows: allRows, filters: appliedFilters }))
      .digest('hex');
    return {
      reportId: `ATR-${dayKey(new Date()).replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`,
      title: label,
      scope: input.scope,
      generatedAt,
      generatedBy: actor.fullName || actor.id,
      branding,
      verification: {
        source: 'live-attendance-data',
        checksum,
        verifiedAt: generatedAt,
      },
      filters: appliedFilters,
      summary: overview.kpis,
      rows: selectedRows.rows,
      pagination: selectedRows.pagination,
    };
  }

  private composeOverview(
    dataset: AnalyticsDataset,
    from: Date,
    to: Date,
    days: number,
    preset: AcademicPeriodPreset,
  ): AnalyticsOverview {
    const courses = courseAnalytics(dataset);
    const registrationsByCourse = new Map<string, number>();
    for (const registration of dataset.registrations)
      registrationsByCourse.set(
        registration.courseId,
        (registrationsByCourse.get(registration.courseId) ?? 0) + 1,
      );
    const trend = Array.from({ length: days }, (_, index) => {
      const date = new Date(from.getTime() + index * DAY);
      const key = dayKey(date);
      const sessions = dataset.sessions.filter((session) => dayKey(session.openedAt) === key);
      const sessionIds = new Set(sessions.map((session) => session.id));
      const checkIns = dataset.records.filter((record) => sessionIds.has(record.sessionId)).length;
      const possible = sessions.reduce(
        (total, session) => total + (registrationsByCourse.get(session.courseId) ?? 0),
        0,
      );
      return {
        date: key,
        sessions: sessions.length,
        checkIns,
        attendanceRate: calculatePercentage(checkIns, possible),
      };
    });
    const riskRows = calculateAttendanceRisks(dataset);
    const departments = departmentLeaderboard(dataset, courses);
    const registrations = registrationMap(dataset.registrations);
    const students = new Map(dataset.students.map((student) => [student.id, student.fullName]));
    const courseMap = new Map(dataset.courses.map((course) => [course.id, course]));
    return {
      period: { from: from.toISOString(), to: to.toISOString(), days, preset },
      kpis: kpis(dataset, courses),
      trend,
      courses,
      departments,
      leaderboard: studentLeaderboard(dataset),
      insights: deriveAttendanceInsights(trend, departments, riskRows),
      risks: riskRows.slice(0, 100),
      liveFeed: dataset.records.slice(0, 20).map((record) => ({
        id: record.id,
        studentName: students.get(record.studentId) ?? 'Student',
        registrationNumber:
          registrations.get(`${record.studentId}:${record.courseId}`)?.registrationNumber ??
          'Unavailable',
        courseCode: courseMap.get(record.courseId)?.code ?? 'Unavailable',
        checkedInAt: record.checkedInAt.toISOString(),
        status: record.status,
        gpsVerified: record.gpsVerified,
        faceVerified: record.faceVerified,
      })),
      generatedAt: new Date().toISOString(),
    };
  }
}

export const analyticsService = new AnalyticsService();
