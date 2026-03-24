import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { writeFileSync, existsSync, symlinkSync } from "fs";
import { pathToFileURL } from "url";

const HANDLER_PATH = "/tmp/handler.mjs";
let handlerFn;

export const handler = async (event) => {
  if (!handlerFn) {
    if (!existsSync(HANDLER_PATH)) {
      try {
        const s3 = new S3Client({});
        const res = await s3.send(new GetObjectCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: process.env.HANDLER_S3_KEY,
        }));
        const body = await res.Body.transformToString();
        writeFileSync(HANDLER_PATH, body);
        console.log("Handler downloaded from S3");
      } catch (err) {
        console.error("Failed to download handler from S3:", err.message);
        throw new Error("Bootstrap failed: could not download handler");
      }
    }
    if (!existsSync("/tmp/node_modules")) {
      symlinkSync("/var/task/node_modules", "/tmp/node_modules");
    }
    const mod = await import(pathToFileURL(HANDLER_PATH).href);
    handlerFn = mod.handler;
  }
  return handlerFn(event);
};
