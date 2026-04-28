import * as cheerio from "cheerio";
import { config } from "../config";
import { fetchClient } from "../client";
import type { Course, GradesBySemester } from "../types";

export async function fetchGradeCard(
  targetSemester: string,
): Promise<GradesBySemester> {
  console.log("Fetching Grade Card Search Form...");
  let gradeGetRes;
  try {
    gradeGetRes = await fetchClient(config.GRADE_CARD_URL, {
      headers: { "User-Agent": config.USER_AGENT },
      signal: AbortSignal.timeout(5000), // 5 second timeout for Result Day load
    });
  } catch (e) {
    console.error("Server hanging on GET. It's getting crushed.");
    throw new Error("Failed to fetch grade card search form", { cause: e });
  }

  const formHtml = await gradeGetRes.text();

  //<input type="hidden" name="CSRF_TOKEN" id="semesterGradeCardListingSearchForm_CSRF_TOKEN" value="-8094779651872085056"/>

  const patten =
    /<input[^>]*name="CSRF_TOKEN"[^>]*id="semesterGradeCardListingSearchForm_CSRF_TOKEN"[^>]*value="([^"]+)"[^>]*>/;

  const match = formHtml.match(patten);

  const formCsrf = match && match[1] ? match[1] : null;

  if (!formCsrf) {
    console.error("Couldn't find the form CSRF token!");
    throw new Error("Failed to extract CSRF token");
  }

  // --- 2. FIRE THE POST REQUEST (The Sniper Shot) ---

  const searchPayload = new URLSearchParams({
    CSRF_TOKEN: formCsrf.toString(),
    form_name: "semesterGradeCardListingSearchForm",
    semesterId: targetSemester,
    stdId: "",
    search: "Search",
  });

  let gradePostRes;
  try {
    gradePostRes = await fetchClient(config.GRADE_CARD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": config.USER_AGENT,
      },
      body: searchPayload.toString(),
      signal: AbortSignal.timeout(8000), // Give it 8 seconds to process the DB query
    });
  } catch (e) {
    console.error(
      "Server 502/Timeout on POST. Retry loop should kick in here!",
    );
    throw new Error("Failed to fetch grade card results", { cause: e });
  }

  const resultsHtml = await gradePostRes.text();
  const $res = cheerio.load(resultsHtml);

  // --- 3. PARSE THE CLEAN TABLE ---

  // Check if the results are actually out
  // check if "#errorMainDiv" exists and contains the "not published" text
  const errorText = $res("#errorMainDiv").text().trim().toLocaleLowerCase();
  if (
    errorText.includes("semester grade cards not available") ||
    errorText.length !== 0
  ) {
    throw new Error(
      "Semester results are not available for the semester " + targetSemester,
    );
  }
  const grades: Course[] = [];
  let sgpa = "Not Available";

  // Select the table rows inside the results body
  $res("table tbody tr").each((_, tr) => {
    const tds = $res(tr).find("td");
    const firstColText = $res(tds[0]).text().trim().toLocaleLowerCase();

    // Check if we hit the summary rows at the bottom
    if (
      firstColText.includes("total earned credits") ||
      firstColText.includes("total credits in the semester") ||
      firstColText.includes("sgpa")
    ) {
      if (firstColText.includes("sgpa")) {
        sgpa = $res(tds[1]).text().trim();
      }
    } else if (tds.length >= 4 && firstColText !== "") {
      // It's a standard course row
      grades.push({
        course: firstColText,
        code: $res(tds[1]).text().trim(),
        grade: $res(tds[2]).text().trim(),
        credits: $res(tds[3]).text().trim(),
      });
    }
  });

  return { semester: targetSemester, sgpa, courses: grades };
}
