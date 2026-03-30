import z4 from "zod/v4";
import MapWaterBody from "~~/server/models/MapWaterBody";
import { zodMongooseObjectId } from "~~/shared/utils/zod";

const routeSchema = z4.object({
  id: zodMongooseObjectId
});

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, routeSchema.parse);

  const body = await MapWaterBody.findById(id).lean();

  if (!body) {
    throw createError({
      statusCode: 404,
      message: "Water body not found"
    });
  }

  console.log(body);

  return body;
});
