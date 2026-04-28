// Let's set up the TLS override as early as possible
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export const config = {
  USERNAME: process.env.K_USERNAME || "",
  PASSWORD: process.env.K_PASSWORD || "",
  LOGIN_URL: "https://app.ktu.edu.in/login.htm",
  BASIC_PROFILE_URL: "https://app.ktu.edu.in/eu/stu/studentBasicProfile.htm",
  FULL_DETAILS_URL: "https://app.ktu.edu.in/eu/stu/studentDetailsView.htm",
  GRADE_CARD_URL: "https://app.ktu.edu.in/eu/res/semesterGradeCardListing.htm",
  // A common User-Agent to mimic a real browser. Some sites might block requests without it.
  USER_AGENT: "Mozilla/5.0",
};
