#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { DatabaseStack } from "../lib/database-stack";
import { AuthStack } from "../lib/auth-stack";
import { StorageStack } from "../lib/storage-stack";
import { ProcessingStack } from "../lib/processing-stack";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const database = new DatabaseStack(app, "IoaDatabaseStack", { env });
new AuthStack(app, "IoaAuthStack", { env, usersTable: database.usersTable });
const storage = new StorageStack(app, "IoaStorageStack", { env });
new ProcessingStack(app, "IoaProcessingStack", { env, bucket: storage.referenceDataBucket });
