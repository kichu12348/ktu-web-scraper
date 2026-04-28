import * as cheerio from "cheerio";
import { config } from "../config";
import { fetchClient } from "../client";
import type { StudentProfile } from "../types";

export async function fetchBasicProfile(): Promise<StudentProfile> {
  const profileRes = await fetchClient(config.BASIC_PROFILE_URL, {
    headers: { "User-Agent": config.USER_AGENT },
  });

  const profileHtml = await profileRes.text();
  const $ = cheerio.load(profileHtml);

  const nameAndId = $(".profile-title").first().text().trim();

  const dobRaw = $(".view-badge")
    .filter(function () {
      return $(this).text().trim() === "Date of Birth";
    })
    .parent()
    .text();
  const dob = dobRaw.replace("Date of Birth", "").trim();

  return { nameAndId, dob };
}
