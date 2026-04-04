import { geoContains, GeoGeometryObjects } from "d3-geo";
import { mean, median } from "es-toolkit";
import { z } from "zod/v4";
import MapWaterBody from "~~/server/models/MapWaterBody";
import { zodMongooseObjectId } from "~~/shared/utils/zod";

const getBathymetrySchema = z.object({
  bodyId: zodMongooseObjectId
});

/**
 * Index-aligned keys
 * i.e. longitude[0], latitude[0], and z[0] together represent the same point
 */
export type BathymetryResponse = {
  longitude: number[];
  latitude: number[];
  /**
   * Height of the point relative to sea level in meters. 0 Represents sea level, positive values represent above sea level, and negative values represent below sea level.
   */
  z: number[];
};

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, getBathymetrySchema.parse);

  const waterBody = await MapWaterBody.findById(body.bodyId);

  if (!waterBody) {
    throw createError({
      statusCode: 404,
      message: "Water body not found"
    });
  }

  if (waterBody.geoJSON.type !== "FeatureCollection") return;

  const coords = (waterBody.geoJSON as GeoJSON.FeatureCollection).features[0];

  if (!coords || coords.geometry.type !== "MultiPolygon") return;

  const polygons = splitMultiPolygon(coords.geometry as GeoJSON.MultiPolygon);

  // The API seems to not quite handle polygon areas correctly leading to some inaccuracies on what points it returns
  // That means, we'll need to do that part by hand
  // So, to make sure we get depth data for the entire lake. We'll simplify each of the lake's polygons into a square. Compute the square, and then determine intersection after we have the whole dataset

  const polygonBoundingBoxes = polygons.map(getPolygonBoundingGeoJson);

  const bathymetryResponse = fetchBathymetryData(
    polygons,
    polygonBoundingBoxes
  );

  return bathymetryResponse;
});

// ------------------------------------- Helper functions -------------------------------------

type LatLngBounds = [
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number
];

function getPolygonBoundingGeoJson(polygon: GeoJSON.Polygon): GeoJSON.Polygon {
  const bounds = polygon.coordinates[0]!.reduce<LatLngBounds>(
    (acc, [lng, lat]) => {
      acc[0] = Math.min(acc[0]!, lat!);
      acc[1] = Math.max(acc[1]!, lat!);
      acc[2] = Math.min(acc[2]!, lng!);
      acc[3] = Math.max(acc[3]!, lng!);
      return acc;
    },
    [Infinity, -Infinity, Infinity, -Infinity]
  );

  return {
    type: "Polygon",
    coordinates: [
      [
        [bounds[2], bounds[0]], // [minLng, minLat]
        [bounds[3], bounds[0]], // [maxLng, minLat]
        [bounds[3], bounds[1]], // [maxLng, maxLat]
        [bounds[2], bounds[1]], // [minLng, maxLat]
        [bounds[2], bounds[0]] // Closing the loop
      ]
    ]
  };
}

function splitMultiPolygon(
  multiPolygon: GeoJSON.MultiPolygon
): GeoJSON.Polygon[] {
  return multiPolygon.coordinates.map<GeoJSON.Polygon>((polygonCoords) => ({
    type: "Polygon",
    coordinates: polygonCoords!
  }));
}

