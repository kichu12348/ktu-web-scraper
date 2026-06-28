import { loginToKtu } from "./src/auth";

//import { fetchBasicProfile } from "./src/scrapers/profile";
//import { fetchGrades } from "./src/scrapers/grades";
import { fetchGradeCard } from "./src/scrapers/gradeCard";

let username: string | undefined = process.env.K_USERNAME!; // replace with your KTU username or set in .env
let password: string | undefined = process.env.K_PASSWORD!; // replace with your KTU password or set in .env

async function scrapeKtu(username: string, password: string, sem: string) {
  console.log("Obtaining Results for " + username + " and sem " + sem);
  console.log("Password: " + password);

  const isLoggedIn = await loginToKtu(username, password);
  if (!isLoggedIn) return;

  // --- FETCH SPECIFIC GRADE CARD (E.G. S6) ---

  try {
    const gradeCard = await fetchGradeCard(sem);

    console.log("\n================ GRADE CARD (S6) ================\n");
    console.log(`Semester: ${gradeCard.semester}`);
    console.log(`SGPA: ${gradeCard.sgpa}`);
    console.table(gradeCard.courses);
  } catch (e) {
    console.error("Error fetching grade card:", (e as Error).message);
  }

  // --- 1. FETCH THE BASIC PROFILE ---
  // always fetch basic profile first then only the grades pages will load with the session cookie set,
  //  and we can access protected pages. Also gives us the name and DOB which is nice to have upfront.
  //   const profile = await fetchBasicProfile();

  //   console.log(`\n👨‍🎓 Scraped Basic Info:`);
  //   console.log(`   - Name & Reg No: ${profile.nameAndId}`);
  //   console.log(`   - DOB: ${profile.dob}`);

  //   // --- 2 & 3. JUMP TO FULL DETAILS VIEW & SCRAPE GRADES ---
  //   const grades = await fetchGrades();

  //   // Output the results!
  //   console.log("\n================ GRADES EXTRACTED ================\n");
  //   console.log(JSON.stringify(grades, null, 2));
}
//-u <username> -p <password> -s <semester>

const args = process.argv;
let sem = "6";
for (let i = 0; i < args.length; i++) {
  if (args[i] == "-u") {
    username = args[i + 1]!;
  }
  if (args[i] == "-p") {
    password = args[i + 1]!;
  }
  if (args[i] == "-s") {
    sem = args[i + 1]!;
  }
}

scrapeKtu(username, password, sem.toString());
