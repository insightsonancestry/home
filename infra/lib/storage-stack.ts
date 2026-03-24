import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

export class StorageStack extends cdk.Stack {
  public readonly referenceDataBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const isProd = process.env.NODE_ENV === "production";

    this.referenceDataBucket = new s3.Bucket(this, "IoaReferenceDataBucket", {
      bucketName: "ioa-reference-data",
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT],
          allowedOrigins: isProd
            ? ["https://insightsonancestry.com", "https://www.insightsonancestry.com"]
            : ["http://localhost:3000", "http://localhost:3001", "https://insightsonancestry.com"],
          allowedHeaders: ["Content-Type", "x-amz-content-sha256"],
          maxAge: 3600,
        },
      ],
      lifecycleRules: [
        {
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
        },
      ],
    });

    // Upload size (50 MB) is enforced via presigned URL ContentLength signature
    // in src/lib/s3.ts. S3 bucket policies don't support content-length conditions.
  }
}
