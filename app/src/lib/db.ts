import path from "path";
import fs from "fs";

function resolveDbPath(): string {
  if (process.env.DB_PATH && fs.existsSync(process.env.DB_PATH)) {
    return process.env.DB_PATH;
  }
  // Local dev: DB is one level up from app/
  const localPath = path.join(process.cwd(), "..", "bulletproof_body.db");
  if (fs.existsSync(localPath)) return localPath;
  // Render: DB is in the repo root (rootDir=app, so ../bulletproof_body.db)
  const renderPath = path.resolve("/opt/render/project/src/bulletproof_body.db");
  if (fs.existsSync(renderPath)) return renderPath;
  // Fallback
  return localPath;
}

export const DB_PATH = resolveDbPath();
