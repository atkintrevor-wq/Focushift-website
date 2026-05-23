(function () {
  "use strict";

  var REMEMBER_STORAGE_KEY = "fs_auth_remember_me";
  var LAST_EMAIL_STORAGE_KEY = "fs_auth_last_email";

  var setupBanner = document.getElementById("setup-banner");
  var errorBanner = document.getElementById("error-banner");
  var btnGoogle = document.getElementById("btn-google");
  var btnApple = document.getElementById("btn-apple");
  var btnEmailSubmit = document.getElementById("btn-email-submit");
  var btnEmailLabel = btnEmailSubmit ? btnEmailSubmit.querySelector(".auth-btn-text") : null;
  var emailForm = document.getElementById("email-form");
  var emailInput = document.getElementById("email");
  var passwordInput = document.getElementById("password");
  var password2Input = document.getElementById("password2");
  var firstNameInput = document.getElementById("firstName");
  var lastNameInput = document.getElementById("lastName");
  var btnToggleMode = document.getElementById("btn-toggle-mode");
  var toggleLabel = document.getElementById("toggle-label");
  var authTitle = document.getElementById("auth-title");
  var btnForgot = document.getElementById("btn-forgot");
  var rememberCheckbox = document.getElementById("remember-me");

  var isSignUp = false;

  function showError(msg) {
    errorBanner.textContent = msg || "";
    errorBanner.classList.toggle("is-visible", !!msg);
  }

  function showSetup(msg) {
    setupBanner.textContent = msg || "";
    setupBanner.classList.toggle("is-visible", !!msg);
  }

  function configReady(cfg) {
    return (
      cfg &&
      cfg.apiKey &&
      String(cfg.apiKey).indexOf("REPLACE") === -1 &&
      cfg.projectId &&
      String(cfg.projectId).indexOf("REPLACE") === -1
    );
  }

  function setAuthBusy(busy) {
    document.body.classList.toggle("auth-is-busy", busy);
    if (btnGoogle) {
      btnGoogle.classList.toggle("is-busy", busy);
      btnGoogle.disabled = busy;
    }
    if (btnApple) {
      btnApple.classList.toggle("is-busy", busy);
      btnApple.disabled = busy;
    }
    if (btnEmailSubmit) {
      btnEmailSubmit.classList.toggle("is-busy", busy);
      btnEmailSubmit.disabled = busy;
    }
    if (btnToggleMode) btnToggleMode.disabled = busy;
    if (emailForm) emailForm.setAttribute("aria-busy", busy ? "true" : "false");
  }

  function withAuthBusy(promise) {
    setAuthBusy(true);
    return Promise.resolve(promise).then(
      function (v) {
        setAuthBusy(false);
        return v;
      },
      function (e) {
        setAuthBusy(false);
        throw e;
      }
    );
  }

  function persistRememberPreferences(emailFromUser) {
    try {
      if (rememberCheckbox) {
        localStorage.setItem(REMEMBER_STORAGE_KEY, rememberCheckbox.checked ? "1" : "0");
        if (rememberCheckbox.checked) {
          var em = (emailFromUser || (emailInput && emailInput.value) || "").trim();
          if (em) localStorage.setItem(LAST_EMAIL_STORAGE_KEY, em);
        } else {
          localStorage.removeItem(LAST_EMAIL_STORAGE_KEY);
        }
      }
    } catch (_e) {}
  }

  var cfg = window.fsFirebaseConfig;
  if (!configReady(cfg)) {
    showSetup(
      "Firebase Web config is not set yet. Edit website/js/firebase-config.js with values from the Firebase Console (see WEB_FIREBASE_SETUP.md), then deploy again."
    );
    return;
  }

  firebase.initializeApp(cfg);
  var auth = firebase.auth();
  var db = firebase.firestore();

  function syncUserProfile(user, additionalUserInfo) {
    var displayName = (user.displayName || "").trim();
    if (!displayName && additionalUserInfo && additionalUserInfo.profile) {
      var profile = additionalUserInfo.profile;
      var given = profile.given_name || profile.firstName || "";
      var family = profile.family_name || profile.lastName || "";
      displayName = (String(given) + " " + String(family)).trim();
    }

    function writeProfileDoc() {
      var payload = {
        email: user.email || "",
        displayName: displayName || user.displayName || "",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      return db.collection("users").doc(user.uid).set(payload, { merge: true });
    }

    if (displayName && displayName !== (user.displayName || "").trim()) {
      return user.updateProfile({ displayName: displayName }).then(writeProfileDoc);
    }
    return writeProfileDoc();
  }

  function friendlyAuthError(err) {
    if (!err) return "Sign-in failed.";
    if (err.code === "auth/popup-closed-by-user") return "";
    if (err.code === "auth/account-exists-with-different-credential") {
      return (
        "An account already exists with this email using a different sign-in method. " +
        "Sign in with email or Google here, or use the same Apple ID on the iOS app."
      );
    }
    if (err.code === "auth/operation-not-allowed") {
      return "Apple sign-in is not enabled yet. Enable Apple in Firebase Authentication → Sign-in method.";
    }
    return err.message || "Sign-in failed.";
  }

  function finishAuthSuccess(cred) {
    persistRememberPreferences((cred.user && cred.user.email) || "");
    return syncUserProfile(cred.user, cred.additionalUserInfo).then(goApp);
  }

  function goApp() {
    window.location.href = "/app/";
  }

  function applyAuthPersistence() {
    var level = rememberCheckbox && rememberCheckbox.checked
      ? firebase.auth.Auth.Persistence.LOCAL
      : firebase.auth.Auth.Persistence.SESSION;
    return auth.setPersistence(level);
  }

  function setMode(signUp) {
    isSignUp = signUp;
    document.body.classList.toggle("is-sign-up", signUp);
    authTitle.textContent = signUp ? "Create account" : "Sign in";
    if (btnEmailLabel) btnEmailLabel.textContent = signUp ? "Sign up" : "Sign in";
    toggleLabel.textContent = signUp ? "Already have an account?" : "New here?";
    btnToggleMode.textContent = signUp ? "Sign in instead" : "Create an account";
    passwordInput.autocomplete = signUp ? "new-password" : "current-password";
    showError("");
  }

  try {
    if (rememberCheckbox) {
      var rem = localStorage.getItem(REMEMBER_STORAGE_KEY);
      if (rem === "0") rememberCheckbox.checked = false;
      var last = localStorage.getItem(LAST_EMAIL_STORAGE_KEY);
      if (last && rememberCheckbox.checked) emailInput.value = last;
    }
  } catch (_e) {}
  if (rememberCheckbox) {
    rememberCheckbox.addEventListener("change", function () {
      try {
        localStorage.setItem(REMEMBER_STORAGE_KEY, rememberCheckbox.checked ? "1" : "0");
      } catch (_e) {}
    });
  }

  btnToggleMode.addEventListener("click", function () {
    setMode(!isSignUp);
  });

  btnGoogle.disabled = false;
  if (btnApple) btnApple.disabled = false;
  btnEmailSubmit.disabled = false;

  auth
    .getRedirectResult()
    .then(function (result) {
      if (!result || !result.user) return;
      return withAuthBusy(finishAuthSuccess(result));
    })
    .catch(function (e) {
      var msg = friendlyAuthError(e);
      if (msg) showError(msg);
    });

  function signInWithApple() {
    showError("");
    var provider = new firebase.auth.OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");

    return applyAuthPersistence()
      .then(function () {
        return auth.signInWithPopup(provider);
      })
      .catch(function (e) {
        if (e && e.code === "auth/popup-blocked") {
          return applyAuthPersistence().then(function () {
            return auth.signInWithRedirect(provider);
          });
        }
        throw e;
      })
      .then(function (cred) {
        if (!cred) return;
        return finishAuthSuccess(cred);
      });
  }

  btnGoogle.addEventListener("click", function () {
    showError("");
    var provider = new firebase.auth.GoogleAuthProvider();
    withAuthBusy(
      applyAuthPersistence()
        .then(function () {
          return auth.signInWithPopup(provider);
        })
        .then(finishAuthSuccess)
    ).catch(function (e) {
      showError(friendlyAuthError(e));
    });
  });

  if (btnApple) {
    btnApple.addEventListener("click", function () {
      withAuthBusy(signInWithApple()).catch(function (e) {
        showError(friendlyAuthError(e));
      });
    });
  }

  emailForm.addEventListener("submit", function (ev) {
    ev.preventDefault();
    showError("");
    var email = emailInput.value.trim();
    var password = passwordInput.value;
    if (!email || !password) {
      showError("Enter email and password.");
      return;
    }
    if (isSignUp) {
      var fn = firstNameInput.value.trim();
      var ln = lastNameInput.value.trim();
      var p2 = password2Input.value;
      if (!fn || !ln) {
        showError("First and last name are required.");
        return;
      }
      if (password !== p2) {
        showError("Passwords do not match.");
        return;
      }
      if (password.length < 6) {
        showError("Password must be at least 6 characters.");
        return;
      }
      withAuthBusy(
        applyAuthPersistence().then(function () {
          return auth.createUserWithEmailAndPassword(email, password).then(function (cred) {
            var displayName = fn + " " + ln;
            persistRememberPreferences(email);
            return cred.user.updateProfile({ displayName: displayName }).then(function () {
              return db.collection("users").doc(cred.user.uid).set(
                {
                  displayName: displayName,
                  firstName: fn,
                  lastName: ln,
                  email: email,
                  updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
              );
            });
          });
        }).then(goApp)
      ).catch(function (e) {
        showError(friendlyAuthError(e));
      });
    } else {
      withAuthBusy(
        applyAuthPersistence().then(function () {
          return auth.signInWithEmailAndPassword(email, password).then(function (cred) {
            persistRememberPreferences((cred.user && cred.user.email) || email);
            return syncUserProfile(cred.user);
          });
        }).then(goApp)
      ).catch(function (e) {
        showError(friendlyAuthError(e));
      });
    }
  });

  btnForgot.addEventListener("click", function () {
    var email = emailInput.value.trim();
    if (!email) {
      showError("Enter your email first, then tap Forgot password.");
      return;
    }
    auth
      .sendPasswordResetEmail(email)
      .then(function () {
        showError("");
        alert("If an account exists for that email, a reset link has been sent.");
      })
      .catch(function (e) {
        showError(e.message || "Could not send reset email.");
      });
  });

  auth.onAuthStateChanged(function (user) {
    if (user && window.location.search.indexOf("stay") === -1) {
      /* optional: auto-redirect if already signed in */
    }
  });
})();
