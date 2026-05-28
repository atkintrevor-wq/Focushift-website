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
  var btnClearEmail = document.getElementById("btn-clear-email");
  var btnTogglePassword = document.getElementById("btn-toggle-password");
  var btnTogglePassword2 = document.getElementById("btn-toggle-password2");
  var appleLinkPanel = document.getElementById("apple-link-panel");
  var appleLinkEmailEl = document.getElementById("apple-link-email");
  var appleLinkPasswordInput = document.getElementById("apple-link-password");
  var btnAppleLinkSubmit = document.getElementById("btn-apple-link-submit");
  var btnAppleLinkCancel = document.getElementById("btn-apple-link-cancel");

  var isSignUp = false;
  var pendingAppleLinkCredential = null;
  var pendingAppleLinkEmail = "";

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
    if (btnAppleLinkSubmit) {
      btnAppleLinkSubmit.classList.toggle("is-busy", busy);
      btnAppleLinkSubmit.disabled = busy;
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
      return "";
    }
    if (err.code === "auth/credential-already-in-use") {
      return (
        "This Apple ID is already linked to another Focus Shift account. " +
        "Sign in with Apple only if that is your main account, or sign in with email here and link Apple from Account settings."
      );
    }
    if (err.code === "auth/operation-not-allowed") {
      return "Apple sign-in is not enabled yet. Enable Apple in Firebase Authentication → Sign-in method.";
    }
    return err.message || "Sign-in failed.";
  }

  function showAppleLinkPanel(email) {
    pendingAppleLinkEmail = (email || "").trim();
    if (appleLinkEmailEl) appleLinkEmailEl.textContent = pendingAppleLinkEmail || "your account";
    if (emailInput && pendingAppleLinkEmail) emailInput.value = pendingAppleLinkEmail;
    syncEmailClearButton();
    if (appleLinkPasswordInput) appleLinkPasswordInput.value = "";
    if (appleLinkPanel) appleLinkPanel.hidden = false;
    setMode(false);
    showError("");
  }

  function hideAppleLinkPanel() {
    pendingAppleLinkCredential = null;
    pendingAppleLinkEmail = "";
    if (appleLinkPanel) appleLinkPanel.hidden = true;
    if (appleLinkPasswordInput) appleLinkPasswordInput.value = "";
  }

  function completeAppleLinkWithPassword(password) {
    if (!pendingAppleLinkCredential || !pendingAppleLinkEmail) {
      return Promise.reject(new Error("Apple link session expired. Try Continue with Apple again."));
    }
    return applyAuthPersistence()
      .then(function () {
        return auth.signInWithEmailAndPassword(pendingAppleLinkEmail, password);
      })
      .then(function (cred) {
        return cred.user.linkWithCredential(pendingAppleLinkCredential);
      })
      .then(function (linked) {
        hideAppleLinkPanel();
        return finishAuthSuccess(linked);
      });
  }

  function appleOAuthProvider() {
    var provider = new firebase.auth.OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");
    return provider;
  }

  function handleAuthConflict(error) {
    if (!error || error.code !== "auth/account-exists-with-different-credential") {
      throw error;
    }
    pendingAppleLinkCredential = error.credential || null;
    showAppleLinkPanel(error.email || "");
    if (!pendingAppleLinkCredential) {
      showError(
        "An account already exists with this email. Sign in with email or Google below, then link Apple in Account → Privacy & Security."
      );
    }
  }

  function finishAuthSuccess(cred) {
    persistRememberPreferences((cred.user && cred.user.email) || "");
    return syncUserProfile(cred.user, cred.additionalUserInfo).then(goApp);
  }

  function resolvePostLoginUrl() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      var next = (params.get("next") || "").trim();
      if (next && next.charAt(0) === "/" && next.indexOf("//") !== 0) {
        return next;
      }
    } catch (_e) {}
    return "/app/";
  }

  function goApp() {
    window.location.href = resolvePostLoginUrl();
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

  function syncEmailClearButton() {
    if (!btnClearEmail || !emailInput) return;
    btnClearEmail.hidden = !String(emailInput.value || "").trim();
  }

  function bindPasswordVisibilityToggle(button, input, labelShow, labelHide) {
    if (!button || !input) return;
    button.addEventListener("click", function () {
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      button.classList.toggle("is-visible", show);
      button.setAttribute("aria-pressed", show ? "true" : "false");
      button.setAttribute("aria-label", show ? labelHide : labelShow);
      button.setAttribute("title", show ? labelHide : labelShow);
    });
  }

  function resetPasswordVisibilityToggles() {
    [btnTogglePassword, btnTogglePassword2].forEach(function (btn) {
      if (!btn) return;
      btn.classList.remove("is-visible");
      btn.setAttribute("aria-pressed", "false");
    });
    if (passwordInput) passwordInput.type = "password";
    if (password2Input) password2Input.type = "password";
    if (btnTogglePassword) {
      btnTogglePassword.setAttribute("aria-label", "Show password");
      btnTogglePassword.setAttribute("title", "Show password");
    }
    if (btnTogglePassword2) {
      btnTogglePassword2.setAttribute("aria-label", "Show confirm password");
      btnTogglePassword2.setAttribute("title", "Show password");
    }
  }

  try {
    if (rememberCheckbox) {
      var rem = localStorage.getItem(REMEMBER_STORAGE_KEY);
      if (rem === "0") rememberCheckbox.checked = false;
      var last = localStorage.getItem(LAST_EMAIL_STORAGE_KEY);
      if (last && rememberCheckbox.checked) emailInput.value = last;
    }
  } catch (_e) {}
  syncEmailClearButton();
  if (emailInput) {
    emailInput.addEventListener("input", syncEmailClearButton);
    emailInput.addEventListener("change", syncEmailClearButton);
  }
  if (btnClearEmail && emailInput) {
    btnClearEmail.addEventListener("click", function () {
      emailInput.value = "";
      syncEmailClearButton();
      try {
        emailInput.focus();
      } catch (_focus) {}
    });
  }
  bindPasswordVisibilityToggle(btnTogglePassword, passwordInput, "Show password", "Hide password");
  bindPasswordVisibilityToggle(
    btnTogglePassword2,
    password2Input,
    "Show confirm password",
    "Hide confirm password"
  );
  if (rememberCheckbox) {
    rememberCheckbox.addEventListener("change", function () {
      try {
        localStorage.setItem(REMEMBER_STORAGE_KEY, rememberCheckbox.checked ? "1" : "0");
      } catch (_e) {}
    });
  }

  btnToggleMode.addEventListener("click", function () {
    setMode(!isSignUp);
    resetPasswordVisibilityToggles();
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
    hideAppleLinkPanel();
    var provider = appleOAuthProvider();

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
        return handleAuthConflict(e);
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
        var msg = friendlyAuthError(e);
        if (msg) showError(msg);
      });
    });
  }

  if (btnAppleLinkSubmit) {
    btnAppleLinkSubmit.addEventListener("click", function () {
      var password = appleLinkPasswordInput ? appleLinkPasswordInput.value : "";
      if (!password) {
        showError("Enter your account password to link Apple ID.");
        return;
      }
      withAuthBusy(completeAppleLinkWithPassword(password)).catch(function (e) {
        showError(friendlyAuthError(e) || e.message || "Could not link Apple ID.");
      });
    });
  }

  if (btnAppleLinkCancel) {
    btnAppleLinkCancel.addEventListener("click", function () {
      hideAppleLinkPanel();
      showError("");
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
