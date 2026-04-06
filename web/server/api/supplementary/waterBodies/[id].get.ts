import z4 from "zod/v4";
import MapWaterBody from "~~/server/models/MapWaterBody";
import {
  getBathymetryData,
  MapWaterBodyType
} from "~~/server/utils/bathymetry";
import { zodMongooseObjectId } from "~~/shared/utils/zod";

export const getWaterBodyRouteSchema = z4.object({
  id: zodMongooseObjectId
});

const queryParamSchema = z4.object({
  includeBathymetry: z4.coerce.boolean().default(false),
  bustBathymetryCache: z4.coerce.boolean().default(false)
});

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(
    event,
    getWaterBodyRouteSchema.parse
  );

  const { includeBathymetry, bustBathymetryCache } = await getValidatedQuery(
    event,
    queryParamSchema.parse
  );

  const body = await MapWaterBody.findById(id);

  if (!body) {
    throw createError({
      statusCode: 404,
      message: "Water body not found"
    });
  }

  if (!includeBathymetry && body.depthBathymetry) {
    body.depthBathymetry = undefined;
  }

  if (includeBathymetry && (!body.depthBathymetry || bustBathymetryCache)) {
    const bathymetryData = await getBathymetryData(body as MapWaterBodyType);
    body.depthBathymetry = bathymetryData;
    await body.save();
  }

  return body.toObject();
});
