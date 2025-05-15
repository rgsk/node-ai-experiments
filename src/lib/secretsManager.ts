import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import environmentVars from "./environmentVars.js";

const secretsManagerClient = new SecretsManagerClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: environmentVars.AWS_ACCESS_KEY,
    secretAccessKey: environmentVars.AWS_SECRET_ACCESS_KEY,
  },
});

export const getSecret = async (secretName: string) => {
  const response = await secretsManagerClient.send(
    new GetSecretValueCommand({
      SecretId: secretName,
    })
  );
  const secret = response.SecretString;
  return secret;
};
