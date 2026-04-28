import { config } from "./config";
import { fetchClient } from "./client";

export async function loginToKtu(
  username: string,
  password: string,
): Promise<boolean> {
  // The GET request. 'fetch-cookie' silently grabs and saves the JSESSIONID.
  let res = await fetchClient(config.LOGIN_URL, {
    headers: { "User-Agent": config.USER_AGENT },
  });
  let html = await res.text();

  const csrfMatch = html.match(
    /<input[^>]*name="CSRF_TOKEN"[^>]*value="([^"]+)"/i,
  );
  if (!csrfMatch || !csrfMatch[1]) {
    console.error("Failed to find CSRF_TOKEN!");
    return false;
  }
  const csrfToken = csrfMatch[1];

  if (!csrfToken) {
    console.error("CSRF_TOKEN is empty!");
    return false;
  }

  const payload = new URLSearchParams({
    CSRF_TOKEN: csrfToken,
    username: username,
    password: password,
  });

  // The POST request to login
  res = await fetchClient(config.LOGIN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": config.USER_AGENT,
    },
    body: payload.toString(),
  });

  // Verify and Jump to Profile
  if (res.url.includes("dashboard.htm")) {
    return true;
  } else {
    console.error("❌ Login failed. Ended up at:", res.url);
    return false;
  }
}
