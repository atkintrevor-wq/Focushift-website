(function () {
  "use strict";

  var root = document.getElementById("root");
  var scriptsUnsubscribe = null;
  var currentUser = null;
  var isEditing = false;
  var editingScriptId = null;

  function redirectLogin() {
    window.location.href = "/login/";
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

  if (!configReady(window.fsFirebaseConfig)) {
    root.innerHTML =
      "<h1>Setup required</h1><p class=\"app-muted\">Configure <code>js/firebase-config.js</code> (see WEB_FIREBASE_SETUP.md), then reload.</p>";
    return;
  }

  firebase.initializeApp(window.fsFirebaseConfig);
  var auth = firebase.auth();
  var db = firebase.firestore();

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function teardownScriptsListener() {
    if (typeof scriptsUnsubscribe === "function") {
      scriptsUnsubscribe();
      scriptsUnsubscribe = null;
    }
  }

  function formatDate(ts) {
    if (!ts || typeof ts.toDate !== "function") return "No date";
    try {
      return ts.toDate().toLocaleString();
    } catch (_e) {
      return "No date";
    }
  }

  function scriptCollection(uid) {
    return db.collection("users").doc(uid).collection("scripts");
  }

  function renderSignedOut() {
    teardownScriptsListener();
    redirectLogin();
  }

  function renderNonAdmin(email, displayName) {
    teardownScriptsListener();
    root.innerHTML =
      "<h1>You're signed in</h1>" +
      "<p class=\"app-muted\">Hi " +
      escapeHtml(displayName || email || "there") +
      ". Full Focus Shift tools on the web are <strong>coming soon</strong>. For now, use the iOS app for playlists, audio generation, and your full library.</p>" +
      "<p class=\"app-muted\">Signed in as <strong>" +
      escapeHtml(email || "") +
      "</strong></p>" +
      '<p style="margin-top:2rem"><button type="button" class="auth-btn auth-btn-primary" id="btn-out">Sign out</button></p>' +
      '<p class="auth-back"><a href="/">← Marketing site</a></p>';
    document.getElementById("btn-out").addEventListener("click", function () {
      auth.signOut().then(redirectLogin);
    });
  }

  function renderAdminShell(email, displayName) {
    root.innerHTML =
      "<h1>Focus Shift — admin</h1>" +
      "<p class=\"app-muted\">Signed in as <strong>" +
      escapeHtml(email || "") +
      "</strong> (" +
      escapeHtml(displayName || "no display name") +
      "). This is Stage 3: My Library scripts CRUD in the browser.</p>" +
      '<div class="app-toolbar">' +
      '  <button type="button" class="app-btn" id="btn-create-script">+ New Script</button>' +
      '  <button type="button" class="app-btn" id="btn-sign-out">Sign out</button>' +
      "</div>" +
      '<div id="scripts-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      '<div id="script-editor"></div>' +
      '<section aria-label="My Library scripts">' +
      '  <h2 style="font-size:1.1rem;margin:1rem 0 0.5rem;">My Library Scripts</h2>' +
      '  <div id="scripts-list"><p class="app-muted">Loading scripts...</p></div>' +
      "</section>" +
      '<p class="auth-back"><a href="/">← Marketing site</a></p>';

    document.getElementById("btn-sign-out").addEventListener("click", function () {
      auth.signOut().then(redirectLogin);
    });

    document.getElementById("btn-create-script").addEventListener("click", function () {
      openEditor(null);
    });
  }

  function setMessage(text, kind) {
    var el = document.getElementById("scripts-message");
    if (!el) return;
    el.className = "app-inline-msg" + (kind ? " " + kind : "");
    el.textContent = text || "";
  }

  function scriptCardHtml(script) {
    var plainText = script.text && script.text.trim() ? script.text : "(No text yet)";
    return (
      '<article class="app-card" data-script-id="' +
      escapeHtml(script.id) +
      '">' +
      "<h3>" +
      escapeHtml(script.title || "Untitled Script") +
      "</h3>" +
      '<div class="app-card-meta">Created: ' +
      escapeHtml(formatDate(script.createdAt)) +
      "</div>" +
      '<p class="app-card-text">' +
      escapeHtml(plainText) +
      "</p>" +
      '<div class="app-card-actions">' +
      '  <button type="button" class="app-btn" data-action="edit" data-script-id="' +
      escapeHtml(script.id) +
      '">Edit</button>' +
      '  <button type="button" class="app-btn app-btn-danger" data-action="delete" data-script-id="' +
      escapeHtml(script.id) +
      '">Delete</button>' +
      "</div>" +
      "</article>"
    );
  }

  function bindScriptCardActions(scripts) {
    var list = document.getElementById("scripts-list");
    if (!list) return;
    list.querySelectorAll("[data-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var action = btn.getAttribute("data-action");
        var scriptId = btn.getAttribute("data-script-id");
        var script = scripts.find(function (s) {
          return s.id === scriptId;
        });
        if (!script) return;
        if (action === "edit") {
          openEditor(script);
        } else if (action === "delete") {
          deleteScript(script);
        }
      });
    });
  }

  function renderScripts(scripts) {
    var list = document.getElementById("scripts-list");
    if (!list) return;
    if (!scripts.length) {
      list.innerHTML =
        '<div class="app-card"><p class="app-muted">No scripts yet. Click "+ New Script" to create your first one.</p></div>';
      return;
    }
    list.innerHTML = scripts.map(scriptCardHtml).join("");
    bindScriptCardActions(scripts);
  }

  function openEditor(script) {
    isEditing = !!script;
    editingScriptId = script ? script.id : null;
    var editor = document.getElementById("script-editor");
    if (!editor) return;
    editor.innerHTML =
      '<form id="script-form" class="app-form app-card">' +
      "  <h2 style=\"font-size:1.1rem;margin-top:0;\">" +
      (isEditing ? "Edit script" : "Create script") +
      "</h2>" +
      "  <label for=\"script-title\">Title</label>" +
      '  <input id="script-title" type="text" maxlength="120" required value="' +
      escapeHtml((script && script.title) || "") +
      '">' +
      "  <label for=\"script-text\">Script text</label>" +
      '  <textarea id="script-text" required>' +
      escapeHtml((script && script.text) || "") +
      "</textarea>" +
      '  <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">' +
      '    <button type="submit" class="app-btn">Save</button>' +
      '    <button type="button" class="app-btn" id="btn-cancel-edit">Cancel</button>' +
      "  </div>" +
      "</form>";

    document.getElementById("btn-cancel-edit").addEventListener("click", function () {
      closeEditor();
    });

    document.getElementById("script-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      saveScriptFromEditor(script);
    });
  }

  function closeEditor() {
    isEditing = false;
    editingScriptId = null;
    var editor = document.getElementById("script-editor");
    if (editor) editor.innerHTML = "";
  }

  function saveScriptFromEditor(existingScript) {
    if (!currentUser) return;
    var titleInput = document.getElementById("script-title");
    var textInput = document.getElementById("script-text");
    var title = (titleInput && titleInput.value ? titleInput.value : "").trim();
    var text = (textInput && textInput.value ? textInput.value : "").trim();
    if (!title || !text) {
      setMessage("Title and script text are required.", "error");
      return;
    }

    setMessage("Saving...", "");
    var uid = currentUser.uid;
    if (isEditing && editingScriptId) {
      scriptCollection(uid)
        .doc(editingScriptId)
        .set(
          {
            title: title,
            text: text,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        )
        .then(function () {
          setMessage("Script updated.", "success");
          closeEditor();
        })
        .catch(function (e) {
          setMessage(e.message || "Could not update script.", "error");
        });
      return;
    }

    var docRef = scriptCollection(uid).doc();
    scriptCollection(uid)
      .doc(docRef.id)
      .set({
        title: title,
        text: text,
        createdAt: firebase.firestore.Timestamp.now(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        audioURL: "",
        backgroundID: "",
        voiceID: "",
        audioCreatedAt: null,
        categoryID: "",
      })
      .then(function () {
        setMessage("Script created.", "success");
        closeEditor();
      })
      .catch(function (e) {
        setMessage(e.message || "Could not create script.", "error");
      });
  }

  function deleteScript(script) {
    if (!currentUser) return;
    var ok = window.confirm('Delete "' + (script.title || "Untitled Script") + '"?');
    if (!ok) return;
    setMessage("Deleting...", "");
    scriptCollection(currentUser.uid)
      .doc(script.id)
      .delete()
      .then(function () {
        setMessage("Script deleted.", "success");
        if (editingScriptId === script.id) closeEditor();
      })
      .catch(function (e) {
        setMessage(e.message || "Could not delete script.", "error");
      });
  }

  function subscribeScripts(uid) {
    teardownScriptsListener();
    scriptsUnsubscribe = scriptCollection(uid)
      .orderBy("createdAt", "desc")
      .onSnapshot(
        function (snap) {
          var scripts = snap.docs.map(function (doc) {
            var data = doc.data() || {};
            return {
              id: doc.id,
              title: data.title || "",
              text: data.text || "",
              createdAt: data.createdAt || null,
              updatedAt: data.updatedAt || null,
            };
          });
          renderScripts(scripts);
        },
        function (e) {
          setMessage(e.message || "Could not load scripts.", "error");
          renderScripts([]);
        }
      );
  }

  auth.onAuthStateChanged(function (user) {
    currentUser = user || null;
    if (!user) {
      renderSignedOut();
      return;
    }
    root.innerHTML = '<p class="app-muted">Loading your profile...</p>';
    db
      .collection("users")
      .doc(user.uid)
      .get()
      .then(function (snap) {
        var isAdmin = snap.exists && snap.data().isAdmin === true;
        if (isAdmin) {
          renderAdminShell(user.email, user.displayName);
          subscribeScripts(user.uid);
        } else {
          renderNonAdmin(user.email, user.displayName);
        }
      })
      .catch(function () {
        renderNonAdmin(user.email, user.displayName);
      });
  });
})();
