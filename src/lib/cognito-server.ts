import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  GlobalSignOutCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { createHmac } from "crypto";

const client = new CognitoIdentityProviderClient({ region: process.env.COGNITO_REGION! });

function secretHash(username: string): string {
  return createHmac("sha256", process.env.COGNITO_CLIENT_SECRET!)
    .update(username + process.env.COGNITO_CLIENT_ID!)
    .digest("base64");
}

export async function serverSignUp(params: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  middleName: string;
  country: string;
}) {
  const email = params.email.trim().toLowerCase();
  await client.send(new SignUpCommand({
    ClientId: process.env.COGNITO_CLIENT_ID!,
    SecretHash: secretHash(email),
    Username: email,
    Password: params.password,
    UserAttributes: [
      { Name: "email", Value: email },
      { Name: "given_name", Value: params.firstName },
      { Name: "family_name", Value: params.lastName },
      { Name: "custom:country", Value: params.country },
      { Name: "custom:middleName", Value: params.middleName },
    ],
  }));
}

export async function serverConfirmSignUp(email: string, code: string) {
  const normalized = email.trim().toLowerCase();
  await client.send(new ConfirmSignUpCommand({
    ClientId: process.env.COGNITO_CLIENT_ID!,
    SecretHash: secretHash(normalized),
    Username: normalized,
    ConfirmationCode: code,
  }));
}

export async function serverResendCode(email: string) {
  const normalized = email.trim().toLowerCase();
  await client.send(new ResendConfirmationCodeCommand({
    ClientId: process.env.COGNITO_CLIENT_ID!,
    SecretHash: secretHash(normalized),
    Username: normalized,
  }));
}

export async function serverSignIn(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const result = await client.send(new InitiateAuthCommand({
    ClientId: process.env.COGNITO_CLIENT_ID!,
    AuthFlow: "USER_PASSWORD_AUTH",
    AuthParameters: {
      USERNAME: normalized,
      PASSWORD: password,
      SECRET_HASH: secretHash(normalized),
    },
  }));
  return result.AuthenticationResult!;
}

export async function serverRefreshTokens(refreshToken: string, username: string) {
  const result = await client.send(new InitiateAuthCommand({
    ClientId: process.env.COGNITO_CLIENT_ID!,
    AuthFlow: "REFRESH_TOKEN_AUTH",
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
      SECRET_HASH: secretHash(username),
    },
  }));
  return result.AuthenticationResult!;
}

export async function serverSignOut(accessToken: string) {
  await client.send(new GlobalSignOutCommand({ AccessToken: accessToken }));
}
