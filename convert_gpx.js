import { readFileSync, writeFileSync } from "fs";
import { Parser } from "xml2js";

const parseDate = (dateString) => new Date(dateString);

const samplePoints = (points, intervalMinutes = 20) => {
  const sampled = [];
  if (!points.length) return sampled;

  let currentTime = new Date(points[0].time);
  const endTime = new Date(points[points.length - 1].time);

  while (currentTime <= endTime) {
    const closestPoint = points.reduce((prev, curr) => {
      const prevDiff = Math.abs(parseDate(prev.time) - currentTime);
      const currDiff = Math.abs(parseDate(curr.time) - currentTime);
      return prevDiff < currDiff ? prev : curr;
    });

    const timeDiff = Math.abs(parseDate(closestPoint.time) - currentTime);
    if (timeDiff <= 600000) {
      sampled.push({
        time: currentTime.toISOString(),
        lat: parseFloat(closestPoint.lat),
        lon: parseFloat(closestPoint.lon),
        elev: parseFloat(closestPoint.ele),
        velo: "0.0 km/h"
      });
    }

    currentTime = new Date(currentTime.getTime() + intervalMinutes * 60000);
  }

  return sampled;
};

const parseGPX = async (filePath) => {
  const parser = new Parser();
  const gpxData = readFileSync(filePath, "utf8");

  try {
    const result = await parser.parseStringPromise(gpxData);
    const tracks = result.gpx.trk;

    const points = [];
    tracks.forEach((track) => {
      track.trkseg.forEach((segment) => {
        segment.trkpt.forEach((point) => {
          points.push({
            lat: point.$.lat,
            lon: point.$.lon,
            ele: point.ele[0],
            time: point.time[0]
          });
        });
      });
    });

    return points.sort((a, b) => parseDate(a.time) - parseDate(b.time));
  } catch (error) {
    console.error("Error parsing GPX:", error);
    return [];
  }
};

const main = async () => {
  try {
    const points = await parseGPX("./gpx/First_4_days.gpx");

    const sampledPoints = samplePoints(points);

    const history = JSON.parse(readFileSync("./history.json", "utf8"));

    const combined = [...sampledPoints, ...history];

    writeFileSync("./history.json", JSON.stringify(combined, null, 2));

    console.log(`Successfully processed ${sampledPoints.length} new points`);
  } catch (error) {
    console.error("Error:", error);
  }
};

main();
