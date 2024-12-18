import * as cheerio from "cheerio";
import puppeteer from "puppeteer";

const scrapeGfgDsa = async () => {
  const gfgPageLink =
    "https://www.geeksforgeeks.org/top-100-data-structure-and-algorithms-dsa-interview-questions-topic-wise/";
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      // '--start-maximized', // you can also use '--start-fullscreen'
    ],
  });
  const page = (await browser.pages())[0];
  await page.setViewport({ width: 1300, height: 768 });
  await page.goto(gfgPageLink, {
    timeout: 0, // to disable timeout
  });
  const pageContent = await page.content();
  const $ = cheerio.load(pageContent);
  const children = $("#table_of_content").children();
  console.log(children);
};
scrapeGfgDsa();
