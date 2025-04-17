import fetch from "node-fetch";
import { DOMParser } from "xmldom";
import { kml as toGeoJSON } from "@tmcw/togeojson";
import fs from "fs";
import dotenv from "dotenv";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const KML_URL = "https://share.garmin.com/feed/share/3M37F";
const HISTORY_FILE = "./history.json";

async function fetchKMLandAppend() {
  const res = await fetch(KML_URL, {
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.GARMIN_USER}:${process.env.GARMIN_PASS}`
        ).toString("base64")
    }
  });

  const kmlText = await res.text();

  const parser = new DOMParser();
  const kmlDom = parser.parseFromString(kmlText, "text/xml");

  if (!kmlDom) {
    console.error("Error parsing KML: Invalid KML data.");
    return;
  }

  const geojson = toGeoJSON(kmlDom);

  if (!geojson || !geojson.features) {
    console.error("Error converting KML to GeoJSON.");
    return;
  }

  const points = geojson.features.filter((f) => f.geometry?.type === "Point");

  if (points.length > 0) {
    let history = [];
    if (fs.existsSync(HISTORY_FILE)) {
      try {
        const data = fs.readFileSync(HISTORY_FILE, "utf8");
        history = JSON.parse(data);

        if (!Array.isArray(history)) {
          console.error("Invalid history format, resetting to empty array.");
          history = [];
        }
      } catch (error) {
        console.error(
          "Error reading history file, initializing with empty array."
        );
      }
    }

    const existingTimes = new Set(history.map((p) => p.time));
    const uniquePoints = points.filter(
      (p) => !existingTimes.has(p.properties.timestamp)
    );
    if (uniquePoints.length > 0) {
      const simplifiedPoints = uniquePoints.map((p) => {
        return {
          time: p.properties.timestamp,
          lat: p.geometry.coordinates[1],
          lon: p.geometry.coordinates[0],
          elev: p.properties.Elevation
            ? parseFloat(p.properties.Elevation)
            : null,
          velo: p.properties.Velocity || "N/A"
        };
      });
      const updated = [...history, ...simplifiedPoints];
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(updated, null, 2));
      console.log(`Appended ${simplifiedPoints.length} new points.`);
    } else {
      console.log("No new points to append.");
    }
  } else {
    console.log("No Points found in the KML.");
  }
}

fetchKMLandAppend();
