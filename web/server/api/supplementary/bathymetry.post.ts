import { z } from "zod/v4";

const zLat = z.number().min(-90).max(90);
const zLon = z.number().min(-180).max(180);

const latLonSchema = z.object({
  // Min max or single value
  lat: z.tuple([zLat, zLat]).or(zLat),
  lon: z.tuple([zLon, zLon]).or(zLon)
});

export type BathymetryResponse = {
  longitude: number;
  latitude: number;
  /**
   * Height of the point relative to sea level in meters. 0 Represents sea level, positive values represent above sea level, and negative values represent below sea level.
   */
  z: number;
  /**
   * Error distance. Generally don't worry about this for our case
   */
  distance: number;
}[];

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, latLonSchema.parse);

  const lonStr = Array.isArray(body.lon)
    ? body.lon.join(",")
    : body.lon.toString();
  const latStr = Array.isArray(body.lat)
    ? body.lat.join(",")
    : body.lat.toString();

  try {
    return $fetch<BathymetryResponse>(
      `https://api.odb.ntu.edu.tw/gebco?lon=${lonStr}&lat=${latStr}&mode=row`
    );
  } catch (error) {
    return createError({
      statusCode: 500,
      message: "Failed to fetch bathymetry data",
      cause: error
    });
  }
});
