import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }),
);

const TABLE = process.env.RATE_LIMIT_TABLE || "ioa-rate-limits";

interface RateLimiterConfig {
  name: string;
  windowMs: number;
  max: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

interface RateLimiter {
  check: (key: string) => Promise<RateLimitResult>;
  reset: (key: string) => Promise<void>;
}

export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  return {
    async check(key: string): Promise<RateLimitResult> {
      const now = Date.now();
      const windowBucket = Math.floor(now / config.windowMs);
      const pk = `${config.name}#${key}#${windowBucket}`;
      const ttl = Math.floor(now / 1000) + Math.ceil(config.windowMs / 1000) + 60;

      try {
        const result = await client.send(new UpdateCommand({
          TableName: TABLE,
          Key: { pk },
          UpdateExpression: "ADD #count :inc SET #ttl = :ttl",
          ConditionExpression: "attribute_not_exists(#count) OR #count < :max",
          ExpressionAttributeNames: { "#count": "count", "#ttl": "ttl" },
          ExpressionAttributeValues: { ":inc": 1, ":ttl": ttl, ":max": config.max },
          ReturnValues: "ALL_NEW",
        }));

        const count = result.Attributes?.count as number;
        return {
          allowed: true,
          remaining: config.max - count,
          retryAfterMs: 0,
        };
      } catch (err: unknown) {
        if ((err as { name?: string }).name === "ConditionalCheckFailedException") {
          const windowStartMs = windowBucket * config.windowMs;
          const windowEndMs = windowStartMs + config.windowMs;
          const retryAfterMs = Math.max(0, windowEndMs - now);
          return { allowed: false, remaining: 0, retryAfterMs };
        }
        console.error("Rate limit check failed, blocking request:", err);
        return { allowed: false, remaining: 0, retryAfterMs: 5000 };
      }
    },

    async reset(key: string): Promise<void> {
      const now = Date.now();
      const windowBucket = Math.floor(now / config.windowMs);
      const pk = `${config.name}#${key}#${windowBucket}`;

      try {
        await client.send(new DeleteCommand({
          TableName: TABLE,
          Key: { pk },
        }));
      } catch (err) {
        console.error("Rate limit reset failed:", err);
      }
    },
  };
}

export function getIpFromRequest(req: Request): string {
  // x-real-ip: set by Vercel/trusted proxies to the actual client IP (not spoofable)
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  // Fallback: rightmost entry in x-vercel-forwarded-for (platform-appended, trustworthy)
  const vercelForwarded = req.headers.get("x-vercel-forwarded-for");
  if (vercelForwarded) {
    const parts = vercelForwarded.split(",");
    return parts[parts.length - 1].trim();
  }

  // "unknown" is fail-closed — all unknowns share one rate-limit bucket
  return "unknown";
}
