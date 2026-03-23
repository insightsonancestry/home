import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

interface ProcessingStackProps extends cdk.StackProps {
  bucket: s3.IBucket;
}

export class ProcessingStack extends cdk.Stack {
  public readonly processingFn: lambda.IFunction;

  constructor(scope: Construct, id: string, props: ProcessingStackProps) {
    super(scope, id, props);

    const repo = ecr.Repository.fromRepositoryName(this, "ProcessingRepo", "ioa-admixtools");

    this.processingFn = new lambda.DockerImageFunction(this, "ProcessingFn", {
      functionName: "ioa-processing",
      code: lambda.DockerImageCode.fromEcr(repo, { tagOrDigest: "latest" }),
      architecture: lambda.Architecture.X86_64,
      memorySize: 3008,
      timeout: cdk.Duration.minutes(10),
      ephemeralStorageSize: cdk.Size.mebibytes(10240),
      reservedConcurrentExecutions: 10,
      environment: {
        BUCKET_NAME: props.bucket.bucketName,
      },
    });

    props.bucket.grantReadWrite(this.processingFn);
  }
}
