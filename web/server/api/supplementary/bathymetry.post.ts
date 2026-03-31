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

  const polygons = coords.geometry.coordinates.map<GeoJSON.Polygon>(
    (polygonCoords) => ({
      type: "Polygon",
      coordinates: polygonCoords!
    })
  );

  try {
    // https://github.com/cywhale/gebco
    const polygonRes = polygons.map((polygon) =>
      $fetch<BathymetryResponse>(
        `https://api.odb.ntu.edu.tw/gebco?mode=zonly&jsonsrc=${JSON.stringify(polygon)}`
      )
    );

    const polygonData = await Promise.all(polygonRes);

    // Merge the data from multiple polygons into one response
    const mergedData: BathymetryResponse = {
      longitude: [],
      latitude: [],
      z: []
    };

    for (const data of polygonData) {
      mergedData.longitude.push(...data.longitude);
      mergedData.latitude.push(...data.latitude);
      mergedData.z.push(...data.z);
    }

    return mergedData;
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: "Failed to fetch bathymetry data",
      cause: error
    });
  }
});
