import { geoContains, GeoGeometryObjects } from "d3-geo";
import { mean, median } from "es-toolkit";
import { max } from "es-toolkit/compat";
import { HydratedDocument } from "mongoose";
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

type MapWaterBodyType = HydratedDocument<InstanceType<typeof MapWaterBody>>;

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
    waterBody as MapWaterBodyType,
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
  waterBody: MapWaterBodyType,
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

  const shoreline = waterBody.surfaceElevationM;
  // Adjust all points z-value to be relative to the shoreline, clamped at 0 (none of the points should be above sea level)
  mergedData.z = mergedData.z.map((z) => Math.min(z - shoreline, 0));

  const volume =
    mergedData.z.reduce((acc, z) => acc + Math.abs(z) * 500 * 500, 0) * 10; // Each point represents a 500m x 500m area, so we can multiply the depth by that to get a volume, then sum it all up

  console.log("Shoreline height (meters):", shoreline);
  console.log("Estimated volume (cubic meters):", volume);

  return mergedData;
}

async function fetchBathymetryData(
  waterBody: MapWaterBodyType,
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
    return filterAndMergeBathymetryData(waterBody, polygonData, polygons);
  } catch (error) {
    console.log(error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch bathymetry data",
      data: error
    });
  }
}
