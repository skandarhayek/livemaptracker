import fetch from "node-fetch";
import { DOMParser } from "xmldom";
import { kml as toGeoJSON } from "@tmcw/togeojson";
import fs from "fs";

const KML_URL = "https://share.garmin.com/feed/share/3M37F";
const HISTORY_FILE = "./public/history.json"; // adjust as needed

async function fetchKMLandAppend() {
  const kmlText = await fetch(KML_URL).then((res) => res.text());

  const parser = new DOMParser();
  const kmlDom = parser.parseFromString(kmlText, "text/xml");
  const geojson = toGeoJSON(kmlDom);

  const points = geojson.features.filter((f) => f.geometry.type === "Point");

  if (points.length > 0) {
    const latest = points[0];
    const history = fs.existsSync(HISTORY_FILE)
      ? JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"))
      : [];

    const alreadyLogged = history.some(
      (p) => p.properties.Time === latest.properties.Time
    );

    if (!alreadyLogged) {
      history.push(latest);
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
      console.log("New point added:", latest.properties.Time);
    } else {
      console.log("No new point.");
    }
  }
}

fetchKMLandAppend();
