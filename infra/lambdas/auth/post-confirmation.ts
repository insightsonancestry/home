import { PostConfirmationConfirmSignUpTriggerEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function sanitize(input: string | undefined): string {
  return (input || "").trim().replace(/[<>"'&]/g, "").slice(0, 100);
}

export const handler = async (event: PostConfirmationConfirmSignUpTriggerEvent) => {
  const attrs = event.request.userAttributes;

  if (!attrs.sub || !attrs.email) {
    console.error("Missing required attributes:", JSON.stringify({ sub: !!attrs.sub, email: !!attrs.email }));
    return event;
  }

  try {
    await client.send(new PutCommand({
      TableName: process.env.USERS_TABLE!,
      Item: {
        userId: attrs.sub,
        email: attrs.email.trim().toLowerCase(),
        firstName: sanitize(attrs.given_name),
        lastName: sanitize(attrs.family_name),
        middleName: sanitize(attrs["custom:middleName"]),
        country: sanitize(attrs["custom:country"]),
        sampleCount: 0,
        createdAt: new Date().toISOString(),
      },
      ConditionExpression: "attribute_not_exists(userId)",
    }));
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      console.info("User already exists in DynamoDB, skipping (likely a retry)");
    } else {
      throw err;
    }
  }

  return event;
};
