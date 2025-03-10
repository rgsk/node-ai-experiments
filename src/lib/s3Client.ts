import { S3 } from "@aws-sdk/client-s3";
import environmentVars from "./environmentVars.js";

export const s3ClientRegion = "us-east-1";
export const s3ClientBuckets = {
  default: "c08a1eeb-cb81-4c3c-9a11-f616ffd8e042",
  public: "pubbuckrah",
};

const s3Client = new S3({
  region: s3ClientRegion,
  credentials: {
    accessKeyId: environmentVars.AWS_ACCESS_KEY,
    secretAccessKey: environmentVars.AWS_SECRET_ACCESS_KEY,
  },
});
export default s3Client;
