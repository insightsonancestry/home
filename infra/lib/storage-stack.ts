import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export class StorageStack extends cdk.Stack {
  public readonly referenceDataBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.referenceDataBucket = new s3.Bucket(this, "IoaReferenceDataBucket", {
      bucketName: "ioa-reference-data",
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT],
          allowedOrigins: ["http://localhost:3000", "http://localhost:3001", "https://insightsonancestry.com"],
          allowedHeaders: ["*"],
          maxAge: 3600,
        },
      ],
      lifecycleRules: [
        {
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
        },
      ],
    });

    // Bucket structure:
    // v62_1240K/          — 1240K reference dataset
    // v62_HO/             — HO reference dataset
    // {userId}/rawfiles/  — user uploaded raw files (max 3 per user)
  }
}
