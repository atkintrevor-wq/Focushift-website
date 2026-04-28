(function () {
  "use strict";

  var root = document.getElementById("root");
  var scriptsUnsubscribe = null;
  var playlistsUnsubscribe = null;
  var currentUser = null;
  var currentScripts = [];
  var currentPlaylists = [];
  var isEditing = false;
  var editingScriptId = null;
  var generatingAudioByScriptId = {};
  var activeAudio = null;
  var activeAudioScriptId = null;
  var activePlaylistQueue = [];
  var activePlaylistIndex = -1;
  var selectedPlaylistId = null;
  var selectedVoiceId = "lnieQLGTodpbhjpZtg1k"; // Bill
  var availableVoices = [
    { id: "lnieQLGTodpbhjpZtg1k", name: "Bill" },
    { id: "YZHSTqsq1isdXNsFLzBw", name: "Isa" },
    { id: "rJ9XoWu8gbUhVKZnKY8X", name: "Lori" },
    { id: "1wGbFxmAM3Fgw63G1zZJ", name: "Allison" },
    { id: "5F6a8n4ijdCrImoXgxM9", name: "Mark" },
    { id: "EiNlNiXeDU1pqqOPrYMO", name: "Paul" },
  ];
  var activeCategoryId = "confidence";
  var surveyCategories = [
    {
      id: "confidence",
      name: "Confidence & Self-Worth",
      questions: [
        "What's one area where you'd like to feel more confident or worthy right now?",
        "How do you want to feel about yourself on a great day?",
      ],
    },
    {
      id: "relationships",
      name: "Relationships & Love",
      questions: [
        "What aspect of your relationships would you most like to improve or attract?",
        "What does an ideal relationship feel like to you?",
      ],
    },
    {
      id: "success-prosperity",
      name: "Success & Prosperity",
      questions: [
        "What's your main goal right now in career, money, or abundance?",
        "What would success or prosperity look and feel like day-to-day?",
      ],
    },
    {
      id: "mental-wellbeing",
      name: "Mental Well-Being",
      questions: [
        "What's the biggest mental or emotional challenge you're facing lately?",
        "How do you want to feel most of the time?",
      ],
    },
    {
      id: "health-fitness",
      name: "Health & Fitness",
      questions: [
        "What's your primary health or fitness focus right now?",
        "When your body and energy are at their best, what does that feel like?",
      ],
    },
    {
      id: "sports-performance",
      name: "Sports Performance",
      questions: [
        "What aspect of your mental game do you want to strengthen for peak performance?",
        "When you're at your best in your sport, what do you feel or tell yourself?",
      ],
    },
    {
      id: "sleep-rest",
      name: "Sleep & Rest",
      questions: [
        "What gets in the way of good sleep or rest for you right now?",
        "How do you want to feel when falling asleep or waking up rested?",
      ],
    },
    {
      id: "i-am",
      name: "I am…",
      questions: [
        "What do you most want to believe or embody about yourself right now?",
        "How would life feel different if you fully lived this daily?",
      ],
    },
    {
      id: "other",
      name: "Custom Topic",
      questions: [
        "Describe the specific area or theme you'd like this script for.",
        "What's one key challenge or desired feeling in this area?",
      ],
    },
  ];

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

  function teardownPlaylistsListener() {
    if (typeof playlistsUnsubscribe === "function") {
      playlistsUnsubscribe();
      playlistsUnsubscribe = null;
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

  function playlistCollection(uid) {
    return db.collection("users").doc(uid).collection("playlists");
  }

  function backendBaseURL() {
    if (window.fsFirebaseConfig && window.fsFirebaseConfig.backendURL) {
      return String(window.fsFirebaseConfig.backendURL).replace(/\/+$/, "");
    }
    return "https://us-central1-focushift-eeb60.cloudfunctions.net/api";
  }

  function renderSignedOut() {
    teardownScriptsListener();
    teardownPlaylistsListener();
    redirectLogin();
  }

  function renderNonAdmin(email, displayName) {
    teardownScriptsListener();
    teardownPlaylistsListener();
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
    var categoryOptions = surveyCategories
      .map(function (c) {
        return '<option value="' + escapeHtml(c.id) + '">' + escapeHtml(c.name) + "</option>";
      })
      .join("");
    var voiceOptions = availableVoices
      .map(function (v) {
        var selected = v.id === selectedVoiceId ? " selected" : "";
        return (
          '<option value="' +
          escapeHtml(v.id) +
          '"' +
          selected +
          ">" +
          escapeHtml(v.name) +
          "</option>"
        );
      })
      .join("");
    root.innerHTML =
      "<h1>Focus Shift — admin</h1>" +
      "<p class=\"app-muted\">Signed in as <strong>" +
      escapeHtml(email || "") +
      "</strong> (" +
      escapeHtml(displayName || "no display name") +
      "). Stage 4 now includes personalized mental script generation (web) + My Library CRUD.</p>" +
      '<section class="app-card" aria-label="Create personalized mental script">' +
      '  <h2 style="font-size:1.1rem;margin:0 0 0.6rem;">Create Personalized Mental Script</h2>' +
      '  <p class="app-muted" style="margin-top:0;">Answer two prompts, generate with AI, and save directly to My Library.</p>' +
      '  <form id="generate-form" class="app-form" style="margin:0;">' +
      '    <label for="gen-category">Focus area</label>' +
      '    <select id="gen-category" class="app-btn" style="width:100%;text-align:left;">' +
      categoryOptions +
      "    </select>" +
      '    <label id="gen-q1-label" for="gen-q1" style="margin-top:0.8rem;">Question 1</label>' +
      '    <textarea id="gen-q1" required></textarea>' +
      '    <label id="gen-q2-label" for="gen-q2">Question 2</label>' +
      '    <textarea id="gen-q2" required></textarea>' +
      '    <label for="gen-tone">Tone</label>' +
      '    <select id="gen-tone" class="app-btn" style="width:100%;text-align:left;">' +
      '      <option value="Calming">Calming</option>' +
      '      <option value="Motivational">Motivational</option>' +
      '      <option value="Compassionate">Compassionate</option>' +
      '      <option value="Assertive">Assertive</option>' +
      "    </select>" +
      '    <label for="gen-length" style="margin-top:0.8rem;">Length</label>' +
      '    <select id="gen-length" class="app-btn" style="width:100%;text-align:left;">' +
      '      <option value="Short">Short</option>' +
      '      <option value="Medium" selected>Medium</option>' +
      '      <option value="Long">Long</option>' +
      "    </select>" +
      '    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.9rem;">' +
      '      <button type="submit" class="app-btn">Generate & Save</button>' +
      "    </div>" +
      "  </form>" +
      '  <div id="generation-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      "</section>" +
      '<div class="app-toolbar">' +
      '  <label for="global-voice" style="display:flex;align-items:center;gap:0.5rem;">' +
      '    <span class="app-muted" style="font-size:0.85rem;">Voice</span>' +
      '    <select id="global-voice" class="app-btn" style="min-width:170px;text-align:left;">' +
      voiceOptions +
      "    </select>" +
      "  </label>" +
      '  <button type="button" class="app-btn" id="btn-create-script">+ New Script</button>' +
      '  <button type="button" class="app-btn" id="btn-sign-out">Sign out</button>' +
      "</div>" +
      '<div id="scripts-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      '<div id="playlists-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      '<div id="script-editor"></div>' +
      '<section aria-label="My Library scripts">' +
      '  <h2 style="font-size:1.1rem;margin:1rem 0 0.5rem;">My Library Scripts</h2>' +
      '  <div id="scripts-list"><p class="app-muted">Loading scripts...</p></div>' +
      "</section>" +
      '<section aria-label="Playlists" style="margin-top:1rem;">' +
      '  <h2 style="font-size:1.1rem;margin:1rem 0 0.5rem;">Playlists</h2>' +
      '  <div class="app-toolbar" style="margin-top:0;">' +
      '    <button type="button" class="app-btn" id="btn-create-playlist">+ New Playlist</button>' +
      "  </div>" +
      '  <div id="playlists-list"><p class="app-muted">Loading playlists...</p></div>' +
      '  <div id="playlist-detail" style="margin-top:0.8rem;"></div>' +
      "</section>" +
      '<p class="auth-back"><a href="/">← Marketing site</a></p>';

    document.getElementById("btn-sign-out").addEventListener("click", function () {
      auth.signOut().then(redirectLogin);
    });

    document.getElementById("btn-create-script").addEventListener("click", function () {
      openEditor(null);
    });
    document.getElementById("global-voice").addEventListener("change", function (ev) {
      selectedVoiceId = ev.target.value;
      generationMessage(
        "Voice set to " +
          (availableVoices.find(function (v) {
            return v.id === selectedVoiceId;
          }) || { name: "selected voice" }).name +
          ".",
        "success"
      );
    });
    document.getElementById("gen-category").addEventListener("change", function (ev) {
      activeCategoryId = ev.target.value;
      refreshGenerationQuestions();
    });
    document.getElementById("generate-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      generateAndSavePersonalizedScript(displayName || "");
    });
    document.getElementById("btn-create-playlist").addEventListener("click", function () {
      createPlaylist();
    });
    refreshGenerationQuestions();
  }

  function generationMessage(text, kind) {
    var el = document.getElementById("generation-message");
    if (!el) return;
    el.className = "app-inline-msg" + (kind ? " " + kind : "");
    el.textContent = text || "";
  }

  function selectedCategory() {
    return (
      surveyCategories.find(function (c) {
        return c.id === activeCategoryId;
      }) || surveyCategories[0]
    );
  }

  function refreshGenerationQuestions() {
    var cat = selectedCategory();
    var q1Label = document.getElementById("gen-q1-label");
    var q2Label = document.getElementById("gen-q2-label");
    if (q1Label) q1Label.textContent = cat.questions[0] || "Question 1";
    if (q2Label) q2Label.textContent = cat.questions[1] || "Question 2";
  }

  function uniqueScriptTitle(base) {
    var root = (base || "Generated Script").trim();
    var taken = {};
    currentScripts.forEach(function (s) {
      taken[(s.title || "").trim().toLowerCase()] = true;
    });
    if (!taken[root.toLowerCase()]) return root;
    var n = 2;
    while (n < 10000) {
      var candidate = root + " (" + n + ")";
      if (!taken[candidate.toLowerCase()]) return candidate;
      n += 1;
    }
    return root + " (" + Date.now() + ")";
  }

  function userTierFallback() {
    // TODO: replace with exact subscription field mapping once web account settings are in place.
    return "starter";
  }

  function generateAndSavePersonalizedScript(displayName) {
    if (!currentUser) return;
    var cat = selectedCategory();
    var q1 = (document.getElementById("gen-q1").value || "").trim();
    var q2 = (document.getElementById("gen-q2").value || "").trim();
    var tone = document.getElementById("gen-tone").value || "Calming";
    var length = document.getElementById("gen-length").value || "Medium";
    if (!q1 || !q2) {
      generationMessage("Please answer both questions first.", "error");
      return;
    }

    generationMessage("Generating script...", "");
    currentUser
      .getIdToken(true)
      .then(function (token) {
        var payload = {
          categories: [
            {
              id: cat.id,
              name: cat.name,
              questions: cat.questions,
            },
          ],
          answers: (function () {
            var map = {};
            map[cat.id] = [q1, q2];
            return map;
          })(),
          clarifyingAnswers: {},
          tone: tone,
          length: length,
          clarifyCount: 0,
          tier: userTierFallback(),
          perspective: "First person",
          useNameInScript: false,
          userName: displayName || "",
        };

        return fetch(backendBaseURL() + "/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify(payload),
        });
      })
      .then(function (resp) {
        return resp.json().then(function (json) {
          if (!resp.ok || !json || json.ok !== true || !json.content) {
            var msg = (json && json.error) || "Generation failed.";
            throw new Error(msg);
          }
          return json;
        });
      })
      .then(function (json) {
        var title = uniqueScriptTitle(cat.name + " Script");
        var docRef = scriptCollection(currentUser.uid).doc();
        return scriptCollection(currentUser.uid)
          .doc(docRef.id)
          .set({
            title: title,
            text: String(json.content).trim(),
            createdAt: firebase.firestore.Timestamp.now(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            audioURL: "",
            backgroundID: "",
            voiceID: selectedVoiceId,
            audioCreatedAt: null,
            categoryID: cat.id,
          })
          .then(function () {
            generationMessage("Generated and saved as \"" + title + "\".", "success");
            document.getElementById("gen-q1").value = "";
            document.getElementById("gen-q2").value = "";
            setMessage("Generated script saved to My Library.", "success");
          });
      })
      .catch(function (e) {
        generationMessage(e.message || "Could not generate script.", "error");
      });
  }

  function setMessage(text, kind) {
    var el = document.getElementById("scripts-message");
    if (!el) return;
    el.className = "app-inline-msg" + (kind ? " " + kind : "");
    el.textContent = text || "";
  }

  function setPlaylistsMessage(text, kind) {
    var el = document.getElementById("playlists-message");
    if (!el) return;
    el.className = "app-inline-msg" + (kind ? " " + kind : "");
    el.textContent = text || "";
  }

  function setScriptBusy(scriptId, busy) {
    generatingAudioByScriptId[scriptId] = busy;
    renderScripts(currentScripts);
  }

  function isScriptBusy(scriptId) {
    return generatingAudioByScriptId[scriptId] === true;
  }

  function scriptCardHtml(script) {
    var plainText = script.text && script.text.trim() ? script.text : "(No text yet)";
    var isBusy = isScriptBusy(script.id);
    var hasAudio = !!(script.audioURL && String(script.audioURL).trim());
    var playingThis = activeAudioScriptId === script.id && activeAudio && !activeAudio.paused;
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
      '  <button type="button" class="app-btn" data-action="generate-audio" data-script-id="' +
      escapeHtml(script.id) +
      '"' +
      (isBusy ? " disabled" : "") +
      ">" +
      (isBusy ? "Generating audio..." : "Generate Audio") +
      "</button>" +
      '  <button type="button" class="app-btn" data-action="play-audio" data-script-id="' +
      escapeHtml(script.id) +
      '"' +
      (!hasAudio || isBusy ? " disabled" : "") +
      ">" +
      (playingThis ? "Pause" : "Play") +
      "</button>" +
      '  <button type="button" class="app-btn" data-action="edit" data-script-id="' +
      escapeHtml(script.id) +
      '">Edit</button>' +
      '  <button type="button" class="app-btn app-btn-danger" data-action="delete" data-script-id="' +
      escapeHtml(script.id) +
      '">Delete</button>' +
      '  <button type="button" class="app-btn" data-action="add-to-playlist" data-script-id="' +
      escapeHtml(script.id) +
      '"' +
      (!currentPlaylists.length ? " disabled" : "") +
      ">Add to Playlist</button>" +
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
        } else if (action === "generate-audio") {
          generateAudioForScript(script);
        } else if (action === "play-audio") {
          togglePlayScriptAudio(script);
        } else if (action === "add-to-playlist") {
          addScriptToPlaylistPrompt(script);
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

  function stopActiveAudio(resetQueue) {
    if (typeof resetQueue === "undefined") resetQueue = true;
    if (activeAudio) {
      try {
        activeAudio.pause();
      } catch (_e) {}
    }
    activeAudio = null;
    activeAudioScriptId = null;
    if (resetQueue) {
      activePlaylistQueue = [];
      activePlaylistIndex = -1;
    }
  }

  function togglePlayScriptAudio(script) {
    var audioURL = script.audioURL && String(script.audioURL).trim();
    if (!audioURL) {
      setMessage("No audio yet for this script.", "error");
      return;
    }
    if (activeAudioScriptId === script.id && activeAudio) {
      if (activeAudio.paused) {
        activeAudio.play().catch(function () {
          setMessage("Could not play audio in browser.", "error");
        });
      } else {
        activeAudio.pause();
      }
      renderScripts(currentScripts);
      return;
    }

    stopActiveAudio();
    activeAudio = new Audio(audioURL);
    activeAudioScriptId = script.id;
    activeAudio.addEventListener("ended", function () {
      activeAudioScriptId = null;
      activeAudio = null;
      renderScripts(currentScripts);
    });
    activeAudio
      .play()
      .then(function () {
        renderScripts(currentScripts);
      })
      .catch(function () {
        setMessage("Could not play audio in browser.", "error");
        stopActiveAudio();
        renderScripts(currentScripts);
      });
  }

  function playQueueAt(index) {
    if (!activePlaylistQueue.length) return;
    if (index < 0 || index >= activePlaylistQueue.length) {
      stopActiveAudio();
      renderSelectedPlaylistDetail();
      renderScripts(currentScripts);
      return;
    }
    var script = activePlaylistQueue[index];
    var audioURL = script.audioURL && String(script.audioURL).trim();
    if (!audioURL) {
      playQueueAt(index + 1);
      return;
    }
    stopActiveAudio(false);
    activePlaylistIndex = index;
    activeAudioScriptId = script.id;
    activeAudio = new Audio(audioURL);
    activeAudio.addEventListener("ended", function () {
      playQueueAt(activePlaylistIndex + 1);
    });
    activeAudio
      .play()
      .then(function () {
        renderSelectedPlaylistDetail();
        renderScripts(currentScripts);
      })
      .catch(function () {
        setPlaylistsMessage("Could not play playlist audio in browser.", "error");
        stopActiveAudio();
        renderSelectedPlaylistDetail();
      });
  }

  function startPlaylistPlayback(playlist) {
    var scripts = resolvePlaylistScripts(playlist).filter(function (s) {
      return !!(s.audioURL && String(s.audioURL).trim());
    });
    if (!scripts.length) {
      setPlaylistsMessage("No playable audio in this playlist yet.", "error");
      return;
    }
    activePlaylistQueue = scripts;
    playQueueAt(0);
  }

  function backendRequest(path, token, body) {
    return fetch(backendBaseURL() + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify(body),
    }).then(function (resp) {
      return resp.json().then(function (json) {
        if (!resp.ok) {
          throw new Error((json && json.error) || "Request failed");
        }
        return json;
      });
    });
  }

  function generateAudioForScript(script) {
    if (!currentUser) return;
    var text = (script.text || "").trim();
    if (!text) {
      setMessage("Script text is empty. Add text before generating audio.", "error");
      return;
    }
    setScriptBusy(script.id, true);
    setMessage('Submitting audio job for "' + script.title + '"...', "");

    currentUser
      .getIdToken(true)
      .then(function (token) {
        var payload = {
          scriptId: script.id,
          text: text,
          scriptTitle: script.title || "Untitled Script",
          voiceID:
            script.voiceID && script.voiceID !== "default"
              ? script.voiceID
              : selectedVoiceId,
          backgroundID: script.backgroundID || "",
          createdAt:
            script.createdAt && typeof script.createdAt.toDate === "function"
              ? script.createdAt.toDate().getTime() / 1000
              : Date.now() / 1000,
        };
        return backendRequest("/audio-jobs", token, payload).then(function (json) {
          if (!json || json.ok !== true || !json.jobId) {
            throw new Error("Audio job did not return a job id.");
          }
          return { token: token, jobId: json.jobId };
        });
      })
      .then(function (ctx) {
        return waitForAudioJob(script, ctx.jobId);
      })
      .then(function (result) {
        return scriptCollection(currentUser.uid)
          .doc(script.id)
          .set(
            {
              audioURL: result.audioURL,
              audioCreatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          )
          .then(function () {
            setMessage('Audio generated for "' + script.title + '".', "success");
          });
      })
      .catch(function (e) {
        setMessage(e.message || "Audio generation failed.", "error");
      })
      .finally(function () {
        setScriptBusy(script.id, false);
      });
  }

  function waitForAudioJob(script, jobId) {
    return new Promise(function (resolve, reject) {
      var timeout = setTimeout(function () {
        cleanup();
        reject(new Error("Audio generation timed out. Please try again."));
      }, 240000);
      var unsub = db
        .collection("users")
        .doc(currentUser.uid)
        .collection("audioJobs")
        .doc(jobId)
        .onSnapshot(
          function (snap) {
            var data = (snap && snap.data()) || {};
            var status = data.status;
            if (!status) return;

            if (status === "failed") {
              cleanup();
              reject(new Error(data.error || "Audio job failed."));
              return;
            }
            if (status === "awaiting_client_mix") {
              cleanup();
              reject(
                new Error(
                  "This script needs client-side background mixing which is not supported on web yet. Try with no background."
                )
              );
              return;
            }
            if (status === "completed") {
              var audioURL = data.persistentAudioURL || data.finalDownloadURL;
              cleanup();
              if (!audioURL) {
                reject(new Error("Audio completed but no download URL was returned."));
                return;
              }
              resolve({ audioURL: audioURL });
            }
          },
          function (err) {
            cleanup();
            reject(new Error(err && err.message ? err.message : "Could not watch audio job."));
          }
        );

      function cleanup() {
        clearTimeout(timeout);
        if (typeof unsub === "function") unsub();
      }
    });
  }

  function parsePlaylistItems(data) {
    if (Array.isArray(data.items)) {
      return data.items
        .filter(function (x) {
          return x && x.type === "script" && typeof x.id === "string" && x.id.trim();
        })
        .map(function (x) {
          return x.id;
        });
    }
    if (Array.isArray(data.scriptIDs)) return data.scriptIDs.slice();
    return [];
  }

  function resolvePlaylistScripts(playlist) {
    var ids = playlist.scriptIDs || [];
    var byId = {};
    currentScripts.forEach(function (s) {
      byId[s.id] = s;
    });
    return ids
      .map(function (id) {
        return byId[id] || null;
      })
      .filter(function (x) {
        return !!x;
      });
  }

  function renderPlaylists(playlists) {
    var list = document.getElementById("playlists-list");
    if (!list) return;
    if (!playlists.length) {
      list.innerHTML = '<div class="app-card"><p class="app-muted">No playlists yet.</p></div>';
      renderSelectedPlaylistDetail();
      return;
    }
    list.innerHTML = playlists
      .map(function (p) {
        var selected = p.id === selectedPlaylistId;
        return (
          '<article class="app-card" data-playlist-id="' +
          escapeHtml(p.id) +
          '" style="' +
          (selected ? "border-color:#2563eb;" : "") +
          '">' +
          "<h3>" +
          escapeHtml(p.name || "Untitled Playlist") +
          "</h3>" +
          '<div class="app-card-meta">' +
          (p.scriptIDs ? p.scriptIDs.length : 0) +
          " item(s)</div>" +
          '<div class="app-card-actions">' +
          '  <button type="button" class="app-btn" data-playlist-action="open" data-playlist-id="' +
          escapeHtml(p.id) +
          '">Open</button>' +
          '  <button type="button" class="app-btn" data-playlist-action="rename" data-playlist-id="' +
          escapeHtml(p.id) +
          '">Rename</button>' +
          '  <button type="button" class="app-btn app-btn-danger" data-playlist-action="delete" data-playlist-id="' +
          escapeHtml(p.id) +
          '">Delete</button>' +
          "</div>" +
          "</article>"
        );
      })
      .join("");

    list.querySelectorAll("[data-playlist-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var action = btn.getAttribute("data-playlist-action");
        var pid = btn.getAttribute("data-playlist-id");
        var playlist = currentPlaylists.find(function (p) {
          return p.id === pid;
        });
        if (!playlist) return;
        if (action === "open") {
          selectedPlaylistId = playlist.id;
          renderPlaylists(currentPlaylists);
          renderSelectedPlaylistDetail();
        } else if (action === "rename") {
          renamePlaylist(playlist);
        } else if (action === "delete") {
          deletePlaylist(playlist);
        }
      });
    });
  }

  function renderSelectedPlaylistDetail() {
    var el = document.getElementById("playlist-detail");
    if (!el) return;
    var p = currentPlaylists.find(function (x) {
      return x.id === selectedPlaylistId;
    });
    if (!p) {
      el.innerHTML = "";
      return;
    }
    var scripts = resolvePlaylistScripts(p);
    var isPlayingPlaylist = activePlaylistQueue.length > 0;
    el.innerHTML =
      '<article class="app-card">' +
      "<h3>" +
      escapeHtml(p.name) +
      "</h3>" +
      '<div class="app-card-actions">' +
      '  <button type="button" class="app-btn" id="btn-play-playlist">' +
      (isPlayingPlaylist ? "Restart playlist" : "Play playlist") +
      "</button>" +
      '  <button type="button" class="app-btn" id="btn-stop-playlist">Stop</button>' +
      "</div>" +
      (scripts.length
        ? '<ul style="margin:0.8rem 0 0;padding-left:1.1rem;">' +
          scripts
            .map(function (s, idx) {
              var marker =
                activePlaylistQueue.length &&
                activePlaylistQueue[activePlaylistIndex] &&
                activePlaylistQueue[activePlaylistIndex].id === s.id
                  ? " ▶"
                  : "";
              return (
                "<li>" +
                escapeHtml(s.title || "Untitled") +
                (s.audioURL ? "" : " (no audio)") +
                marker +
                "</li>"
              );
            })
            .join("") +
          "</ul>"
        : '<p class="app-muted">No scripts in this playlist yet.</p>') +
      "</article>";

    document.getElementById("btn-play-playlist").addEventListener("click", function () {
      startPlaylistPlayback(p);
    });
    document.getElementById("btn-stop-playlist").addEventListener("click", function () {
      stopActiveAudio();
      renderSelectedPlaylistDetail();
      renderScripts(currentScripts);
    });
  }

  function createPlaylist() {
    if (!currentUser) return;
    var name = window.prompt("Playlist name:");
    if (!name) return;
    var trimmed = name.trim();
    if (!trimmed) return;
    var order = currentPlaylists.reduce(function (max, p) {
      return Math.max(max, p.order || 0);
    }, -1);
    playlistCollection(currentUser.uid)
      .add({
        name: trimmed,
        colorIndex: 0,
        scriptIDs: [],
        items: [],
        loop: false,
        mixMode: false,
        order: order + 1,
      })
      .then(function () {
        setPlaylistsMessage('Playlist "' + trimmed + '" created.', "success");
      })
      .catch(function (e) {
        setPlaylistsMessage(e.message || "Could not create playlist.", "error");
      });
  }

  function renamePlaylist(playlist) {
    if (!currentUser) return;
    var name = window.prompt("Rename playlist:", playlist.name || "");
    if (!name) return;
    var trimmed = name.trim();
    if (!trimmed) return;
    playlistCollection(currentUser.uid)
      .doc(playlist.id)
      .set({ name: trimmed }, { merge: true })
      .then(function () {
        setPlaylistsMessage("Playlist renamed.", "success");
      })
      .catch(function (e) {
        setPlaylistsMessage(e.message || "Could not rename playlist.", "error");
      });
  }

  function deletePlaylist(playlist) {
    if (!currentUser) return;
    if (!window.confirm('Delete playlist "' + playlist.name + '"?')) return;
    playlistCollection(currentUser.uid)
      .doc(playlist.id)
      .delete()
      .then(function () {
        if (selectedPlaylistId === playlist.id) selectedPlaylistId = null;
        setPlaylistsMessage("Playlist deleted.", "success");
      })
      .catch(function (e) {
        setPlaylistsMessage(e.message || "Could not delete playlist.", "error");
      });
  }

  function addScriptToPlaylistPrompt(script) {
    if (!currentUser) return;
    if (!currentPlaylists.length) {
      setPlaylistsMessage("Create a playlist first.", "error");
      return;
    }
    var choices = currentPlaylists
      .map(function (p, i) {
        return i + 1 + ". " + p.name;
      })
      .join("\n");
    var raw = window.prompt(
      "Add \"" + script.title + "\" to which playlist?\n\n" + choices + "\n\nEnter number:"
    );
    if (!raw) return;
    var idx = parseInt(raw, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= currentPlaylists.length) {
      setPlaylistsMessage("Invalid playlist selection.", "error");
      return;
    }
    var p = currentPlaylists[idx];
    var ids = (p.scriptIDs || []).slice();
    if (!ids.includes(script.id)) ids.push(script.id);
    var items = ids.map(function (id) {
      return { type: "script", id: id };
    });
    playlistCollection(currentUser.uid)
      .doc(p.id)
      .set(
        {
          scriptIDs: ids,
          items: items,
        },
        { merge: true }
      )
      .then(function () {
        setPlaylistsMessage('Added to "' + p.name + '".', "success");
      })
      .catch(function (e) {
        setPlaylistsMessage(e.message || "Could not add to playlist.", "error");
      });
  }

  function subscribePlaylists(uid) {
    teardownPlaylistsListener();
    playlistsUnsubscribe = playlistCollection(uid)
      .orderBy("order", "asc")
      .onSnapshot(
        function (snap) {
          currentPlaylists = snap.docs.map(function (doc) {
            var data = doc.data() || {};
            return {
              id: doc.id,
              name: data.name || "Untitled Playlist",
              colorIndex: data.colorIndex || 0,
              order: data.order || 0,
              scriptIDs: parsePlaylistItems(data),
              loop: !!data.loop,
              mixMode: !!data.mixMode,
            };
          });
          if (!selectedPlaylistId && currentPlaylists.length) {
            selectedPlaylistId = currentPlaylists[0].id;
          }
          if (
            selectedPlaylistId &&
            !currentPlaylists.some(function (p) {
              return p.id === selectedPlaylistId;
            })
          ) {
            selectedPlaylistId = currentPlaylists.length ? currentPlaylists[0].id : null;
          }
          renderPlaylists(currentPlaylists);
          renderSelectedPlaylistDetail();
          renderScripts(currentScripts);
        },
        function (e) {
          setPlaylistsMessage(e.message || "Could not load playlists.", "error");
          currentPlaylists = [];
          renderPlaylists([]);
        }
      );
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
              audioURL: data.audioURL || "",
              voiceID: data.voiceID || "",
              backgroundID: data.backgroundID || "",
              createdAt: data.createdAt || null,
              updatedAt: data.updatedAt || null,
            };
          });
          currentScripts = scripts;
          renderScripts(scripts);
          renderSelectedPlaylistDetail();
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
          subscribePlaylists(user.uid);
        } else {
          renderNonAdmin(user.email, user.displayName);
        }
      })
      .catch(function () {
        renderNonAdmin(user.email, user.displayName);
      });
  });
})();
