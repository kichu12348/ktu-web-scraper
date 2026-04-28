import * as cheerio from "cheerio";
import { config } from "../config";
import { fetchClient } from "../client";
import type { SemesterData, Course } from "../types";

interface GradesBySemester extends SemesterData {
  semester: string;
}

export async function fetchGrades(): Promise<GradesBySemester[]> {
  const fullDetailsRes = await fetchClient(config.FULL_DETAILS_URL, {
    headers: { "User-Agent": config.USER_AGENT },
  });

  const fullDetailsHtml = await fullDetailsRes.text();
  const $full = cheerio.load(fullDetailsHtml);

  const gradesBySemester: GradesBySemester[] = [];

  // Target the curriculum tab
  const $curriculumTab = $full("#curriculamTab_curriculam");

  // Loop through every semester panel
  $curriculumTab.find(".panel.panel-default").each((_, element) => {
    const semesterData: Course[] = [];

    // Extract the semester name (e.g., "S1", "S2") from the panel heading
    const semesterLabel = $full(element)
      .find(".panel-title a.collapsed")
      .text()
      .trim();

    // Ensure we actually found a semester label before proceeding
    if (semesterLabel) {
      // Extract the SGPA from the table (it's in the last cell of the first row)
      const sgpaRaw = $full(element)
        .find("tbody tr:first-child td[rowspan]")
        .text()
        .trim();
      const sgpa = sgpaRaw ? sgpaRaw : "Not Available";

      // Loop through every row in the grades table for this semester
      $full(element)
        .find("tbody tr")
        .each((i, tr) => {
          const tds = $full(tr).find("td");

          // Some rows might be empty or formatting rows, so check length
          if (tds.length >= 8) {
            // Clean out the non-breaking spaces and HTML
            let courseRaw = $full(tds[1]).text().trim();
            courseRaw = courseRaw.replace(/\s+/g, " ");

            const credits = $full(tds[2]).text().trim();
            const grade = $full(tds[7]).text().trim();

            semesterData.push({
              course: courseRaw,
              credits: credits,
              grade: grade,
            });
          }
        });

      // Store the extracted data for this semester
      gradesBySemester.push({
        semester: semesterLabel,
        sgpa: sgpa,
        courses: semesterData,
      });
    }
  });

  return gradesBySemester;
}
