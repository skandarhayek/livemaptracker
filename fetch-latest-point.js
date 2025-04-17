import fetch from "node-fetch";
import { DOMParser } from "xmldom";
import { kml as toGeoJSON } from "@tmcw/togeojson";
import fs from "fs";

const KML_URL = "https://share.garmin.com/feed/share/3M37F";
const HISTORY_FILE = "./history.json";

async function fetchKMLandAppend() {
  const res = await fetch(KML_URL, {
    headers: {
      Authorization:
        "Basic " + Buffer.from(`CDT2025:A2n6n6a2`).toString("base64")
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

    const existingCoords = new Set(
      history.map((p) => p.geometry.coordinates.join(","))
    );

    const uniquePoints = points.filter(
      (p) => !existingCoords.has(p.geometry.coordinates.join(","))
    );

    if (uniquePoints.length > 0) {
      const simplifiedPoints = uniquePoints.map((p) => {
        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: p.geometry.coordinates
          },
          properties: {
            name: p.properties.Name,
            timestamp: p.properties.timestamp,
            latitude: p.geometry.coordinates[1],
            longitude: p.geometry.coordinates[0],
            elevation: p.properties.Elevation
              ? parseFloat(p.properties.Elevation)
              : null,
            velocity: p.properties.Velocity || "N/A"
          }
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
