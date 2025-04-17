import { readdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Get the equivalent of __dirname in ES modules
const __dirname = dirname(fileURLToPath(import.meta.url));

// Read all files in the gpx directory
const gpxDir = join(__dirname, "gpx");
const gpxFiles = readdirSync(gpxDir).filter((file) => file.endsWith(".gpx"));

// Write the list to gpx-files.json
writeFileSync(
  join(__dirname, "gpx-files.json"),
  JSON.stringify(gpxFiles),
  "utf8"
);

console.log("Updated gpx-files.json with:", gpxFiles);
