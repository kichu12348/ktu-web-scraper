import { config, MAX_RETRIES } from "./config";
import { fetchClient } from "./client";
import fs from "node:fs";

/*
<div id="loginFailureDiv" style="">
                                             <div class="alert alert-danger">Error ! Invalid username or password.</div>
										</div>
*/

const loginFailedDivPattern =
  /<div[^>]*id="loginFailureDiv"[^>]*>[\s\S]*<\/div>/i;

const errorDivPattern =
  /<div[^>]*class="alert alert-danger"[^>]*>[\s\S]*<\/div>/i;

export async function loginToKtu(
  username: string,
  password: string,
): Promise<boolean> {
  let csrfToken = "";

  // --- Phase 1: Retry GET until we extract a CSRF token ---
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchClient(config.LOGIN_URL, {
        headers: { "User-Agent": config.USER_AGENT },
      });

      if (!res.ok) {
        console.warn(
          `⚠️  GET returned ${res.status} (attempt ${attempt}/${MAX_RETRIES}), retrying...`,
        );
        continue;
      }

      const html = await res.text();

      const csrfMatch = html.match(
        /<input[^>]*name="CSRF_TOKEN"[^>]*value="([^"]+)"/i,
      );

      if (csrfMatch?.[1]) {
        csrfToken = csrfMatch[1];
        console.log(`✅ CSRF token obtained on attempt ${attempt}`);
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

  if (!csrfToken) {
    console.error(
      "❌ Failed to obtain CSRF token after",
      MAX_RETRIES,
      "attempts.",
    );
    return false;
  }

  // --- Phase 2: Retry POST until we land on dashboard.htm ---
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const payload = new URLSearchParams({
        CSRF_TOKEN: csrfToken,
        username: username,
        password: password,
      });

      const res = await fetchClient(config.LOGIN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": config.USER_AGENT,
        },
        body: payload.toString(),
      });

      const text = await res.text();

      const errMsg = text.match(errorDivPattern)?.[0].trim();

      if (errMsg && errMsg.includes("Invalid username or password")) {
        console.error("Invalid Username or password!\n");
        return false;
      }

      if (!res.ok && !res.url.includes("dashboard.htm")) {
        console.warn(
          `⚠️  POST returned ${res.status} (attempt ${attempt}/${MAX_RETRIES}), retrying...`,
        );
        // fs.writeFileSync("./debug/login_output.html", await res.text());
        continue;
      }

      if (res.url.includes("dashboard.htm")) {
        console.log(`✅ Login successful on attempt ${attempt}`);
        return true;
      }

      console.warn(
        `⚠️  Login didn't reach dashboard (attempt ${attempt}/${MAX_RETRIES}), ended at: ${res.url} status: ${res.status}. Retrying...`,
      );
      //fs.writeFileSync("./debug/login_output_2.html", await res.text());
    } catch (err) {
      const e = err as Error;
      console.warn(
        `⚠️  POST failed (attempt ${attempt}/${MAX_RETRIES}): ${e.name} - ${e.message}`,
      );
    }
  }

  console.error("❌ Login failed after", MAX_RETRIES, "attempts.");
  return false;
}
