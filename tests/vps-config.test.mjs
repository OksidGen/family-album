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

test("photo upload limit is 25 MB", async () => {
  const route = await read("app/api/photos/route.ts");

  assert.match(route, /MAX_IMAGE_BYTES = 25 \* 1024 \* 1024/);
  assert.match(route, /не больше 25 МБ/);
  assert.doesNotMatch(route, /не больше 10 МБ/);
});

test("admin can choose the album cover photo", async () => {
  const storage = await read("app/api/photos/storage.ts");
  const photosRoute = await read("app/api/photos/route.ts");
  const settingsRoute = await read("app/api/settings/route.ts");
  const styles = await read("app/globals.css");
  const adminPage = await read("app/admin/page.tsx");
  const page = await read("app/page.tsx");

  assert.match(storage, /settings\.json/);
  assert.match(storage, /readAlbumSettings/);
  assert.match(storage, /setCoverPhoto/);
  assert.match(storage, /coverPositionX/);
  assert.match(storage, /coverPositionY/);
  assert.match(photosRoute, /settings/);
  assert.match(settingsRoute, /coverPhotoId/);
  assert.match(settingsRoute, /coverPositionX/);
  assert.match(adminPage, /Сделать обложкой/);
  assert.match(adminPage, /На обложке/);
  assert.match(adminPage, /Выбрать область обложки/);
  assert.match(page, /settings\.coverPhotoId/);
  assert.match(page, /objectPosition: heroObjectPosition/);
  assert.match(page, /coverPhoto \?\? photos\[0\]/);
  assert.match(styles, /max-height: 100vh/);
  assert.match(styles, /cover-picker-frame/);
});

test("album gallery preserves photo proportions in a masonry layout", async () => {
  const styles = await read("app/globals.css");
  const photoGridRule = styles.match(/\.photo-grid\s*{[^}]*}/)?.[0] ?? "";
  const photoCardRule = styles.match(/\.photo-card\s*{[^}]*}/)?.[0] ?? "";
  const photoImageRule = styles.match(/\.photo-card img\s*{[^}]*}/)?.[0] ?? "";

  assert.match(photoGridRule, /column-count: 3/);
  assert.match(photoGridRule, /column-gap:/);
  assert.match(photoCardRule, /break-inside: avoid/);
  assert.match(photoCardRule, /margin-bottom:/);
  assert.match(photoImageRule, /height: auto/);
  assert.doesNotMatch(photoImageRule, /object-fit: cover|aspect-ratio/);
});

test("album photos open in a filtered fullscreen lightbox", async () => {
  const page = await read("app/page.tsx");
  const styles = await read("app/globals.css");

  assert.match(page, /lightboxIndex/);
  assert.match(page, /setLightboxIndex\(index\)/);
  assert.match(page, /visibleLightboxIndex/);
  assert.match(page, /filteredPhotos\[visibleLightboxIndex\]/);
  assert.match(page, /ArrowLeft/);
  assert.match(page, /ArrowRight/);
  assert.match(page, /Escape/);
  assert.match(page, /Просмотр фотографии/);
  assert.match(styles, /\.photo-lightbox/);
  assert.match(styles, /position: fixed/);
  assert.match(styles, /object-fit: contain/);
});

test("main page includes the private easter egg after authorization", async () => {
  const page = await read("app/page.tsx");

  assert.match(page, /isEasterEggOpen/);
  assert.match(page, /Маленькая мысль/);
  assert.match(page, /Каковы были шансы\?/);
});

test("private easter egg text is split into meaningful indented blocks", async () => {
  const page = await read("app/page.tsx");
  const styles = await read("app/globals.css");

  assert.match(page, /ни планет\. Сила гравитации велика настолько, насколько нужно\./);
  assert.match(page, /А если бы электромагнитные силы не составляли 1%/);
  assert.match(page, /На нашей планете 8 миллиардов человек/);
  assert.match(styles, /text-indent: 1\.35em/);
});

test("main page does not render the closed access stat block", async () => {
  const page = await read("app/page.tsx");

  assert.doesNotMatch(page, /закрытый доступ/);
});
