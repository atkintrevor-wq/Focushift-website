/**
 *   node js/user-profile-doc.check.js
 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const profile = require("./user-profile-doc.js");

const SERVER_OWNED = [
  "isAdmin",
  "subscriptionTier",
  "subscriptionTierSource",
  "subscriptionTierUpdatedAt",
  "subscriptionBillingInterval",
  "subscriptionPeriodEndsAt",
  "subscriptionAutoRenew",
  "storeKitOriginalTransactionId",
  "playPurchaseToken",
  "playOrderId",
  "stripeCustomerId",
  "stripeSubscriptionId",
  "promoCode",
  "promoOffer",
  "promoOfferLabel",
  "promoInfluencerName",
  "promoRedeemedAt",
  "promoRedemptionId",
  "promoConvertedAt",
  "promoPlayOfferId",
  "promoAppleUseOfferCodeSheet",
  "promoStripeCouponId",
  "promoStripePromotionCodeId",
];

function keysOnlyProfileFields(payload) {
  Object.keys(payload).forEach(function (key) {
    assert.ok(profile.ALLOWED_KEYS.indexOf(key) !== -1, "unexpected field " + key);
    assert.equal(SERVER_OWNED.indexOf(key), -1);
  });
}

const signUp = profile.buildMergePayload(
  { uid: "abc", email: "a@b.co", displayName: "" },
  null,
  { email: "a@b.co", displayName: "Ada Lovelace", firstName: "Ada", lastName: "Lovelace" }
);
assert.deepEqual(signUp, {
  email: "a@b.co",
  displayName: "Ada Lovelace",
  firstName: "Ada",
  lastName: "Lovelace",
});
keysOnlyProfileFields(signUp);

const healed = profile.buildMergePayload(
  { email: "a@b.co", displayName: "Ada Lovelace" },
  {},
  null,
  { fillMissingNames: true }
);
const noSplitOnSignIn = profile.buildMergePayload(
  { email: "a@b.co", displayName: "Ada Lovelace" },
  {},
  null
);
assert.deepEqual(noSplitOnSignIn, { email: "a@b.co", displayName: "Ada Lovelace" });
assert.deepEqual(healed, {
  email: "a@b.co",
  displayName: "Ada Lovelace",
  firstName: "Ada",
  lastName: "Lovelace",
});

const kept = profile.buildMergePayload(
  { email: "a@b.co", displayName: "Ada Lovelace" },
  { firstName: "Augusta", lastName: "King", subscriptionTier: "pro", isAdmin: true },
  null
);
assert.deepEqual(kept, { email: "a@b.co", displayName: "Ada Lovelace" });
keysOnlyProfileFields(kept);

const single = profile.buildMergePayload({ email: "a@b.co", displayName: "Ada" }, {}, null);
assert.deepEqual(single, { email: "a@b.co", displayName: "Ada" });

const blankEmail = profile.buildMergePayload({ email: "", displayName: "Ada Lovelace" }, {}, null);
assert.equal(blankEmail.email, undefined);
assert.equal(blankEmail.displayName, "Ada Lovelace");

const authJs = fs.readFileSync(path.join(__dirname, "../login/auth.js"), "utf8");
const listenerAt = authJs.indexOf("auth.onAuthStateChanged");
assert.ok(listenerAt > 0, "login auth listener missing");
const listener = authJs.slice(listenerAt);
assert.equal(listener.indexOf("goApp("), -1, "auth listener must not navigate by itself");
assert.match(authJs, /profileCommit\.then\(function \(\) \{\s*goApp\(\);\s*\}\)/);
assert.match(authJs, /holdRedirectFor\(function \(\) \{\s*return applyAuthPersistence\(\)\.then\(function \(\) \{\s*return auth\.createUserWithEmailAndPassword/);
assert.match(authJs, /firstName: fn/);
assert.match(authJs, /lastName: ln/);

const appJs = fs.readFileSync(path.join(__dirname, "../app/app.js"), "utf8");
const appListenerAt = appJs.lastIndexOf("auth.onAuthStateChanged");
assert.ok(appListenerAt > 0);
const appListener = appJs.slice(appListenerAt);
assert.match(appListener, /ensureSignedInUserProfile\(user, currentUserProfile, true\)/);
assert.match(appListener, /ensureSignedInUserProfile\(user, \{\}, false\)/);

const deleteAt = appJs.indexOf("function deleteScript");
const deleteFn = appJs.slice(deleteAt, appJs.indexOf("function stopActiveAudio", deleteAt));
assert.match(deleteFn, /deleteFreeLocalScript\(uid, scriptId\)/);
assert.match(deleteFn, /scriptCollection\(uid\)\.doc\(scriptId\)\.delete\(\)/);
assert.match(appJs, /migrateFreeLocalScriptsToCloud\(uid\)/);
assert.match(appJs, /nextLibraryMode !== boundScriptsLibraryMode/);

console.log("user-profile-doc checks passed");
