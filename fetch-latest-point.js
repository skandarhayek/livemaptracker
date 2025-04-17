import fetch from "node-fetch";
import { DOMParser } from "xmldom";
import { kml as toGeoJSON } from "@tmcw/togeojson";
import fs from "fs";

const KML_URL = "https://share.garmin.com/feed/share/3M37F";
const HISTORY_FILE = "./history.json";

async function fetchKMLandAppend() {
  const kmlText = await fetch(KML_URL).then((res) => res.text());

  const parser = new DOMParser();
  const kmlDom = parser.parseFromString(kmlText, "text/xml");
  const geojson = toGeoJSON(kmlDom);

  const points = geojson.features.filter((f) => f.geometry.type === "Point");

  // if (points.length > 0) {
  //   const latest = points[0];
  //   const history = fs.existsSync(HISTORY_FILE)
  //     ? JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"))
  //     : [];

  //   const alreadyLogged = history.some(
  //     (p) => p.properties.Time === latest.properties.Time
  //   );

  //   if (!alreadyLogged) {
  //     history.push(latest);
  //     fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  //     console.log("New point added:", latest.properties.Time);
  //   } else {
  //     console.log("No new point.");
  //   }
  // }

  const lineStrings = geojson.features.filter(
    (f) => f.geometry.type === "LineString"
  );
  let newPoints = [];

  lineStrings.forEach((line) => {
    const coords = line.geometry.coordinates;
    coords.forEach((coord, index) => {
      const point = {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: coord
        },
        properties: {
          source: "LineString",
          index: index,
          timestamp: new Date().toISOString() // or null if preferred
        }
      };
      newPoints.push(point);
    });
  });

  if (newPoints.length > 0) {
    const history = fs.existsSync(HISTORY_FILE)
      ? JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"))
      : [];

    const existingCoords = new Set(
      history.map((p) => p.geometry.coordinates.join(","))
    );

    const uniquePoints = newPoints.filter(
      (p) => !existingCoords.has(p.geometry.coordinates.join(","))
    );

    if (uniquePoints.length > 0) {
      const updated = [...history, ...uniquePoints];
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(updated, null, 2));
      console.log(
        `Appended ${uniquePoints.length} new points from LineString.`
      );
    } else {
      console.log("No new coordinates to append.");
    }
  } else {
    console.log("No LineStrings found in the KML.");
  }
}

fetchKMLandAppend();
