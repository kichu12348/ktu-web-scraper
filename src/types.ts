export interface Course {
  course: string;
  credits: string;
  grade: string;
  code?: string; // Optional, only available in the grade card view
}

export interface GradesBySemester {
  semester: string;
  sgpa: string;
  courses: Course[];
}

export interface SemesterData {
  sgpa: string;
  courses: Course[];
}

export interface StudentProfile {
  nameAndId: string;
  dob: string;
}
