import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseDatasetImport } from "../src/domain/index";
const filenames = process.argv.slice(2);
for (const filename of filenames.length ? filenames : ["src/data/demo.json"]) {
  const result = parseDatasetImport(readFileSync(resolve(filename), "utf8"));
  if (result.success)
    console.log(
      `${filename}: valid ${result.data.mode} dataset, ${result.data.items.length} items, ${result.data.stores.length} stores, ${result.data.observations.length} observations.`,
    );
  else {
    console.error(
      `${filename}: invalid dataset\n${result.errors.map((error) => `${error.path}: ${error.message}`).join("\n")}`,
    );
    process.exitCode = 1;
  }
}