function filterAndMergeBathymetryData(
  polygonData: BathymetryResponse[],
  polygons: GeoJSON.Polygon[]
): BathymetryResponse {
  const filtered = polygonData.map((data, index) => {
    const originalPolygon = polygons[index];

    const filteredData: BathymetryResponse = {
      longitude: [],
      latitude: [],
      z: []
    };

    for (let i = 0; i < data.longitude.length; i++) {
      const point = [data.longitude[i]!, data.latitude[i]!] as [number, number];

      if (geoContains(originalPolygon as GeoGeometryObjects, point)) {
        filteredData.longitude.push(data.longitude[i]!);
        filteredData.latitude.push(data.latitude[i]!);
        filteredData.z.push(data.z[i]!);
      }
    }

    return filteredData;
  });

  // Merge the data from multiple polygons into one response
  const mergedData: BathymetryResponse = {
    longitude: [],
    latitude: [],
    z: []
  };

  for (const data of filtered) {
    mergedData.longitude.push(...data.longitude);
    mergedData.latitude.push(...data.latitude);
    mergedData.z.push(...data.z);
  }

  // Determine the height of the shoreline by taking the average height of all points on the edge of the lake
  // Some of the returned points aren't actually over water, so we can't just take a max height because it could be hundreds of meters wrong

  // To determine which points are on the edge, we map the coordinates into an 2D array, then find all points that do not have 4 (8?) neighbours.
  const shoreline = getShorelineHeight(mergedData);
  console.log("Shoreline height:", shoreline);

  return mergedData;
}

async function fetchBathymetryData(
  polygons: GeoJSON.Polygon[],
  polygonBoundingBoxes: GeoJSON.Polygon[]
): Promise<BathymetryResponse> {
  // https://github.com/cywhale/gebco
  const polygonRes = polygonBoundingBoxes.map((polygon) =>
    $fetch<BathymetryResponse>(
      `https://api.odb.ntu.edu.tw/gebco?mode=zonly&jsonsrc=${JSON.stringify(polygon)}`
    )
  );

  try {
    const polygonData = await Promise.all(polygonRes);

    // Filter the response to only include points that are contained within their original polygons
    return filterAndMergeBathymetryData(polygonData, polygons);
  } catch (error) {
    console.log(error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch bathymetry data",
      data: error
    });
  }
}

function getShorelineHeight(bathymetry: BathymetryResponse): number {
  // 1) Map to 2D grid
  const obj = bathymetry.latitude.map((lat, index) => {
    return {
      lat,
      lng: bathymetry.longitude[index]!,
      z: bathymetry.z[index]!
    };
  });

  const uniqueLng = [...new Set(bathymetry.longitude)].sort((a, b) => a - b);

  const sorted = obj.toSorted((a, b) => b.lat - a.lat || a.lng - b.lng);

  const grid: number[][] = [];
  let nextRow: number[] = Array(uniqueLng.length).fill(NaN);

  let lastLngId = -1;
  for (const point of sorted) {
    const lngId = uniqueLng.findIndex((lng) => lng === point.lng);

    if (lngId <= lastLngId) {
      grid.push(nextRow);
      nextRow = Array(uniqueLng.length).fill(NaN);
      lastLngId = -1;
    }

    nextRow[lngId] = point.z;
    lastLngId = lngId;
  }
  grid.push(nextRow);

  // 2) Find all edge points, i.e. points that have at least one NaN neighbour

  // Start by just finding coordinates without values
  // This simplifies the logic a log, since we don't have to worry about edge cases of out-of-bounds array indices within the loop.
  // Once we have the coordinate list, we can just filter out OOB coords and then map to values
  const edgePoints: Set<string> = new Set();
  grid.forEach((row, rowId) => {
    row.forEach((z, colId) => {
      if (isNaN(z)) {
        edgePoints.add(`${rowId - 1},${colId}`); // Up
        edgePoints.add(`${rowId + 1},${colId}`); // Down
        edgePoints.add(`${rowId},${colId - 1}`); // Left
        edgePoints.add(`${rowId},${colId + 1}`); // Right

        // TODO diag?
      }
    });
  });

  // 3) Take the mean of all edge points as the shoreline height, filtering out OOB edge points from above
  const edgeValues = [...edgePoints]
    .map((coord) => coord.split(",").map(Number) as [row: number, col: number])
    .filter(([row, col]) => {
      return row >= 0 && row < grid.length && col >= 0 && col < grid[0]!.length;
    })
    .map(([row, col]) => grid[row]![col]!)
    .filter((z) => !isNaN(z));

  return median(edgeValues);
}
