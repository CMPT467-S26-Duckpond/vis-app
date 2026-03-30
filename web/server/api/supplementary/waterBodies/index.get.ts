import MapWaterBody from "~~/server/models/MapWaterBody";

export default defineEventHandler(async () => {
  // Returns a list of all lakes with their names and coordinates.
  const appConfig = useAppConfig();

  const res = await MapWaterBody.find(
    {
      surfaceArea: { $gte: appConfig.waterFeatureMinArea }
    },
    { name: 1, position: 1, _id: 1 }
  ).lean();

  if (!res) {
    throw createError({
      statusCode: 404,
      message: "No water bodies found"
    });
  }

  return res;
});
