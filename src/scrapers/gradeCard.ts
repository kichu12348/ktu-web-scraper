import { config, MAX_RETRIES } from "../config";
import { fetchClient } from "../client";
import type { GradesBySemester } from "../types";
import fs from "node:fs";
import { parseGradeCard } from "../parser/gradeCardParser";

export async function fetchGradeCard(
  targetSemester: string,
): Promise<GradesBySemester> {
  let formCsrf = "";

  // --- Phase 1: Retry GET until we extract the form CSRF token ---
  const pattern =
    /<input[^>]*name="CSRF_TOKEN"[^>]*id="semesterGradeCardListingSearchForm_CSRF_TOKEN"[^>]*value="([^"]+)"[^>]*>/;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const gradeGetRes = await fetchClient(config.GRADE_CARD_URL, {
        headers: { "User-Agent": config.USER_AGENT },
        signal: AbortSignal.timeout(5000), // 5 second timeout for Result Day load
      });

      if (!gradeGetRes.ok) {
        console.warn(
          `⚠️  GET returned ${gradeGetRes.status} (attempt ${attempt}/${MAX_RETRIES}), retrying...`,
        );
        continue;
      }

      const formHtml = await gradeGetRes.text();
      const match = formHtml.match(pattern);

      if (match?.[1]) {
        formCsrf = match[1];
        console.log(`✅ Grade card CSRF token obtained on attempt ${attempt}`);
        break;
      }

      console.warn(
        `⚠️  CSRF token not found (attempt ${attempt}/${MAX_RETRIES}), retrying...`,
      );
    } catch (err) {
      const e = err as Error;
      console.warn(
        `⚠️  GET failed (attempt ${attempt}/${MAX_RETRIES}): ${e.name} - ${e.message}`,
      );
    }
  }

  if (!formCsrf) {
    console.error(
      "❌ Failed to obtain grade card CSRF token after",
      MAX_RETRIES,
      "attempts.",
    );
    throw new Error("Failed to extract CSRF token");
  }
  const searchPayload = new URLSearchParams({
    CSRF_TOKEN: formCsrf.toString(),
    form_name: "semesterGradeCardListingSearchForm",
    semesterId: targetSemester,
    stdId: "",
    search: "Search",
  });
  // --- Phase 2: Retry POST until we get parseable grade card results ---
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const gradePostRes = await fetchClient(config.GRADE_CARD_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": config.USER_AGENT,
        },
        body: searchPayload.toString(),
        signal: AbortSignal.timeout(8000), // Give it 8 seconds to process the DB query
      });

      if (!gradePostRes.ok) {
        console.warn(
          `⚠️  POST returned ${gradePostRes.status} (attempt ${attempt}/${MAX_RETRIES}), retrying...`,
        );
        continue;
      }

      const resultsHtml = await gradePostRes.text();

      // For debugging purposes, you can save the results HTML to a file
      // fs.writeFileSync("gradeCardResults.txt", resultsHtml);

      // --- 3. PARSE THE RESULTS ---
      const parsed = parseGradeCard(resultsHtml, targetSemester);
      console.log(`✅ Grade card fetched & parsed on attempt ${attempt}`);
      return parsed;
    } catch (err) {
      const e = err as Error;
      console.warn(
        `⚠️  POST/parse failed (attempt ${attempt}/${MAX_RETRIES}): ${e.name} - ${e.message}`,
      );
    }
  }

  console.error(
    "❌ Failed to fetch grade card results after",
    MAX_RETRIES,
    "attempts.",
  );
  throw new Error("Failed to fetch grade card results");
}
