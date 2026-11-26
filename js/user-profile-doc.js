/**
 * Payload for users/{uid}. Caller adds updatedAt (server timestamp).
 * Sign-up passes firstName/lastName in extras. A later visit fills those
 * from displayName only when the saved doc has neither, so a missed sign-up
 * write can heal without wiping names already stored.
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.fsUserProfileDoc = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var ALLOWED_KEYS = ["email", "displayName", "firstName", "lastName"];

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function splitDisplayName(displayName) {
    var parts = clean(displayName).split(/\s+/).filter(Boolean);
    if (parts.length < 2) return null;
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  }

  function buildMergePayload(user, existing, extras, options) {
    user = user || {};
    existing = existing || {};
    extras = extras || {};
    options = options || {};
    var payload = {};

    var email = Object.prototype.hasOwnProperty.call(extras, "email")
      ? clean(extras.email)
      : clean(user.email);
    if (!email && Object.prototype.hasOwnProperty.call(extras, "email")) email = clean(user.email);
    if (email) payload.email = email;

    var displayName = Object.prototype.hasOwnProperty.call(extras, "displayName")
      ? clean(extras.displayName)
      : clean(user.displayName);
    if (!displayName && Object.prototype.hasOwnProperty.call(extras, "displayName")) {
      displayName = clean(user.displayName);
    }
    if (displayName) payload.displayName = displayName;

    if (clean(extras.firstName)) payload.firstName = clean(extras.firstName);
    if (clean(extras.lastName)) payload.lastName = clean(extras.lastName);

    if (options.fillMissingNames && !payload.firstName && !payload.lastName) {
      var hasFirst = clean(existing.firstName);
      var hasLast = clean(existing.lastName);
      if (!hasFirst && !hasLast) {
        var split = splitDisplayName(displayName);
        if (split) {
          payload.firstName = split.firstName;
          payload.lastName = split.lastName;
        }
      }
    }

    return payload;
  }

  return {
    ALLOWED_KEYS: ALLOWED_KEYS,
    buildMergePayload: buildMergePayload,
    splitDisplayName: splitDisplayName,
  };
});
