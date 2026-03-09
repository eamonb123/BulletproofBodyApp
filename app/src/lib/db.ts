import path from "path";

export const DB_PATH = process.env.DB_PATH
  ?? path.join(process.cwd(), "..", "bulletproof_body.db");
