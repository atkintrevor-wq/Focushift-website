/**
 * Legacy bundled background IDs resolve to the approved cloud catalog IDs,
 * and the web app no longer points at shipped background or premade audio.
 *
 *   node app/legacy-background-aliases.check.js
 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const aliases = require("./legacy-background-aliases.js");
const appJs = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
const swJs = fs.readFileSync(path.join(__dirname, "sw.js"), "utf8");
const indexHtml = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

const ids = Object.keys(aliases.aliases);
assert.equal(ids.length, 45, "expected all 45 bundled background IDs");
ids.forEach(function (id) {
  assert.equal(id.indexOf("bg-"), 0);
  const cloud = aliases.canonicalBackgroundId(id);
  assert.equal(cloud.indexOf("bg-cloud-"), 0, id);
  assert.equal(aliases.canonicalBackgroundId(cloud), cloud, "canonical is idempotent for " + id);
  assert.notEqual(cloud, id);
});

assert.equal(aliases.canonicalBackgroundId("bg-rain"), aliases.freeDefaults.rain);
assert.equal(aliases.canonicalBackgroundId("bg-meditation"), aliases.freeDefaults.meditation);
assert.equal(aliases.canonicalBackgroundId("bg-piano"), aliases.freeDefaults.piano);
assert.equal(
  aliases.canonicalBackgroundId("bg-recovery-glow"),
  "bg-cloud-c9048760-1f57-4919-8eab-49b53c33e863"
);
assert.equal(
  aliases.canonicalBackgroundId("bg-just-relax"),
  "bg-cloud-336591e7-57f5-47ca-835e-7d406d90a619"
);
assert.equal(
  aliases.canonicalBackgroundId("bg-oasis"),
  "bg-cloud-5243ed58-3b24-4f02-a79d-667cb326561c"
);
assert.equal(
  aliases.canonicalBackgroundId("bg-please-calm"),
  aliases.canonicalBackgroundId("bg-serene-mind-whisper")
);
assert.equal(aliases.canonicalBackgroundId("bg-none"), "bg-none");
assert.equal(aliases.canonicalBackgroundId("  bg-rain  "), aliases.freeDefaults.rain);
assert.equal(aliases.canonicalBackgroundId(""), "");
assert.equal(aliases.canonicalBackgroundId("user-bg-local"), "user-bg-local");

assert.match(appJs, /canonicalBackgroundId/);
assert.match(appJs, new RegExp(aliases.freeDefaults.rain));
assert.match(appJs, new RegExp(aliases.freeDefaults.meditation));
assert.doesNotMatch(appJs, /"bg-rain":\s*true/);
assert.doesNotMatch(appJs, /"bg-meditation":\s*true/);
assert.doesNotMatch(appJs, /audio\/backgrounds/);
assert.doesNotMatch(appJs, /audio\/premade/);
assert.doesNotMatch(appJs, /bundled-premades-manifest/);
assert.doesNotMatch(appJs, /STATIC_PREMADE_FALLBACK/);
assert.doesNotMatch(appJs, /Recovery Glow\.mp3/);
assert.doesNotMatch(appJs, /backgroundTrackAssetUrl/);
assert.doesNotMatch(appJs, /buildStaticPremadeFallbackList/);
assert.match(appJs, /currentHiddenPremade/);
assert.match(appJs, /OFFLINE_AUDIO_CACHE_NAME/);
assert.match(appJs, /clearOfflineAudioDownloads/);
assert.match(appJs, /maybePurgeOfflineAudioForTier/);

assert.match(swJs, /focusshift-app-offline-audio-v1/);
assert.match(swJs, /isFirebaseApiHost/);
assert.match(swJs, /\/app\/offline-media\//);
assert.match(swJs, /if \(isFirebaseApiHost\(url\.hostname\)\) return/);
assert.doesNotMatch(swJs, /caches\.put\([^)]*googleapis/);

assert.match(indexHtml, /legacy-background-aliases\.js/);
assert.match(indexHtml, /\/app\/sw\.js/);
assert.match(indexHtml, /scope:\s*"\/app\/"/);

["audio/backgrounds", "audio/premade", "app/bundled-premades-manifest.json"].forEach(function (rel) {
  assert.equal(fs.existsSync(path.join(root, rel)), false, rel + " should be removed");
});

console.log("legacy-background-aliases.check.js: ok (" + ids.length + " bundled IDs)");
