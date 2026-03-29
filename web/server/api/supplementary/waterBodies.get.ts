import MapWaterBody from "~~/server/models/MapWaterBody";

export default defineEventHandler(async () => {
  // Returns a list of all lakes with their names and coordinates.
  const res = await MapWaterBody.find({}, { name: 1, position: 1, _id: 0 }).lean();

  if (!res) {
    throw createError({
      statusCode: 404,
      message: "No water bodies found"
    });
  }

  return res;
});
