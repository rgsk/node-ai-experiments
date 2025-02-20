import fs from "fs";
import multer from "multer";
import { v4 } from "uuid";
// Set up disk storage with multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Specify the directory where files will be saved
    // if uploads directory does not exist create it

    const dir = "uploads";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // file name must be unique to avoid collisions
    cb(null, v4() + "--" + file.originalname);
  },
});
export const upload = multer({ storage: storage }); // Store file in memory as a buffer
