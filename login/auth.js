(function () {
  "use strict";

  var setupBanner = document.getElementById("setup-banner");
  var errorBanner = document.getElementById("error-banner");
  var btnGoogle = document.getElementById("btn-google");
  var btnEmailSubmit = document.getElementById("btn-email-submit");
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

  function syncUserProfile(user) {
    var payload = {
      email: user.email || "",
      displayName: user.displayName || "",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    return db.collection("users").doc(user.uid).set(payload, { merge: true });
  }

  function goApp() {
    window.location.href = "/app/";
  }

  function setMode(signUp) {
    isSignUp = signUp;
    document.body.classList.toggle("is-sign-up", signUp);
    authTitle.textContent = signUp ? "Create account" : "Sign in";
    btnEmailSubmit.textContent = signUp ? "Sign up" : "Sign in";
    toggleLabel.textContent = signUp ? "Already have an account?" : "New here?";
    btnToggleMode.textContent = signUp ? "Sign in instead" : "Create an account";
    passwordInput.autocomplete = signUp ? "new-password" : "current-password";
    showError("");
  }

  btnToggleMode.addEventListener("click", function () {
    setMode(!isSignUp);
  });

  btnGoogle.disabled = false;
  btnEmailSubmit.disabled = false;

  btnGoogle.addEventListener("click", function () {
    showError("");
    var provider = new firebase.auth.GoogleAuthProvider();
    auth
      .signInWithPopup(provider)
      .then(function (cred) {
        return syncUserProfile(cred.user);
      })
      .then(goApp)
      .catch(function (e) {
        showError(e.message || "Google sign-in failed.");
      });
  });

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
      auth
        .createUserWithEmailAndPassword(email, password)
        .then(function (cred) {
          var displayName = fn + " " + ln;
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
        })
        .then(goApp)
        .catch(function (e) {
          showError(e.message || "Sign up failed.");
        });
    } else {
      auth
        .signInWithEmailAndPassword(email, password)
        .then(function (cred) {
          return syncUserProfile(cred.user);
        })
        .then(goApp)
        .catch(function (e) {
          showError(e.message || "Sign in failed.");
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
