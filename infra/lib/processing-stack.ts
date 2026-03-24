import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

interface ProcessingStackProps extends cdk.StackProps {
  bucket: s3.IBucket;
  samplesTable: dynamodb.ITable;
}

export class ProcessingStack extends cdk.Stack {
  public readonly processingFn: lambda.IFunction;

  constructor(scope: Construct, id: string, props: ProcessingStackProps) {
    super(scope, id, props);

    const repo = ecr.Repository.fromRepositoryName(this, "ProcessingRepo", "ioa-admixtools");

    this.processingFn = new lambda.DockerImageFunction(this, "ProcessingFn", {
      functionName: "ioa-processing",
      code: lambda.DockerImageCode.fromEcr(repo, {
        tagOrDigest: "sha256:029e5fab55dcccf0bf993ff3b71853c3b1e4e21686770386a23135552e4fdaf8",
      }),
      architecture: lambda.Architecture.X86_64,
      memorySize: 3008,
      timeout: cdk.Duration.seconds(570),
      ephemeralStorageSize: cdk.Size.mebibytes(10240),
      reservedConcurrentExecutions: 10,
      environment: {
        BUCKET_NAME: props.bucket.bucketName,
        HANDLER_S3_KEY: "lambda/handler.mjs",
        SAMPLES_TABLE: props.samplesTable.tableName,
      },
    });

    // Scoped S3 permissions — read-only for reference data + tools, read-write for user data
    const fnRole = this.processingFn.role!;
    fnRole.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: ["s3:GetObject"],
      resources: [
        props.bucket.arnForObjects("v62_1240k/*"),
        props.bucket.arnForObjects("v62_HO/*"),
        props.bucket.arnForObjects("tools/*"),
        props.bucket.arnForObjects("lambda/*"),
      ],
    }));
    fnRole.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: ["s3:GetObject", "s3:PutObject"],
      resources: [
        props.bucket.arnForObjects("*/rawfiles/*"),
        props.bucket.arnForObjects("*/qpadm/*"),
      ],
    }));

    props.samplesTable.grantReadWriteData(this.processingFn);
  }
}
