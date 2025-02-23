const v = "6cf574d8-aaf9-4b95-92e0-bba4edf7bdda";

// replace non - character by _

const sanitized = v.replace(/[a-zA-Z0-9]/g, "_");
console.log(sanitized);

const vfds = {
  s3Url:
    "https://c08a1eeb-cb81-4c3c-9a11-f616ffd8e042.s3.us-east-1.amazonaws.com/39d149bd-7b2b-499d-a924-f07e64f4701b.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIATG6MGJ76MFBVY4PW%2F20250223%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250223T104113Z&X-Amz-Expires=86400&X-Amz-Signature=839a8ea9a3d1ec01c9129247ec4db58db887af85da75c0cd10e8821283332bb0&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject",
};
const sds = {
  s3Url:
    "https://c08a1eeb-cb81-4c3c-9a11-f616ffd8e042.s3.us-east-1.amazonaws.com/491a7d69-f540-4f12-a8bf-4be71bc0486d.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIATG6MGJ76MFBVY4PW%2F20250223%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250223T110752Z&X-Amz-Expires=86400&X-Amz-Signature=e4c069d7a641e0fcc0ce1e8f9a4a12bbfe2f874b981eb32925069ad56b02ae91&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject",
};
