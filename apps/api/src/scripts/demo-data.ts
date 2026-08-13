export type DemoAttendancePattern =
  'high' | 'declining' | 'persistent_absence' | 'late' | 'recovering';

export interface DemoPerson {
  readonly key: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly departmentCode: string;
}

export interface DemoDataset {
  readonly lecturers: readonly DemoPerson[];
  readonly students: readonly (DemoPerson & {
    readonly matricNumber: string;
    readonly levelCode: string;
    readonly pattern: DemoAttendancePattern;
  })[];
  readonly departments: readonly {
    key: string;
    code: string;
    name: string;
    faculty: string;
    programme: string;
  }[];
  readonly courses: readonly {
    key: string;
    code: string;
    title: string;
    departmentCode: string;
    lecturerKey: string;
  }[];
  readonly sessions: readonly {
    key: string;
    courseKey: string;
    week: number;
    openedAt: string;
    closesAt: string;
  }[];
  readonly attendance: readonly {
    key: string;
    studentKey: string;
    sessionKey: string;
    courseKey: string;
    pattern: DemoAttendancePattern;
    status: 'present' | 'late';
  }[];
}

function randomGenerator(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

const firstNames = [
  'Amara',
  'Zainab',
  'Maya',
  'Chidi',
  'Noah',
  'Leila',
  'Tariq',
  'Sofia',
  'Kemi',
  'Ethan',
  'Nia',
  'Rayan',
  'Adaeze',
  'Malik',
  'Ife',
  'Elena',
  'Kwame',
  'Aisha',
  'Dara',
  'Luca',
];
const lastNames = [
  'Afolayan',
  'Mensah',
  'Danladi',
  'Okafor',
  'Bennett',
  'Nwankwo',
  'Suleiman',
  'Laurent',
  'Adekunle',
  'Kamara',
  'Ibrahim',
  'Morgan',
  'Ezeani',
  'Diallo',
  'Cole',
  'Balogun',
  'Okon',
  'Hassan',
  'Reed',
  'Obasi',
];
const patterns: readonly DemoAttendancePattern[] = [
  'high',
  'declining',
  'persistent_absence',
  'late',
  'recovering',
];
const departments = [
  {
    key: 'dept-csc',
    code: 'CSC',
    name: 'Computer Science',
    faculty: 'Science and Technology',
    programme: 'BSc Computer Science',
  },
  {
    key: 'dept-eng',
    code: 'ENG',
    name: 'Electrical Engineering',
    faculty: 'Engineering',
    programme: 'BEng Electrical Engineering',
  },
  {
    key: 'dept-bus',
    code: 'BUS',
    name: 'Business Administration',
    faculty: 'Management Sciences',
    programme: 'BSc Business Administration',
  },
  {
    key: 'dept-eco',
    code: 'ECO',
    name: 'Economics',
    faculty: 'Social Sciences',
    programme: 'BSc Economics',
  },
  { key: 'dept-law', code: 'LAW', name: 'Public Law', faculty: 'Law', programme: 'LLB Law' },
  {
    key: 'dept-med',
    code: 'MED',
    name: 'Biomedical Sciences',
    faculty: 'Health Sciences',
    programme: 'BSc Biomedical Sciences',
  },
] as const;
const courseTitles = [
  'Foundations and Practice',
  'Applied Methods',
  'Research and Innovation',
  'Professional Seminar',
] as const;

function attendanceProbability(pattern: DemoAttendancePattern, week: number): number {
  if (pattern === 'high') return 0.94;
  if (pattern === 'declining') return 0.96 - week * 0.035;
  if (pattern === 'persistent_absence') return 0.42;
  if (pattern === 'late') return 0.84;
  return 0.48 + week * 0.032;
}

export function buildDemoDataset(seed: number): DemoDataset {
  const random = randomGenerator(seed);
  const lecturers = Array.from({ length: 18 }, (_, index) => {
    const serial = String(index + 1).padStart(2, '0');
    return {
      key: `lecturer-${serial}`,
      firstName: firstNames[(index * 3 + 2) % firstNames.length]!,
      lastName: lastNames[(index * 7 + 1) % lastNames.length]!,
      email: `lecturer.${serial}@demo.attendity.invalid`,
      departmentCode: departments[index % departments.length]!.code,
    };
  });
  const students = Array.from({ length: 240 }, (_, index) => {
    const serial = String(index + 1).padStart(3, '0');
    const department = departments[index % departments.length]!;
    return {
      key: `student-${serial}`,
      firstName: firstNames[(index * 7 + 3) % firstNames.length]!,
      lastName: lastNames[(index * 11 + 5) % lastNames.length]!,
      email: `student.${serial}@demo.attendity.invalid`,
      departmentCode: department.code,
      matricNumber: `ATD/${department.code}/2026/${serial}`,
      levelCode: `${100 + (index % 4) * 100}`,
      pattern: patterns[index % patterns.length]!,
    };
  });
  const courses = departments.flatMap((department, departmentIndex) =>
    courseTitles.map((title, courseIndex) => ({
      key: `course-${department.code.toLowerCase()}-${courseIndex + 1}`,
      code: `${department.code} ${401 + courseIndex * 2}`,
      title: `${department.name}: ${title}`,
      departmentCode: department.code,
      lecturerKey: lecturers[(departmentIndex * 3 + courseIndex) % lecturers.length]!.key,
    })),
  );
  const semesterStart = Date.UTC(2026, 3, 20, 8, 0, 0);
  const sessions = courses.flatMap((course, courseIndex) =>
    Array.from({ length: 16 }, (_, week) => {
      const openedAt = new Date(
        semesterStart + (week * 7 + (courseIndex % 5)) * 86_400_000 + (courseIndex % 4) * 3_600_000,
      );
      return {
        key: `${course.key}-week-${String(week + 1).padStart(2, '0')}`,
        courseKey: course.key,
        week: week + 1,
        openedAt: openedAt.toISOString(),
        closesAt: new Date(openedAt.getTime() + 90 * 60_000).toISOString(),
      };
    }),
  );
  const courseByKey = new Map(courses.map((course) => [course.key, course]));
  const attendance = students.flatMap((student) =>
    sessions.flatMap((session) => {
      if (courseByKey.get(session.courseKey)?.departmentCode !== student.departmentCode) return [];
      if (random() > attendanceProbability(student.pattern, session.week)) return [];
      return [
        {
          key: `${student.key}-${session.key}`,
          studentKey: student.key,
          sessionKey: session.key,
          courseKey: session.courseKey,
          pattern: student.pattern,
          status:
            student.pattern === 'late' && random() < 0.62
              ? ('late' as const)
              : ('present' as const),
        },
      ];
    }),
  );
  return { lecturers, students, departments: [...departments], courses, sessions, attendance };
}
