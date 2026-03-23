import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import { Construct } from "constructs";

interface AuthStackProps extends cdk.StackProps {
  usersTable: dynamodb.ITable;
}

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    // Lambda: runs after Cognito confirms a user, saves profile to DynamoDB
    const postConfirmation = new NodejsFunction(this, "PostConfirmation", {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../lambdas/auth/post-confirmation.ts"),
      handler: "handler",
      environment: {
        USERS_TABLE: props.usersTable.tableName,
      },
      timeout: cdk.Duration.seconds(10),
    });

    props.usersTable.grantWriteData(postConfirmation);

    const customMessage = new NodejsFunction(this, "CustomMessage", {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../lambdas/auth/custom-message.ts"),
      handler: "handler",
      timeout: cdk.Duration.seconds(5),
    });

    // Cognito User Pool
    this.userPool = new cognito.UserPool(this, "IoaUserPool", {
      userPoolName: "ioa-users",
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: false },
        givenName: { required: true, mutable: true },
        familyName: { required: true, mutable: true },
      },
      customAttributes: {
        country: new cognito.StringAttribute({ mutable: true }),
        middleName: new cognito.StringAttribute({ mutable: true }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lambdaTriggers: {
        postConfirmation,
        customMessage,
      },
    });

    // Server-side client (with secret — used by API routes, never exposed to browser)
    this.userPoolClient = this.userPool.addClient("IoaServerClient", {
      userPoolClientName: "ioa-server-client",
      generateSecret: true,
      authFlows: {
        userPassword: true,
      },
      preventUserExistenceErrors: true,
    });

    // Outputs
    new cdk.CfnOutput(this, "UserPoolId", { value: this.userPool.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", { value: this.userPoolClient.userPoolClientId });
  }
}
