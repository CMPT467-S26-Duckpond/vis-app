import z4 from "zod/v4";
import MapWaterBody from "~~/server/models/MapWaterBody";
import { zodMongooseObjectId } from "~~/shared/utils/zod";

import { getBathymetryData, MapWaterBodyType } from "./bathymetry.get";

export const getWaterBodyRouteSchema = z4.object({
  id: zodMongooseObjectId
});

const queryParamSchema = z4.object({
  includeBathymetry: z4.coerce.boolean().default(false)
});

export default defineCachedEventHandler(
  async (event) => {
    const { id } = await getValidatedRouterParams(
      event,
      getWaterBodyRouteSchema.parse
    );

    const { includeBathymetry } = await getValidatedQuery(
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

    const bathymetryData = includeBathymetry
      ? await getBathymetryData(body as MapWaterBodyType)
      : null;

    return {
      bodyData: body.toObject(),
      bathymetryData
    };
  },
  {
    maxAge: 60 * 60 // Cache for 1 hour
  }
);
