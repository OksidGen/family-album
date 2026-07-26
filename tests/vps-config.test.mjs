import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("uses standard Next.js scripts for VPS deployment", async () => {
  const packageJson = JSON.parse(await read("package.json"));

  assert.equal(packageJson.scripts.dev, "next dev");
  assert.equal(packageJson.scripts.build, "next build");
  assert.equal(packageJson.scripts.start, "next start");
  assert.equal(packageJson.scripts["start:standalone"], "node .next/standalone/server.js");
  assert.equal(packageJson.dependencies.next, "16.2.6");
  assert.equal(packageJson.devDependencies.vinext, undefined);
  assert.equal(packageJson.devDependencies.wrangler, undefined);
});

test("keeps uploaded photo storage on the VPS filesystem", async () => {
  const storage = await read("app/api/photos/storage.ts");
  const compose = await read("docker-compose.yml");
  const dockerfile = await read("Dockerfile");
  const envExample = await read(".env.example");

  assert.match(storage, /node:fs\/promises/);
  assert.match(storage, /FAMILY_ALBUM_DATA_DIR/);
  assert.match(storage, /folders\.json/);
  assert.match(storage, /deleteFolder/);
  assert.doesNotMatch(storage, /cloudflare:workers|D1Database|R2Bucket/);
  assert.match(compose, /family_album_data/);
  assert.match(dockerfile, /VOLUME \["\/data"\]/);
  assert.match(envExample, /FAMILY_CODE=/);
  assert.match(envExample, /ADMIN_CODE=/);
});

test("does not show demo photos after the unlocked album loads empty data", async () => {
  const page = await read("app/page.tsx");

  assert.match(page, /setPhotos\(serverPhotos\)/);
  assert.match(page, /setFolders\(serverFolders\)/);
  assert.doesNotMatch(page, /setPhotos\(serverPhotos\.length > 0 \? serverPhotos : starterPhotos\)/);
  assert.doesNotMatch(page, /setFolders\(serverFolders\.length > 0 \? serverFolders : defaultFolders\)/);
});

test("admin upload form supports selecting multiple photos", async () => {
  const adminPage = await read("app/admin/page.tsx");

  assert.match(adminPage, /selectedFiles/);
  assert.match(adminPage, /async function addPhotos/);
  assert.match(adminPage, /multiple onChange=\{handleFile\}/);
});

test("main page includes the private easter egg after authorization", async () => {
  const page = await read("app/page.tsx");

  assert.match(page, /isEasterEggOpen/);
  assert.match(page, /Маленькая мысль/);
  assert.match(page, /Каковы были шансы\?/);
});

test("main page does not render the closed access stat block", async () => {
  const page = await read("app/page.tsx");

  assert.doesNotMatch(page, /закрытый доступ/);
});
