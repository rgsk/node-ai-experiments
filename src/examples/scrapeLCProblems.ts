import * as cheerio from "cheerio";
import fs from "fs";
import puppeteer from "puppeteer";
const scrape = async () => {
  const pageLink =
    "https://leetcode.com/discuss/study-guide/2546082/Leetcode-questions-for-SDE-Prep-for-FAANG(Links-are-topic-and-Difficulty-wise)";
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      // '--start-maximized', // you can also use '--start-fullscreen'
    ],
  });
  const page = (await browser.pages())[0];
  await page.setViewport({ width: 1300, height: 768 });
  await page.goto(pageLink, {
    timeout: 0, // to disable timeout
  });
  // wait for .discuss-markdown-container to load
  await page.waitForSelector(".discuss-markdown-container");
  // take contents of this class
  const pageContent = await page.content();
  const $ = cheerio.load(pageContent);
  // Use find() instead of children() to get all nested links
  const links = $(".discuss-markdown-container").find("a");
  // print href of all the links
  const leetcodeLinks: string[] = [];
  links.each((index, element) => {
    const href = $(element).attr("href");
    if (href && href.includes("leetcode.com/problems")) {
      leetcodeLinks.push(href);
    }
  });
  console.log("Total Leetcode Links: ", leetcodeLinks.length);
  console.log(leetcodeLinks);
  // save to text file
  fs.writeFileSync("leetcodeLinks.txt", leetcodeLinks.join("\n"));
  await browser.close();
};
scrape();
