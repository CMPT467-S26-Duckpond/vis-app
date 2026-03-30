import { Types } from "mongoose";
import { z } from "zod/v4";

export const zodMongooseObjectId = z
  .string()
  .refine(Types.ObjectId.isValid, { abort: true })
  .transform((val) => new Types.ObjectId(val));
