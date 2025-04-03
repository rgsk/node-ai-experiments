import { S3 } from "@aws-sdk/client-s3";
import environmentVars from "./environmentVars.js";

export const s3ClientRegion = "us-east-1";
export const s3ClientBuckets = {
  private: "private-ai-exp",
  public: "public-ai-exp",
};

const s3Client = new S3({
  region: s3ClientRegion,
  credentials: {
    accessKeyId: environmentVars.AWS_ACCESS_KEY,
    secretAccessKey: environmentVars.AWS_SECRET_ACCESS_KEY,
  },
});
export default s3Client;
