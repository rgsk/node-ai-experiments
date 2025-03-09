import fs from "fs";
import { google } from "googleapis";
import readline from "readline";

// If modifying these scopes, delete token.json.
const SCOPES = [
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/spreadsheets",
];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.

import path from "path";

const TOKEN_PATH = path.join(process.cwd(), "credentials-gcp-token.json");

// download the credentials.json file and save it in current folder
const CREDENTIALS_PATH = path.join(
  process.cwd(),
  "credentials-gcp-client-secret.json"
);
const credentialsBuffer = fs.readFileSync(CREDENTIALS_PATH);
const credentials = JSON.parse(credentialsBuffer.toString());

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.web;
  const oAuth2Client = new google.auth.OAuth2({
    clientId: client_id,
    clientSecret: client_secret,
    redirectUri: redirect_uris[0],
  });

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, buffer) => {
    if (err) {
      return getAccessToken(oAuth2Client, callback);
    }
    const token = buffer.toString();
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
  console.log("Authorize this app by visiting this url:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question("Enter the code from that page here: ", (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) {
        return console.error("Error retrieving access token", err);
      }
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) {
          return console.error(err);
        }
        console.log("Token stored to", TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

const getGoogleAuth = async () => {
  return new Promise((resolve) => {
    authorize(credentials, (auth) => {
      resolve(auth);
    });
  });
};

export default getGoogleAuth;
