const fs = require("fs");
const https = require("https");
const { DOMParser } = require("xmldom");
const toGeoJSON = require("@tmcw/togeojson");
const fetch = require("node-fetch");

const KML_URL = "https://share.garmin.com/feed/share/3M37F";
const HISTORY_FILE = "./public/history.json"; // adjust as needed

async function fetchKMLandAppend() {
  const res = await fetch(KML_URL);
  const kmlText = await res.text();

  const parser = new DOMParser();
  const kmlDom = parser.parseFromString(kmlText, "text/xml");
  const geojson = toGeoJSON.kml(kmlDom);

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
