import { config } from "../config";
import { fetchClient } from "../client";
import type { GradesBySemester } from "../types";
import fs from "node:fs";
import { parseGradeCard } from "../parser/gradeCardParser";

export async function fetchGradeCard(
  targetSemester: string,
): Promise<GradesBySemester> {
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

  // For debugging purposes, you can save the results HTML to a file
  fs.writeFileSync("gradeCardResults.txt", resultsHtml);

  // --- 3. PARSE THE RESULTS ---
  try {
    return parseGradeCard(resultsHtml, targetSemester);
  } catch (e) {
    console.error("Error parsing grade card results:", (e as Error).message);
    throw new Error("Failed to parse grade card results", { cause: e });
  }
}
