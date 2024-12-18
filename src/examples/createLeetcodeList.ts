import puppeteer from "puppeteer";
const credentials = {
  username: "rahulguptasde@gmail.com",
  password: "5001000bnd",
};
const scrape = async () => {
  const pageLink = "https://leetcode.com";
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
  // click on sign in link
  await page.waitForSelector('a[href="/accounts/login/"]');
  await page.click('a[href="/accounts/login/"]');

  // Wait for login form and fill credentials
  await page.waitForSelector('input[name="login"]');
  await page.type('input[name="login"]', credentials.username);
  await page.type('input[name="password"]', credentials.password);

  // Optional: Add login button click
  //   await page.click('button[type="submit"]');

  //   await browser.close();
};
scrape();
