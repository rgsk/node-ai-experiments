import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { secondsInDay, secondsInHour } from "date-fns/constants";
import s3Client from "../lib/s3Client.js";

export async function getUploadURL({
  key,
  bucket,
}: {
  key: string;
  bucket: string;
}) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, {
    expiresIn: secondsInHour,
  });

  return url;
}

export const getUrlFromUploadUrl = (uploadUrl: string) => {
  return uploadUrl.split("?")[0];
};

export const createPresignedUrlWithClient = ({
  bucket,
  key,
}: {
  bucket: string;
  key: string;
}) => {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn: secondsInDay });
};

export const decomposeS3Url = (url: string) => {
  // Define the regex pattern
  const pattern: RegExp =
    /^https:\/\/(?<bucket>[\w.-]+)\.s3\.(?<region>[\w-]+)\.amazonaws\.com\/(?<key>.+)$/;

  // Match the pattern against the URL
  const match: RegExpMatchArray | null = url.match(pattern);

  // Extract the values
  if (match) {
    const bucket: string = match.groups?.bucket ?? "";
    const region: string = match.groups?.region ?? "";
    const key: string = match.groups?.key ?? "";

    return {
      bucket,
      region,
      key,
    };
  } else {
    throw new Error("No match found.");
  }
};

export const getPresignedUrl = async (url: string) => {
  const { bucket, key } = decomposeS3Url(url);
  const presignedUrl = await createPresignedUrlWithClient({
    bucket,
    key,
  });
  return presignedUrl;
};

export async function deleteObject({
  bucket,
  key,
}: {
  bucket: string;
  key: string;
}) {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return s3Client.send(command);
}

export async function deleteS3Url(url: string) {
  const urlWithoutQueryParams = url.split("?")[0];
  const { bucket, key } = decomposeS3Url(urlWithoutQueryParams);
  return deleteObject({ bucket, key });
}
