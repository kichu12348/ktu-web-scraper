import { config, MAX_RETRIES } from "./config";
import { fetchClient } from "./client";

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

      if (!res.ok && !res.url.includes("dashboard.htm")) {
        console.warn(
          `⚠️  POST returned ${res.status} (attempt ${attempt}/${MAX_RETRIES}), retrying...`,
        );
        continue;
      }

      if (res.url.includes("dashboard.htm")) {
        console.log(`✅ Login successful on attempt ${attempt}`);
        return true;
      }

      console.warn(
        `⚠️  Login didn't reach dashboard (attempt ${attempt}/${MAX_RETRIES}), ended at: ${res.url} status: ${res.status}. Retrying...`,
      );
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
