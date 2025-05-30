import fs from "fs";
import https from "https";

const API_KEY = process.env.WAKATIME_API_KEY!;
const FILE_PATH = "./README.md";
const HOUR_REGEX = /\b(\d{3,4})\+\b/g;
const MILESTONE_STEP = 100;

function fetchCodingHours(): Promise<number> {
  return new Promise((resolve, reject) => {
    https
      .get(
        `https://wakatime.com/api/v1/users/current/stats/all_time?api_key=${API_KEY}`,
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const json = JSON.parse(data);
              const codingCategory = json.data.categories.find(
                (cat: any) => cat.name === "Coding"
              );

              if (!codingCategory) {
                return reject("Coding category not found.");
              }

              const hours = Math.floor(codingCategory.total_seconds / 3600);
              resolve(hours);
            } catch (err) {
              reject(`Parsing error: ${err}`);
            }
          });
        }
      )
      .on("error", reject);
  });
}

async function updateReadme() {
  const codingHours = await fetchCodingHours();
  const newMilestone =
    Math.floor(codingHours / MILESTONE_STEP) * MILESTONE_STEP;

  let readme = fs.readFileSync(FILE_PATH, "utf8");
  const matches = [...readme.matchAll(HOUR_REGEX)];

  if (!matches.length) {
    console.warn("No tracked hour pattern like 1200+ found in README.md");
    return;
  }

  const currentValue = parseInt(matches[0][1]);
  if (newMilestone > currentValue) {
    readme = readme.replace(HOUR_REGEX, `${newMilestone}+`);
    fs.writeFileSync(FILE_PATH, readme, "utf8");
    console.log(`Updated tracked hours: ${currentValue}+ → ${newMilestone}+`);
  } else {
    console.log("No update needed.");
  }
}

updateReadme();
