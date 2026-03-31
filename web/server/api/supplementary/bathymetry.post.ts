import { z } from "zod/v4";
import MapWaterBody from "~~/server/models/MapWaterBody";
import { zodMongooseObjectId } from "~~/shared/utils/zod";
import { geoContains, GeoGeometryObjects } from "d3-geo"

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

  const polygons = coords.geometry.coordinates.map<GeoJSON.Polygon>(
    (polygonCoords) => ({
      type: "Polygon",
      coordinates: polygonCoords!
    })
  );

  // The API seems to not quite handle polygon areas correctly leading to some inaccuracies on what points it returns
  // That means, we'll need to do that part by hand
  // So, to make sure we get depth data for the entire lake. We'll simplify each of the lake's polygons into a square. Compute the square, and then determine intersection after we have the whole dataset

  const simplifiedPolygons = polygons.map((polygon) => {
    const [minLng, minLat, maxLng, maxLat] = polygon.coordinates[0]!.reduce(
      (acc, [lng, lat]) => {
        acc[0] = Math.min(acc[0]!, lng!);
        acc[1] = Math.min(acc[1]!, lat!);
        acc[2] = Math.max(acc[2]!, lng!);
        acc[3] = Math.max(acc[3]!, lat!);
        return acc;
      },
      [Infinity, Infinity, -Infinity, -Infinity]
    );

    return {
      type: "Polygon",
      coordinates: [
        [
          [minLng, minLat],
          [maxLng, minLat],
          [maxLng, maxLat],
          [minLng, maxLat],
          [minLng, minLat]
        ]
      ]
    }
  });

  try {
    // https://github.com/cywhale/gebco
    const polygonRes = simplifiedPolygons.map((polygon) =>
      $fetch<BathymetryResponse>(
        `https://api.odb.ntu.edu.tw/gebco?mode=zonly&jsonsrc=${JSON.stringify(polygon)}`
      )
    );

    const polygonData = await Promise.all(polygonRes);

    // Filter the response to only include points that are contained within their original polygons
    // Hopefully d3-implementation of this is more accurate than the API's
    const filteredResponse = polygonData.map((data, index) => {
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
    })

    // Merge the data from multiple polygons into one response
    const mergedData: BathymetryResponse = {
      longitude: [],
      latitude: [],
      z: []
    };

    for (const data of filteredResponse) {
      mergedData.longitude.push(...data.longitude);
      mergedData.latitude.push(...data.latitude);
      mergedData.z.push(...data.z);
    }

    return mergedData;
  } catch (error) {
    console.log(error)
    throw createError({
      statusCode: 500,
      message: "Failed to fetch bathymetry data",
      data: error
    });
  }
});
