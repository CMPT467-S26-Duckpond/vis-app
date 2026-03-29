import mongoose from "mongoose";

export default defineNitroPlugin(async (nitro) => {
  const config = useRuntimeConfig();

  try {
    await mongoose.connect(config.mongo.uri);
    console.log("DB connection established.");
  } catch (err) {
    console.error("DB connection failed.", err);
  }

  nitro.hooks.hook("close", () => {
    mongoose.connection.close();
    console.log("DB connection closed.");
  });
});
