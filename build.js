const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const basePath = "src";

function getAllFilesInFolder(folderPath, filesArray = []) {
  const files = fs.readdirSync(folderPath);

  files.forEach(file => {
    const filePath = path.join(folderPath, file).replace(/\\/g, '/');
    const stats = fs.statSync(filePath);

    if (stats.isDirectory())
      getAllFilesInFolder(filePath, filesArray);
    else
      if(filePath.endsWith('.ts') || filePath.endsWith('.js'))
        filesArray.push(filePath);
  });
  return filesArray;
}

// Run Build
const start = Date.now();
const out = esbuild.buildSync({
  entryPoints: getAllFilesInFolder(basePath),
  minify: true,
  minifyIdentifiers: true,
  minifySyntax: true,
  minifyWhitespace: true,
  platform: "node",
  format: "cjs",
  packages: "external",
  sourcemap: true,
  metafile: true,
  outdir: "dist",
});
if(out.errors.length > 0)
  console.error(`Build Failed: ${JSON.stringify(out.errors)}`);
const end = Date.now();

// Copy over config.json
fs.copyFileSync(path.join(basePath, "config.json"), path.join("dist", "config.json"));

// Compute build size
let buildSize = 0;
const sizeUnits = ["bytes", "KB", "MB", "GB", "TB", "Yeah Not gonna happen"];
let sizeUnitIndex = 0;
if(out.metafile?.outputs)
  for (const file of Object.keys(out.metafile.outputs))
    buildSize += out.metafile.outputs[file].bytes;
while (buildSize > 1024) {
  buildSize /= 1024;
  sizeUnitIndex++;
}

console.log(`Build Success! Took ${end-start}ms with size: ${(buildSize).toFixed(2)} ${sizeUnits[sizeUnitIndex]}`);