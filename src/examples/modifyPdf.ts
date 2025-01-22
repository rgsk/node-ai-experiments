import fontkit from "@pdf-lib/fontkit";
import fs from "fs";
import path from "path";
import { PDFDocument, rgb } from "pdf-lib";
// Function to convert Hex to RGB
const hexToRgb = (hex: string) => {
  const cleanHex = hex.replace("#", "");
  // Handle shorthand hex (e.g., #RGB → #RRGGBB)
  const fullHex =
    cleanHex.length === 3
      ? cleanHex
          .split("")
          .map((c) => c + c)
          .join("")
      : cleanHex;

  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);

  const colorRgb = { r: r / 255, g: g / 255, b: b / 255 }; // Normalize for pdf-lib
  return rgb(colorRgb.r, colorRgb.g, colorRgb.b);
};

const main = async () => {
  const userName = "Rahul Gupta";
  const courseName = "Generative AI Masterclass";
  const firstPerson = {
    signature: "Saptarshi Prakash",
    name: "Saptarshi Prakash",
    designation: "Mentor",
  };
  const secondPerson = {
    signature: "Vaibhav Sisinity",
    name: "Vaibhav Sisinity",
    designation: "Founder, GrowthSchool",
  };
  // Create a new PDFDocument
  const pdfDoc = await PDFDocument.load(
    fs.readFileSync(path.join(__dirname, `/tmp/outskill-template.pdf`))
  );
  pdfDoc.registerFontkit(fontkit);

  // Embed the Times Roman font
  const figtreeBold = await pdfDoc.embedFont(
    fs.readFileSync(path.join(__dirname, `/tmp/Figtree-Bold.ttf`))
  );
  const figtreeRegular = await pdfDoc.embedFont(
    fs.readFileSync(path.join(__dirname, `/tmp/Figtree-Regular.ttf`))
  );
  const dancingScriptRegular = await pdfDoc.embedFont(
    fs.readFileSync(path.join(__dirname, `/tmp/DancingScript-Regular.otf`))
  );
  // Add a blank page to the document
  const page = pdfDoc.getPage(0);

  // Get the width and height of the page
  let { width, height } = page.getSize();
  const getYFromTop = (y: number) => {
    return height - 20 - y;
  };

  page.drawText(userName, {
    x: 64,
    y: getYFromTop(323),
    size: 16,
    font: figtreeBold,
    color: hexToRgb("#FFFFFF"),
  });
  page.drawText(courseName, {
    x: 265,
    y: getYFromTop(371),
    size: 16,
    font: figtreeBold,
    color: hexToRgb("#FFFFFF"),
  });
  const firstPersonAnchor = 150;
  const secondPersonAnchor = 450;
  page.drawText(firstPerson.signature, {
    x:
      firstPersonAnchor -
      dancingScriptRegular.widthOfTextAtSize(firstPerson.signature, 30) / 2,
    y: getYFromTop(566),
    size: 30,
    font: dancingScriptRegular,
    color: hexToRgb("#FFFFFF"),
  });
  page.drawText(secondPerson.signature, {
    x:
      secondPersonAnchor -
      dancingScriptRegular.widthOfTextAtSize(secondPerson.signature, 30) / 2,
    y: getYFromTop(566),
    size: 30,
    font: dancingScriptRegular,
    color: hexToRgb("#FFFFFF"),
  });
  page.drawText(firstPerson.name, {
    x:
      firstPersonAnchor -
      figtreeBold.widthOfTextAtSize(firstPerson.name, 16) / 2,
    y: getYFromTop(604),
    size: 16,
    font: figtreeBold,
    color: hexToRgb("#FFFFFF"),
  });

  page.drawText(secondPerson.name, {
    x:
      secondPersonAnchor -
      figtreeBold.widthOfTextAtSize(secondPerson.name, 16) / 2,
    y: getYFromTop(604),
    size: 16,
    font: figtreeBold,
    color: hexToRgb("#FFFFFF"),
  });

  page.drawText(firstPerson.designation, {
    x:
      firstPersonAnchor -
      figtreeRegular.widthOfTextAtSize(firstPerson.designation, 14) / 2,
    y: getYFromTop(631),
    size: 14,
    font: figtreeRegular,
    color: hexToRgb("#FFFFFF"),
  });

  page.drawText(secondPerson.designation, {
    x:
      secondPersonAnchor -
      figtreeRegular.widthOfTextAtSize(secondPerson.designation, 14) / 2,
    y: getYFromTop(631),
    size: 14,
    font: figtreeRegular,
    color: hexToRgb("#FFFFFF"),
  });

  // Serialize the PDFDocument to bytes (a Uint8Array)
  const pdfBytes = await pdfDoc.save();

  // For example, `pdfBytes` can be:
  //   • Written to a file in Node
  //   • Downloaded from the browser
  //   • Rendered in an <iframe>

  // For the purposes of this example, we write the bytes to a file
  fs.writeFileSync(path.join(__dirname, `/tmp/cert.pdf`), pdfBytes);
};
main();
