const puppetter = require("puppeteer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

(async () => {
  const browser = await puppetter.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto("https://www.tus.si/#");

  await page
    .waitForSelector(".section-catalogue-and-magazines", { timeout: 10000 })
    .catch(() => {
      console.error(
        "Could not find element with class .section-catalogue-and-magazines"
      );
      return;
    });

  const catalogs = await page.evaluate(() => {
    const catalogElements = document.querySelectorAll(
      "div.card.card-catalogue"
    );
    return Array.from(catalogElements).map((catalog) => {
      const title = catalog.querySelector("h3").innerText;
      const link = catalog.querySelector('a[href$=".pdf"]').href;
      const date = catalog.querySelector("p").innerText;

      console.log(title);
      console.log(link);
      console.log(date);

      return { title, link, date };
    });
  });

  fs.writeFileSync("catalogs.json", JSON.stringify(catalogs, null, 2));

  console.log(catalogs);

  // Download the PDF files
  for (const catalog of catalogs) {
    const pdfPath = path.resolve(__dirname, "pdfFiles", `${catalog.title}.pdf`);
    const writer = fs.createWriteStream(pdfPath);

    const response = await axios({
      url: catalog.link,
      method: "GET",
      responseType: "stream",
    });

    response.data.pipe(writer);

    new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  }

  await browser.close();
})();
