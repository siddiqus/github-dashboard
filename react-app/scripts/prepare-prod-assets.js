import fs from "fs";
import path from "path";

function getReactFiles() {
  const assetFiles = fs.readdirSync("./dist/assets");

  const jsFileName = assetFiles.find((a) => a.includes("js"));
  const cssFileName = assetFiles.find((a) => a.includes("css"));

  const jsFile = fs.readFileSync(`./dist/assets/${jsFileName}`).toString();
  const cssFile = fs.readFileSync(`./dist/assets/${cssFileName}`).toString();

  return {
    jsFile,
    cssFile,
  };
}

async function run() {
  const jsPath = path.join("public-assets", "script.js");
  const cssPath = path.join("public-assets", "styles.css");

  if (!fs.existsSync("public-assets")) {
    fs.mkdirSync("public-assets");
  }

  const { cssFile, jsFile } = getReactFiles();
  fs.writeFileSync(jsPath, jsFile);
  fs.writeFileSync(cssPath, cssFile);
}

run()
  .then(() => {
    console.log("done");
    process.exit(0);
  })
  .catch((err) => {
    console.log("error", err);
    process.exit(1);
  });
