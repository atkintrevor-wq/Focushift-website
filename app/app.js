(function () {
  "use strict";

  var root = document.getElementById("root");
  var scriptsUnsubscribe = null;
  var playlistsUnsubscribe = null;
  var premadeUnsubscribe = null;
  var clonedVoicesUnsubscribe = null;
  var currentUser = null;
  var currentScripts = [];
  var currentPlaylists = [];
  var currentPremade = [];
  var currentClonedVoices = [];
  var currentUserProfile = null;
  var isEditing = false;
  var editingScriptId = null;
  var generatingAudioByScriptId = {};
  var activeAudio = null;
  var activeAudioScriptId = null;
  var activeAudioTitle = "";
  var activePreviewBlobURL = null;
  var activePlaylistQueue = [];
  var activePlaylistIndex = -1;
  var selectedPlaylistId = null;
  var activeAdminTab = "home";
  var ADMIN_TAB_STORAGE_KEY = "focusshiftWebAdminTab";
  var playlistPickerScript = null;
  var playlistPickerSuccessHandler = null;
  var publishCategoryId = "confidence";
  var publishTextDirty = false;
  var publishTitleDirty = false;
  var editingPremadeId = null;
  var expandedScriptTextById = {};
  var expandedPremadeTextById = {};
  var premadeVoiceOverrideById = {};
  var premadeBackgroundOverrideById = {};
  var mediaPickerTarget = null;
  var editingVoiceSettingsId = null;
  var editingVoiceSettingsToken = "";
  var activeVoiceRecorder = null;
  var activeVoiceRecorderStream = null;
  var activeVoiceRecorderChunks = [];
  var activeVoiceRecordingTimer = null;
  var activeVoiceRecordingStartedAt = 0;
  var hasVoiceCloneConsent = false;
  var voiceProcessingStatusTimer = null;
  var activeVoiceScriptParagraphIndex = -1;
  var recordedSampleFile = null;
  var recordedSampleBlobURL = null;
  var recordedSampleAudio = null;
  var recordedSampleDurationSec = 0;
  var cloneAdjustLocalVoiceId = "";
  var cloneAdjustElevenLabsVoiceId = "";
  var cloneAdjustVoiceName = "";
  var cloneAdjustToken = "";
  var voiceCloneReadScript =
    "Hello, this is my voice sample for cloning. I'm speaking naturally and clearly, just like I would in a normal conversation with a friend.\n\n" +
    "I want this recording to capture the full range of my voice - from high to low pitches, from soft to loud volumes, and from different emotional tones. I'm speaking at a comfortable pace, not too fast and not too slow.\n\n" +
    "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet, which helps capture all the different sounds I can make when speaking.\n\n" +
    "I'm trying to sound natural and authentic, just like myself. This is important because I want my cloned voice to sound like the real me - with my unique tone, my way of speaking, and my personality.\n\n" +
    "I believe that affirmations work best when they sound like they're coming from within, from my own inner voice. That's why I'm taking the time to create this recording, so the voice that speaks my affirmations will truly feel like my own.\n\n" +
    "Thank you for listening. I hope this captures everything needed to create an accurate and authentic clone of my voice.";
  var activeVoicesTab = "my-voices";
  var selectedVoiceId = "lnieQLGTodpbhjpZtg1k"; // Bill
  var selectedBackgroundId = "bg-none";
  var availableVoices = [
    { id: "YZHSTqsq1isdXNsFLzBw", name: "Isa", description: "smooth, charming female" },
    { id: "rJ9XoWu8gbUhVKZnKY8X", name: "Lori", description: "Warm, Engaging and Caring" },
    { id: "l32B8XDoylOsZKiSdfhE", name: "Carla", description: "Sweet, Soft and Meditative" },
    { id: "1wGbFxmAM3Fgw63G1zZJ", name: "Allison", description: "Calm, Soothing and Meditative" },
    { id: "tOEwa4nCo7gciO1FbUBK", name: "Stephen", description: "Raspy Senior Narrator" },
    { id: "87tjwokZlpNU7QL3HaLP", name: "Zane", description: "Raspy and Convincing" },
    { id: "7dEuJHhweR5AFXA4INkB", name: "Carol", description: "Warm, Smooth & Luxurious" },
    { id: "xctasy8XvGp2cVO9HL9k", name: "Samantha", description: "Energetic, Clear and Bubbly" },
    { id: "6F5Zhi321D3Oq7v1oNT4", name: "Hank", description: "Deep and Engaging Narrator" },
    { id: "FVQMzxJGPUBtfz1Azdoy", name: "Danielle", description: "Gentle and Engaging Narrator" },
    { id: "NNl6r8mD7vthiJatiJt1", name: "Bradford", description: "Expressive and Articulate" },
    { id: "gUABw7pXQjhjt0kNFBTF", name: "Andrew", description: "Smooth, Smart and Clear" },
    { id: "kqVT88a5QfII1HNAEPTJ", name: "Sage", description: "Wise and Captivating" },
    { id: "EkK5I93UQWFDigLMpZcX", name: "James", description: "Husky, Engaging and Bold" },
    { id: "NtS6nEHDYMQC9QczMQuq", name: "Katherine", description: "Calm Luxury Narrator" },
    { id: "BpjGufoPiobT79j2vtj4", name: "Priyanka", description: "Calm, Neutral and Relaxed" },
    { id: "wAGzRVkxKEs8La0lmdrE", name: "Sully", description: "Mature, Deep and Intriguing" },
    { id: "dPah2VEoifKnZT37774q", name: "Knox", description: "Serious, Deep, and Steady" },
    { id: "MFZUKuGQUsGJPQjTS4wC", name: "Jon", description: "Warm & Grounded Storyteller" },
    { id: "uju3wxzG5OhpWcoi3SMy", name: "Michael", description: "Confident, Expressive" },
    { id: "lnieQLGTodpbhjpZtg1k", name: "Bill", description: "Clear and Articulate" },
    { id: "ZthjuvLPty3kTMaNKVKb", name: "Jackson", description: "Confident and Reliable" },
    { id: "lxYfHSkYm1EzQzGhdbfc", name: "Jessica", description: "Confident. Conversational" },
    { id: "8LVfoRdkh4zgjr8v5ObE", name: "Clara", description: "Soothing, Warm and Friendly" },
    { id: "EiNlNiXeDU1pqqOPrYMO", name: "Paul", description: "Deep Voice" },
    { id: "YgzytRZyVmEux6PCtJYB", name: "Ivanna", description: "Sultry & Captivating" },
    { id: "A7LE95x99tn9HChsblA6", name: "Rebecca", description: "Hypnotic Female voice" },
    { id: "iZURAYccQtQd12U8kEcq", name: "Roland", description: "Middle-aged male voice" },
    { id: "5F6a8n4ijdCrImoXgxM9", name: "Mark", description: "Very Deep, Confident, Professional" },
  ];
  var availableBackgrounds = [
    { id: "bg-none", name: "No Background", categoryID: "general" },
    { id: "bg-rain", name: "Rain", categoryID: "general" },
    { id: "bg-calm-night", name: "Calm Night", categoryID: "general" },
    { id: "bg-meditation", name: "Meditation Background", categoryID: "general" },
    { id: "bg-piano", name: "Piano Background", categoryID: "general" },
    { id: "bg-soft-calm-piano", name: "Soft Calm Piano", categoryID: "general" },
    { id: "bg-inner-calm", name: "Inner Calm", categoryID: "mental-wellbeing" },
    { id: "bg-calm-groove", name: "Calm Groove", categoryID: "confidence" },
    { id: "bg-warm-melody", name: "Warm Melody", categoryID: "relationships" },
    { id: "bg-calm-piano-whisper", name: "Calm Piano Whisper", categoryID: "sleep-rest" },
  ];
  var activeCategoryId = "confidence";
  var homeFlowStep = "landing";
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

  function teardownPremadeListener() {
    if (typeof premadeUnsubscribe === "function") {
      premadeUnsubscribe();
      premadeUnsubscribe = null;
    }
  }

  function teardownClonedVoicesListener() {
    if (typeof clonedVoicesUnsubscribe === "function") {
      clonedVoicesUnsubscribe();
      clonedVoicesUnsubscribe = null;
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

  function formatDateString(dateLike) {
    if (!dateLike) return "Unknown";
    var d = new Date(dateLike);
    if (isNaN(d.getTime())) return "Unknown";
    try {
      return d.toLocaleString();
    } catch (_e) {
      return "Unknown";
    }
  }

  function scriptCollection(uid) {
    return db.collection("users").doc(uid).collection("scripts");
  }

  function playlistCollection(uid) {
    return db.collection("users").doc(uid).collection("playlists");
  }

  function premadeCollection() {
    return db.collection("premadeAudio");
  }

  function clonedVoicesCollection(uid) {
    return db.collection("users").doc(uid).collection("clonedVoices");
  }

  function backendBaseURL() {
    if (window.fsFirebaseConfig && window.fsFirebaseConfig.backendURL) {
      return String(window.fsFirebaseConfig.backendURL).replace(/\/+$/, "");
    }
    return "https://us-central1-focushift-eeb60.cloudfunctions.net/api";
  }

  function renderSignedOut() {
    hasVoiceCloneConsent = false;
    stopVoiceRecording();
    stopVoiceRecorderStream();
    setVoiceRecordingGuideVisible(false);
    closeVoiceProcessingModal();
    closeVoiceAdjustModal();
    closeVoiceCompleteModal();
    closeVoiceMicHelpModal();
    teardownScriptsListener();
    teardownPlaylistsListener();
    teardownPremadeListener();
    teardownClonedVoicesListener();
    redirectLogin();
  }

  function renderNonAdmin(email, displayName) {
    hasVoiceCloneConsent = false;
    stopVoiceRecording();
    stopVoiceRecorderStream();
    setVoiceRecordingGuideVisible(false);
    closeVoiceProcessingModal();
    closeVoiceAdjustModal();
    closeVoiceCompleteModal();
    closeVoiceMicHelpModal();
    teardownScriptsListener();
    teardownPlaylistsListener();
    teardownPremadeListener();
    teardownClonedVoicesListener();
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
      "). Web workspace is live with Home flow, My Library, Playlists, Voices, Backgrounds, and App Library tools.</p>" +
      '<nav class="app-tabs" aria-label="Admin sections">' +
      '  <button type="button" class="app-tab-btn" data-admin-tab="home">Home</button>' +
      '  <button type="button" class="app-tab-btn" data-admin-tab="library">My Library <span class="app-tab-count" id="count-library">0</span></button>' +
      '  <button type="button" class="app-tab-btn" data-admin-tab="playlists">Playlists <span class="app-tab-count" id="count-playlists">0</span></button>' +
      '  <button type="button" class="app-tab-btn" data-admin-tab="voices">Voices</button>' +
      '  <button type="button" class="app-tab-btn" data-admin-tab="backgrounds">Backgrounds</button>' +
      '  <button type="button" class="app-tab-btn" data-admin-tab="app-library">App Library <span class="app-tab-count" id="count-premade">0</span></button>' +
      '  <button type="button" class="app-tab-btn" data-admin-tab="account">Account</button>' +
      "</nav>" +
      '<section id="section-home" class="app-section" aria-label="Home">' +
      '<section class="app-card" aria-label="Focus Shift home">' +
      '  <h2 style="font-size:1.1rem;margin:0 0 0.6rem;">Home</h2>' +
      '  <div id="home-flow"></div>' +
      '  <div id="generation-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      "</section>" +
      "</section>" +
      '<section id="section-library" class="app-section">' +
      '<div class="app-toolbar">' +
      '  <button type="button" class="app-btn" id="btn-create-script">+ New Script</button>' +
      "</div>" +
      '<div id="scripts-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      '<div id="playlists-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      '<div id="premade-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      '<div id="script-editor"></div>' +
      '<section aria-label="My Library scripts">' +
      '  <div class="app-section-title-row"><h2>My Library Scripts</h2></div>' +
      '  <div id="scripts-list"><p class="app-muted">Loading scripts...</p></div>' +
      "</section>" +
      "</section>" +
      '<section id="section-playlists" class="app-section">' +
      '<section aria-label="Playlists" style="margin-top:1rem;">' +
      '  <div class="app-section-title-row"><h2>Playlists</h2></div>' +
      '  <div class="app-toolbar" style="margin-top:0;">' +
      '    <button type="button" class="app-btn" id="btn-create-playlist">+ New Playlist</button>' +
      "  </div>" +
      '  <div id="playlists-list"><p class="app-muted">Loading playlists...</p></div>' +
      '  <div id="playlist-detail" style="margin-top:0.8rem;"></div>' +
      "</section>" +
      "</section>" +
      '<section id="section-voices" class="app-section">' +
      '<section class="app-card" aria-label="Voice settings">' +
      '  <h2 style="font-size:1.1rem;margin:0 0 0.6rem;">Voices</h2>' +
      '  <p class="app-muted" style="margin-top:0;">Choose from App Voices or manage My Voices (saved + cloned), then set defaults.</p>' +
      '  <div class="app-tabs" style="margin-top:0.5rem;">' +
      '    <button type="button" class="app-tab-btn" id="voices-tab-my" data-voices-tab="my-voices">My Voices</button>' +
      '    <button type="button" class="app-tab-btn" id="voices-tab-app" data-voices-tab="app-voices">App Voices</button>' +
      "  </div>" +
      '  <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.5rem;">' +
      '    <button type="button" class="app-btn app-btn-secondary" id="btn-voice-clone">Upload Voice Audio</button>' +
      '    <button type="button" class="app-btn app-btn-secondary" id="btn-voice-record">Clone Voice</button>' +
      "  </div>" +
      '  <p class="app-muted" style="margin-top:-0.2rem;margin-bottom:0.35rem;">Use <strong>Upload Voice Audio</strong> for an existing file, or <strong>Clone Voice</strong> to record a guided sample in-browser.</p>' +
      '  <div class="app-empty-hint" style="border-style:solid;padding:0.65rem;margin-top:0;margin-bottom:0.55rem;">' +
      '    <div style="display:flex;flex-direction:column;gap:0.2rem;">' +
      '      <div class="app-muted"><strong>Recording tips</strong></div>' +
      '      <div class="app-muted">- Record 1-2 minutes of clear speech</div>' +
      '      <div class="app-muted">- Speak naturally at a consistent volume</div>' +
      '      <div class="app-muted">- Minimize background noise</div>' +
      '      <div class="app-muted">- Supported formats: MP3, WAV, M4A (upload)</div>' +
      "    </div>" +
      "  </div>" +
      '  <div id="voice-recording-status" class="app-inline-msg" style="margin-top:0;margin-bottom:0.6rem;"></div>' +
      '  <div id="voice-recording-guide" class="app-empty-hint voice-recording-guide" style="display:none;margin-top:0;margin-bottom:0.7rem;">' +
      '    <div class="voice-recording-guide-head">' +
      '      <strong>Read this script while recording</strong>' +
      '      <div class="voice-recording-guide-controls">' +
      '        <span id="voice-recording-guide-time" class="voice-recording-guide-time">0:00</span>' +
      '        <button type="button" class="app-btn app-btn-secondary" id="voice-recording-toggle">Start Recording</button>' +
      "      </div>" +
      "    </div>" +
      '    <div class="voice-recording-guide-sub">Speak clearly in a quiet place. Aim for 30s minimum, 1-2 minutes best.</div>' +
      '    <div id="voice-recording-script" class="voice-recording-script"></div>' +
      '    <div id="voice-recording-review" style="display:none;margin-top:0.6rem;">' +
      '      <div class="app-empty-hint" style="border-style:solid;padding:0.62rem;">' +
      '        <div style="display:flex;justify-content:space-between;gap:0.6rem;align-items:center;">' +
      '          <div><strong>Review your recording</strong><div id="voice-recording-review-duration" class="app-muted">0:00</div></div>' +
      '          <div style="display:flex;gap:0.4rem;flex-wrap:wrap;justify-content:flex-end;">' +
      '            <button type="button" class="app-btn app-btn-secondary" id="voice-recording-play">Play</button>' +
      '            <button type="button" class="app-btn app-btn-ghost" id="voice-recording-again">Record Again</button>' +
      '            <button type="button" class="app-btn" id="voice-recording-use">Use Recording</button>' +
      "          </div>" +
      "        </div>" +
      "      </div>" +
      "    </div>" +
      "  </div>" +
      '  <div id="voices-list"></div>' +
      '  <div id="voices-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      '  <input id="voice-upload-input" type="file" accept="audio/*" style="display:none;" />' +
      "</section>" +
      "</section>" +
      '<section id="section-backgrounds" class="app-section">' +
      '<section class="app-card" aria-label="Background settings">' +
      '  <h2 style="font-size:1.1rem;margin:0 0 0.6rem;">Backgrounds</h2>' +
      '  <p class="app-muted" style="margin-top:0;">Set your default background for new scripts and audio generation.</p>' +
      '  <div id="backgrounds-list"></div>' +
      '  <div id="backgrounds-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      "</section>" +
      "</section>" +
      '<section id="section-app-library" class="app-section">' +
      '<section aria-label="App Library (Premade)" style="margin-top:1rem;">' +
      '  <div class="app-section-title-row"><h2>App Library (Premade)</h2><button type="button" class="app-btn" id="btn-open-publish-premade">Publish from My Library</button></div>' +
      '  <div id="premade-list"><p class="app-muted">Loading premade scripts...</p></div>' +
      "</section>" +
      "</section>" +
      '<section id="section-account" class="app-section">' +
      '<section class="app-card" aria-label="Account settings">' +
      '  <h2 style="font-size:1.1rem;margin:0 0 0.6rem;">Account</h2>' +
      '  <p class="app-muted" style="margin-top:0;">Signed in as <strong>' +
      escapeHtml(email || "") +
      "</strong></p>" +
      '  <p class="app-muted" style="margin:0 0 0.7rem;">Last login: <strong id="account-last-login">' +
      escapeHtml(formatDateString(currentUser && currentUser.metadata && currentUser.metadata.lastSignInTime)) +
      "</strong></p>" +
      '  <form id="account-form" class="app-form" style="margin:0;">' +
      '    <label for="account-display-name">Display name</label>' +
      '    <input id="account-display-name" type="text" maxlength="80" value="' +
      escapeHtml(displayName || "") +
      '">' +
      '    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">' +
      '      <button type="submit" class="app-btn">Save display name</button>' +
      '      <button type="button" class="app-btn" id="account-password-reset">Send password reset email</button>' +
      '      <button type="button" class="app-btn" id="account-refresh-token">Refresh session</button>' +
      '      <button type="button" class="app-btn app-btn-danger" id="account-signout">Sign out</button>' +
      "    </div>" +
      "  </form>" +
      '  <div id="account-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      "</section>" +
      "</section>" +
      '<div id="mini-player" class="mini-player" hidden>' +
      '  <div class="mini-player-inner">' +
      '    <div id="mini-player-title" class="mini-player-title">Now playing</div>' +
      '    <div class="mini-player-controls">' +
      '      <button type="button" id="mini-player-toggle" class="mini-player-btn">Play</button>' +
      '      <button type="button" id="mini-player-stop" class="mini-player-btn">Stop</button>' +
      "    </div>" +
      '    <div id="mini-player-time" class="mini-player-time">0:00</div>' +
      "  </div>" +
      "</div>" +
      '<div id="playlist-picker-backdrop" class="app-modal-backdrop" hidden>' +
      '  <div class="app-modal" role="dialog" aria-modal="true" aria-label="Select playlist">' +
      "    <h3>Select playlist</h3>" +
      '    <p class="app-muted" style="margin:0 0 0.45rem;">Choose a playlist for this script, or create a new one.</p>' +
      '    <div class="app-modal-row">' +
      '      <input id="playlist-new-name" type="text" placeholder="New playlist name" style="flex:1;min-width:0;">' +
      '      <button type="button" class="app-btn" id="playlist-create-btn">Create</button>' +
      "    </div>" +
      '    <div id="playlist-picker-list" class="app-modal-list"></div>' +
      '    <div class="app-modal-actions">' +
      '      <button type="button" class="app-btn" id="playlist-picker-close">Close</button>' +
      "    </div>" +
      "  </div>" +
      "</div>" +
      '<div id="premade-publish-backdrop" class="app-modal-backdrop" hidden>' +
      '  <div class="app-modal" role="dialog" aria-modal="true" aria-label="Publish premade">' +
      "    <h3>Publish to App Library</h3>" +
      '    <p class="app-muted" style="margin:0 0 0.45rem;">Select one of your scripts and publish it to Firestore <code>premadeAudio</code> so it appears in App Library on web and iOS cloud feeds.</p>' +
      '    <label for="publish-script-id">Script</label>' +
      '    <select id="publish-script-id"></select>' +
      '    <label for="publish-title">Title</label>' +
      '    <input id="publish-title" type="text" maxlength="120" placeholder="Premade title">' +
      '    <div id="publish-title-dirty" class="app-inline-msg" style="display:none;margin-top:-0.35rem;margin-bottom:0.4rem;">Title edited from selected script.</div>' +
      '    <label for="publish-category">Category</label>' +
      '    <select id="publish-category"></select>' +
      '    <label for="publish-description">Description (optional)</label>' +
      '    <input id="publish-description" type="text" maxlength="180" placeholder="Short description">' +
      '    <label for="publish-script-text">Script text (optional, defaults from selected script)</label>' +
      '    <textarea id="publish-script-text" rows="5" placeholder="If left empty, selected script text is used"></textarea>' +
      '    <div id="publish-text-dirty" class="app-inline-msg" style="display:none;margin-top:-0.35rem;">Script text edited from selected script.</div>' +
      '    <div id="publish-premade-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      '    <div class="app-modal-actions">' +
      '      <button type="button" class="app-btn" id="premade-publish-cancel">Cancel</button>' +
      '      <button type="button" class="app-btn" id="premade-publish-submit">Publish</button>' +
      "    </div>" +
      "  </div>" +
      "</div>" +
      '<div id="premade-edit-backdrop" class="app-modal-backdrop" hidden>' +
      '  <div class="app-modal" role="dialog" aria-modal="true" aria-label="Edit premade">' +
      "    <h3>Edit premade</h3>" +
      '    <div class="app-empty-hint" style="margin-bottom:0.7rem;padding:0.7rem;">' +
      '      <div><strong>Created:</strong> <span id="premade-edit-created-at">-</span></div>' +
      '      <div><strong>Source Script ID:</strong> <code id="premade-edit-source-script-id">-</code></div>' +
      '      <div><strong>Publisher:</strong> <span id="premade-edit-publisher">-</span></div>' +
      "    </div>" +
      '    <label for="premade-edit-title">Title</label>' +
      '    <input id="premade-edit-title" type="text" maxlength="120">' +
      '    <label for="premade-edit-category">Category</label>' +
      '    <select id="premade-edit-category"></select>' +
      '    <label for="premade-edit-description">Description</label>' +
      '    <input id="premade-edit-description" type="text" maxlength="180">' +
      '    <label for="premade-edit-text">Script text</label>' +
      '    <textarea id="premade-edit-text" rows="6"></textarea>' +
      '    <div id="premade-edit-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      '    <div class="app-modal-actions">' +
      '      <button type="button" class="app-btn app-btn-danger" id="premade-edit-delete">Unpublish</button>' +
      '      <button type="button" class="app-btn" id="premade-edit-cancel">Cancel</button>' +
      '      <button type="button" class="app-btn" id="premade-edit-save">Save changes</button>' +
      "    </div>" +
      "  </div>" +
      "</div>" +
      '<div id="media-picker-backdrop" class="app-modal-backdrop" hidden>' +
      '  <div class="app-modal" role="dialog" aria-modal="true" aria-label="Media picker">' +
      '    <h3 id="media-picker-title">Select option</h3>' +
      '    <p id="media-picker-subtitle" class="app-muted" style="margin:0 0 0.45rem;"></p>' +
      '    <input id="media-picker-search" type="text" placeholder="Search...">' +
      '    <div id="media-picker-list" class="app-modal-list"></div>' +
      '    <div id="media-picker-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      '    <div class="app-modal-actions">' +
      '      <button type="button" class="app-btn" id="media-picker-cancel">Cancel</button>' +
      "    </div>" +
      "  </div>" +
      "</div>" +
      '<div id="voice-settings-backdrop" class="app-modal-backdrop" hidden>' +
      '  <div class="app-modal" role="dialog" aria-modal="true" aria-label="Voice settings editor">' +
      "    <h3>Voice settings</h3>" +
      '    <p id="voice-settings-subtitle" class="app-muted" style="margin:0 0 0.55rem;">Tune cloned voice behavior to match iOS controls.</p>' +
      '    <label for="voice-setting-stability">Stability <span id="voice-setting-stability-value" class="app-muted">0.50</span></label>' +
      '    <input id="voice-setting-stability" type="range" min="0" max="1" step="0.01" value="0.5">' +
      '    <label for="voice-setting-similarity">Similarity boost <span id="voice-setting-similarity-value" class="app-muted">0.80</span></label>' +
      '    <input id="voice-setting-similarity" type="range" min="0" max="1" step="0.01" value="0.8">' +
      '    <label for="voice-setting-style">Style <span id="voice-setting-style-value" class="app-muted">0.30</span></label>' +
      '    <input id="voice-setting-style" type="range" min="0" max="1" step="0.01" value="0.3">' +
      '    <label for="voice-setting-speaker-boost" style="display:flex;align-items:center;gap:0.45rem;cursor:pointer;">' +
      '      <input id="voice-setting-speaker-boost" type="checkbox" checked style="width:auto;margin:0;">' +
      "      Use speaker boost" +
      "    </label>" +
      '    <div id="voice-settings-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      '    <div class="app-modal-actions">' +
      '      <button type="button" class="app-btn" id="voice-settings-cancel">Cancel</button>' +
      '      <button type="button" class="app-btn" id="voice-settings-save">Save settings</button>' +
      "    </div>" +
      "  </div>" +
      "</div>" +
      '<div id="voice-consent-backdrop" class="app-modal-backdrop" hidden>' +
      '  <div class="app-modal voice-consent-modal" role="dialog" aria-modal="true" aria-label="Voice cloning consent">' +
      '    <div class="voice-modal-hero">' +
      '      <div class="voice-modal-icon-wrap voice-modal-icon-consent"><span class="voice-modal-icon" aria-hidden="true">🎤</span></div>' +
      "      <h3>Voice Cloning Consent</h3>" +
      '      <p class="app-muted" style="margin:0;">Review and accept before creating your cloned voice.</p>' +
      "    </div>" +
      '    <div style="max-height:50vh;overflow:auto;display:flex;flex-direction:column;gap:0.55rem;margin-bottom:0.6rem;padding-right:0.1rem;">' +
      '      <div class="app-empty-hint" style="border-style:solid;background:rgba(59,130,246,0.08);padding:0.65rem;">' +
      '        <div style="font-weight:700;margin-bottom:0.22rem;">What is Voice Cloning?</div>' +
      "        <div>Voice cloning creates a digital copy of your voice using AI technology. This allows the app to generate audio using your unique voice characteristics.</div>" +
      "      </div>" +
      '      <div class="app-empty-hint" style="border-style:solid;padding:0.65rem;">' +
      '        <div style="font-weight:700;margin-bottom:0.22rem;">How Your Data is Used</div>' +
      "        <div>Your voice sample is sent to ElevenLabs, a third-party AI service, to create the cloned voice. The voice data is stored securely and used only to generate audio content within this app.</div>" +
      "      </div>" +
      '      <div class="app-empty-hint" style="border-style:solid;padding:0.65rem;">' +
      '        <div style="font-weight:700;margin-bottom:0.22rem;">Your Rights</div>' +
      "        <div>You can delete your cloned voice at any time, which will remove it from both our system and ElevenLabs. You maintain full control over your voice data.</div>" +
      "      </div>" +
      '      <div class="app-empty-hint" style="border-style:solid;padding:0.65rem;">' +
      '        <div style="font-weight:700;margin-bottom:0.22rem;">Important Notes</div>' +
      "        <div>- Voice cloning requires at least 30 seconds of clear audio</div>" +
      "        <div>- Best results come from 1-2 minutes of natural speech</div>" +
      "        <div>- Speak clearly and naturally for optimal quality</div>" +
      "      </div>" +
      '      <div class="app-empty-hint" style="border-style:solid;padding:0.65rem;">' +
      '        <div style="font-weight:700;margin-bottom:0.22rem;">Legal</div>' +
      "        <div>It is illegal to clone the voice of another person without their express consent. Only clone your own voice or ensure you have proper permission.</div>" +
      "      </div>" +
      "    </div>" +
      '    <label for="voice-consent-check" style="display:flex;align-items:flex-start;gap:0.55rem;cursor:pointer;">' +
      '      <input id="voice-consent-check" type="checkbox" style="width:auto;margin-top:0.15rem;">' +
      '      <span>I understand and consent to the use of my voice for cloning. I acknowledge that my voice data will be processed by ElevenLabs and can be deleted at any time.</span>' +
      "    </label>" +
      '    <div id="voice-consent-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      '    <div class="app-modal-actions">' +
      '      <button type="button" class="app-btn" id="voice-consent-cancel">Cancel</button>' +
      '      <button type="button" class="app-btn" id="voice-consent-continue" disabled>Continue</button>' +
      "    </div>" +
      "  </div>" +
      "</div>" +
      '<div id="voice-processing-backdrop" class="app-modal-backdrop" hidden>' +
      '  <div class="app-modal voice-processing-modal" role="dialog" aria-modal="true" aria-label="Voice cloning processing">' +
      '    <div class="voice-modal-hero">' +
      '      <div class="voice-modal-icon-wrap voice-modal-icon-processing"><span class="voice-modal-spinner" aria-hidden="true">◌</span></div>' +
      "      <h3>Creating Your Cloned Voice</h3>" +
      '      <p id="voice-processing-status" class="app-muted" style="margin:0;">Preparing your voice sample...</p>' +
      "    </div>" +
      '    <div style="display:flex;align-items:center;justify-content:center;gap:0.6rem;margin-bottom:0.6rem;">' +
      '      <span class="app-muted">Please wait, this may take 30-60 seconds.</span>' +
      "    </div>" +
      '    <div class="app-empty-hint" style="border-style:solid;padding:0.7rem;">' +
      '      <div style="font-weight:700;margin-bottom:0.2rem;">What\'s happening?</div>' +
      "      <div>We're uploading your voice sample to ElevenLabs and creating your unique voice clone. This captures key voice characteristics for playback and generation.</div>" +
      "    </div>" +
      "  </div>" +
      "</div>" +
      '<div id="voice-complete-backdrop" class="app-modal-backdrop" hidden>' +
      '  <div class="app-modal voice-complete-modal" role="dialog" aria-modal="true" aria-label="Voice cloning complete">' +
      '    <div class="voice-complete-hero">' +
      '      <div class="voice-complete-icon-wrap"><span class="voice-complete-icon">✓</span></div>' +
      "      <h3>Voice Cloned Successfully!</h3>" +
      '      <p id="voice-complete-subtitle" class="app-muted" style="margin:0;">Your cloned voice is ready.</p>' +
      "    </div>" +
      '    <div class="app-empty-hint voice-complete-info" style="border-style:solid;padding:0.7rem;">' +
      '      <div class="voice-complete-row"><span aria-hidden="true">🎙️</span><span>Your cloned voice is available in My Voices</span></div>' +
      '      <div class="voice-complete-row"><span aria-hidden="true">🎛️</span><span>You can adjust settings anytime</span></div>' +
      '      <div class="voice-complete-row"><span aria-hidden="true">🗑️</span><span>Delete it anytime from voice settings</span></div>' +
      "    </div>" +
      '    <div class="app-modal-actions">' +
      '      <button type="button" class="app-btn app-btn-primary" id="voice-complete-done">Done</button>' +
      "    </div>" +
      "  </div>" +
      "</div>" +
      '<div id="voice-adjust-backdrop" class="app-modal-backdrop" hidden>' +
      '  <div class="app-modal voice-adjust-modal" role="dialog" aria-modal="true" aria-label="Adjust your inner voice">' +
      "    <h3>Adjust Your Inner Voice</h3>" +
      '    <p id="voice-adjust-subtitle" class="app-muted" style="margin:0 0 0.55rem;">Fine-tune how your cloned voice sounds.</p>' +
      '    <div class="voice-adjust-presets">' +
      '      <button type="button" class="app-btn app-btn-ghost" data-voice-adjust-preset="natural">Natural</button>' +
      '      <button type="button" class="app-btn app-btn-ghost" data-voice-adjust-preset="energetic">Energetic</button>' +
      '      <button type="button" class="app-btn app-btn-ghost" data-voice-adjust-preset="calm">Calm</button>' +
      '      <button type="button" class="app-btn app-btn-ghost" data-voice-adjust-preset="clear">Clear</button>' +
      "    </div>" +
      '    <label for="voice-adjust-stability">Consistency <span id="voice-adjust-stability-value" class="app-muted">0.50</span></label>' +
      '    <input id="voice-adjust-stability" type="range" min="0" max="1" step="0.01" value="0.5">' +
      '    <label for="voice-adjust-similarity">Clarity <span id="voice-adjust-similarity-value" class="app-muted">0.80</span></label>' +
      '    <input id="voice-adjust-similarity" type="range" min="0" max="1" step="0.01" value="0.8">' +
      '    <label for="voice-adjust-style">Expressiveness <span id="voice-adjust-style-value" class="app-muted">0.30</span></label>' +
      '    <input id="voice-adjust-style" type="range" min="0" max="1" step="0.01" value="0.3">' +
      '    <label for="voice-adjust-speaker-boost" style="display:flex;align-items:center;gap:0.45rem;cursor:pointer;">' +
      '      <input id="voice-adjust-speaker-boost" type="checkbox" checked style="width:auto;margin:0;">' +
      "      Speaker boost" +
      "    </label>" +
      '    <div id="voice-adjust-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      '    <div class="app-modal-actions">' +
      '      <button type="button" class="app-btn app-btn-ghost" id="voice-adjust-skip">Skip</button>' +
      '      <button type="button" class="app-btn app-btn-secondary" id="voice-adjust-preview">Play Preview</button>' +
      '      <button type="button" class="app-btn app-btn-primary" id="voice-adjust-save">Save Settings</button>' +
      "    </div>" +
      "  </div>" +
      "</div>" +
      '<div id="voice-mic-help-backdrop" class="app-modal-backdrop" hidden>' +
      '  <div class="app-modal voice-consent-modal" role="dialog" aria-modal="true" aria-label="Microphone help">' +
      '    <div class="voice-modal-hero">' +
      '      <div class="voice-modal-icon-wrap voice-modal-icon-consent"><span class="voice-modal-icon" aria-hidden="true">🎙️</span></div>' +
      "      <h3>Microphone Access Needed</h3>" +
      '      <p id="voice-mic-help-subtitle" class="app-muted" style="margin:0;">Enable microphone access to record your voice sample.</p>' +
      "    </div>" +
      '    <div class="app-empty-hint" style="border-style:solid;padding:0.7rem;">' +
      "      <div><strong>Try this:</strong></div>" +
      "      <div>- Click the lock icon in your browser address bar</div>" +
      "      <div>- Set Microphone permission to Allow</div>" +
      "      <div>- Close this dialog and tap Start Recording again</div>" +
      "    </div>" +
      '    <div id="voice-mic-help-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      '    <div class="app-modal-actions">' +
      '      <button type="button" class="app-btn" id="voice-mic-help-close">Close</button>' +
      '      <button type="button" class="app-btn app-btn-primary" id="voice-mic-help-retry">Try Again</button>' +
      "    </div>" +
      "  </div>" +
      "</div>" +
      '<p class="auth-back"><a href="/">← Marketing site</a></p>';

    document.getElementById("btn-create-script").addEventListener("click", function () {
      openEditor(null);
    });
    document.getElementById("btn-create-playlist").addEventListener("click", function () {
      createPlaylist();
    });
    document.getElementById("account-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      saveAccountDisplayName();
    });
    document.getElementById("account-password-reset").addEventListener("click", function () {
      sendPasswordResetFromAccount();
    });
    document.getElementById("account-refresh-token").addEventListener("click", function () {
      refreshSessionToken();
    });
    document.getElementById("account-signout").addEventListener("click", function () {
      auth.signOut().then(redirectLogin);
    });
    root.querySelectorAll("[data-admin-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tab = btn.getAttribute("data-admin-tab");
        if (tab === "home") {
          setHomeFlowStep("landing", displayName || "");
        }
        setAdminTab(tab);
      });
    });
    document.getElementById("mini-player-toggle").addEventListener("click", function () {
      if (!activeAudio) return;
      if (activeAudio.paused) {
        activeAudio.play().catch(function () {});
      } else {
        activeAudio.pause();
      }
      updateMiniPlayer();
    });
    document.getElementById("mini-player-stop").addEventListener("click", function () {
      stopActiveAudio();
      renderScripts(currentScripts);
      renderSelectedPlaylistDetail();
    });
    document.getElementById("playlist-picker-close").addEventListener("click", function () {
      closePlaylistPicker();
    });
    document.getElementById("playlist-create-btn").addEventListener("click", function () {
      var input = document.getElementById("playlist-new-name");
      var name = ((input && input.value) || "").trim();
      if (!name) return;
      createPlaylistNamed(name)
        .then(function (playlist) {
          if (input) input.value = "";
          if (!playlist) return;
          renderPlaylistPickerOptions();
        })
        .catch(function () {});
    });
    document.getElementById("btn-open-publish-premade").addEventListener("click", function () {
      openPublishPremadeModal();
    });
    document.getElementById("premade-publish-cancel").addEventListener("click", function () {
      closePublishPremadeModal();
    });
    document.getElementById("premade-publish-submit").addEventListener("click", function () {
      publishPremadeFromModal();
    });
    document.getElementById("publish-script-id").addEventListener("change", function () {
      syncPublishFormFromSelectedScript();
    });
    document.getElementById("publish-title").addEventListener("input", function () {
      updatePublishDirtyState();
    });
    document.getElementById("publish-script-text").addEventListener("input", function () {
      updatePublishDirtyState();
    });
    document.getElementById("premade-edit-cancel").addEventListener("click", function () {
      closeEditPremadeModal();
    });
    document.getElementById("premade-edit-save").addEventListener("click", function () {
      savePremadeEdits();
    });
    document.getElementById("premade-edit-delete").addEventListener("click", function () {
      unpublishPremade();
    });
    root.querySelectorAll("[data-voices-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        activeVoicesTab = btn.getAttribute("data-voices-tab") || "my-voices";
        renderVoices();
      });
    });
    document.getElementById("btn-voice-clone").addEventListener("click", function () {
      setVoicesMessage("Choose a clear voice audio file to upload.", "");
      beginVoiceUploadFlow("clone");
    });
    document.getElementById("btn-voice-record").addEventListener("click", function () {
      openCloneVoiceGuide();
    });
    document.getElementById("voice-upload-input").addEventListener("change", function (ev) {
      handleVoiceFileSelected(ev);
    });
    document.getElementById("voice-recording-toggle").addEventListener("click", function () {
      toggleVoiceRecording();
    });
    document.getElementById("voice-recording-play").addEventListener("click", function () {
      togglePlayRecordedSample();
    });
    document.getElementById("voice-recording-again").addEventListener("click", function () {
      clearRecordedSample();
      setVoicesMessage("Ready to record again.", "");
    });
    document.getElementById("voice-recording-use").addEventListener("click", function () {
      useRecordedSampleForClone();
    });
    renderVoiceRecordingScript(-1);
    document.getElementById("voice-consent-cancel").addEventListener("click", function () {
      closeVoiceConsentModal();
    });
    document.getElementById("voice-consent-backdrop").addEventListener("click", function (ev) {
      if (ev.target && ev.target.id === "voice-consent-backdrop") {
        closeVoiceConsentModal();
      }
    });
    document.getElementById("voice-consent-check").addEventListener("change", function () {
      var checked = !!document.getElementById("voice-consent-check").checked;
      var btn = document.getElementById("voice-consent-continue");
      if (btn) btn.disabled = !checked;
    });
    document.getElementById("voice-consent-continue").addEventListener("click", function () {
      acceptVoiceCloneConsentAndContinue();
    });
    document.getElementById("voice-complete-done").addEventListener("click", function () {
      closeVoiceCompleteModal();
    });
    document.getElementById("voice-adjust-backdrop").addEventListener("click", function (ev) {
      if (ev.target && ev.target.id === "voice-adjust-backdrop") {
        closeVoiceAdjustModal();
      }
    });
    document.getElementById("voice-adjust-preview").addEventListener("click", function () {
      previewVoiceAdjust();
    });
    document.getElementById("voice-adjust-skip").addEventListener("click", function () {
      skipVoiceAdjust();
    });
    document.getElementById("voice-adjust-save").addEventListener("click", function () {
      saveVoiceAdjust();
    });
    document.getElementById("voice-mic-help-close").addEventListener("click", function () {
      closeVoiceMicHelpModal();
    });
    document.getElementById("voice-mic-help-retry").addEventListener("click", function () {
      closeVoiceMicHelpModal();
      startVoiceRecording();
    });
    document.getElementById("voice-mic-help-backdrop").addEventListener("click", function (ev) {
      if (ev.target && ev.target.id === "voice-mic-help-backdrop") {
        closeVoiceMicHelpModal();
      }
    });
    ["stability", "similarity", "style"].forEach(function (k) {
      var el = document.getElementById("voice-adjust-" + k);
      if (!el) return;
      el.addEventListener("input", function () {
        updateVoiceAdjustReadout(k);
      });
    });
    document.querySelectorAll("[data-voice-adjust-preset]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyVoiceAdjustPreset(btn.getAttribute("data-voice-adjust-preset"));
      });
    });
    document.getElementById("media-picker-cancel").addEventListener("click", function () {
      closeMediaPicker();
    });
    document.getElementById("media-picker-backdrop").addEventListener("click", function (ev) {
      if (ev.target && ev.target.id === "media-picker-backdrop") {
        closeMediaPicker();
      }
    });
    document.getElementById("voice-settings-cancel").addEventListener("click", function () {
      closeVoiceSettingsModal();
    });
    document.getElementById("voice-settings-save").addEventListener("click", function () {
      saveVoiceSettingsFromModal();
    });
    document.getElementById("voice-settings-backdrop").addEventListener("click", function (ev) {
      if (ev.target && ev.target.id === "voice-settings-backdrop") {
        closeVoiceSettingsModal();
      }
    });
    ["stability", "similarity", "style"].forEach(function (k) {
      var el = document.getElementById("voice-setting-" + k);
      if (!el) return;
      el.addEventListener("input", function () {
        updateVoiceSettingsReadout(k);
      });
    });
    renderHomeFlow(displayName || "");
    renderVoices();
    renderBackgrounds();
    setAdminTab(activeAdminTab);
    updateMiniPlayer();
    updateTabCounts();
  }

  function openPlaylistPicker(script, onSuccess) {
    playlistPickerScript = script;
    playlistPickerSuccessHandler = typeof onSuccess === "function" ? onSuccess : null;
    var backdrop = document.getElementById("playlist-picker-backdrop");
    if (!backdrop) return;
    backdrop.hidden = false;
    renderPlaylistPickerOptions();
  }

  function closePlaylistPicker() {
    var backdrop = document.getElementById("playlist-picker-backdrop");
    if (backdrop) backdrop.hidden = true;
    playlistPickerScript = null;
    playlistPickerSuccessHandler = null;
  }

  function setPublishPremadeMessage(text, kind) {
    var el = document.getElementById("publish-premade-message");
    if (!el) return;
    el.className = "app-inline-msg" + (kind ? " " + kind : "");
    el.textContent = text || "";
  }

  function openPublishPremadeModal() {
    var backdrop = document.getElementById("premade-publish-backdrop");
    if (!backdrop) return;
    populatePublishScriptOptions();
    populatePublishCategoryOptions();
    syncPublishFormFromSelectedScript();
    publishTextDirty = false;
    publishTitleDirty = false;
    updatePublishDirtyUI();
    setPublishPremadeMessage("", "");
    backdrop.hidden = false;
  }

  function closePublishPremadeModal() {
    var backdrop = document.getElementById("premade-publish-backdrop");
    if (backdrop) backdrop.hidden = true;
    publishTextDirty = false;
    publishTitleDirty = false;
    updatePublishDirtyUI();
    setPublishPremadeMessage("", "");
  }

  function populatePublishScriptOptions() {
    var sel = document.getElementById("publish-script-id");
    if (!sel) return;
    var withAudio = currentScripts.filter(function (s) {
      return !!(s.audioURL && String(s.audioURL).trim());
    });
    if (!withAudio.length) {
      sel.innerHTML = '<option value="">No scripts with audio available</option>';
      return;
    }
    sel.innerHTML = withAudio
      .map(function (s) {
        return (
          '<option value="' +
          escapeHtml(s.id) +
          '">' +
          escapeHtml(s.title || "Untitled Script") +
          "</option>"
        );
      })
      .join("");
  }

  function populatePublishCategoryOptions() {
    var sel = document.getElementById("publish-category");
    if (!sel) return;
    sel.innerHTML = surveyCategories
      .map(function (c) {
        var selected = c.id === publishCategoryId ? " selected" : "";
        return '<option value="' + escapeHtml(c.id) + '"' + selected + ">" + escapeHtml(c.name) + "</option>";
      })
      .join("");
    sel.onchange = function (ev) {
      publishCategoryId = ev.target.value;
    };
  }

  function selectedPublishScript() {
    var sel = document.getElementById("publish-script-id");
    var id = sel && sel.value ? sel.value : "";
    return (
      currentScripts.find(function (s) {
        return s.id === id;
      }) || null
    );
  }

  function syncPublishFormFromSelectedScript() {
    var s = selectedPublishScript();
    var titleInput = document.getElementById("publish-title");
    var textInput = document.getElementById("publish-script-text");
    if (!s) return;
    // When the selected source script changes, always sync fields to that script
    // so the modal reflects what will actually be published.
    if (titleInput) titleInput.value = s.title || "";
    if (textInput) textInput.value = s.text || "";
    publishCategoryId = s.categoryID || publishCategoryId || "confidence";
    var catSel = document.getElementById("publish-category");
    if (catSel && publishCategoryId) catSel.value = publishCategoryId;
    publishTextDirty = false;
    publishTitleDirty = false;
    updatePublishDirtyUI();
  }

  function updatePublishDirtyState() {
    var s = selectedPublishScript();
    if (!s) return;
    var titleInput = document.getElementById("publish-title");
    var textInput = document.getElementById("publish-script-text");
    var title = ((titleInput && titleInput.value) || "").trim();
    var text = ((textInput && textInput.value) || "").trim();
    publishTitleDirty = title !== String(s.title || "").trim();
    publishTextDirty = text !== String(s.text || "").trim();
    updatePublishDirtyUI();
  }

  function updatePublishDirtyUI() {
    var titleBadge = document.getElementById("publish-title-dirty");
    var textBadge = document.getElementById("publish-text-dirty");
    if (titleBadge) titleBadge.style.display = publishTitleDirty ? "block" : "none";
    if (textBadge) textBadge.style.display = publishTextDirty ? "block" : "none";
  }

  function publishPremadeFromModal() {
    if (!currentUser) return;
    var s = selectedPublishScript();
    if (!s) {
      setPublishPremadeMessage("Choose a script with audio first.", "error");
      return;
    }
    var title = ((document.getElementById("publish-title").value || "").trim() || s.title || "Premade Script");
    var description = (document.getElementById("publish-description").value || "").trim();
    var categoryID = (document.getElementById("publish-category").value || "").trim() || "confidence";
    var scriptText = (document.getElementById("publish-script-text").value || "").trim() || s.text || "";
    var audioURL = (s.audioURL || "").trim();
    if (!audioURL) {
      setPublishPremadeMessage("Selected script has no audio URL.", "error");
      return;
    }
    setPublishPremadeMessage("Publishing...", "");
    var docRef = premadeCollection().doc();
    docRef
      .set({
        title: title,
        categoryID: categoryID,
        description: description,
        scriptText: scriptText,
        audioURL: audioURL,
        sourceScriptID: s.id,
        createdByUID: currentUser.uid,
        createdByEmail: currentUser.email || "",
        createdByName: currentUser.displayName || "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      })
      .then(function () {
        setPublishPremadeMessage("Published to App Library.", "success");
        setPremadeMessage('Published "' + title + '" to App Library.', "success");
        setTimeout(function () {
          closePublishPremadeModal();
        }, 600);
      })
      .catch(function (e) {
        setPublishPremadeMessage(e.message || "Could not publish premade.", "error");
      });
  }

  function setEditPremadeMessage(text, kind) {
    var el = document.getElementById("premade-edit-message");
    if (!el) return;
    el.className = "app-inline-msg" + (kind ? " " + kind : "");
    el.textContent = text || "";
  }

  function openEditPremadeModal(premade) {
    if (!premade) return;
    editingPremadeId = premade.id;
    var backdrop = document.getElementById("premade-edit-backdrop");
    var title = document.getElementById("premade-edit-title");
    var category = document.getElementById("premade-edit-category");
    var desc = document.getElementById("premade-edit-description");
    var text = document.getElementById("premade-edit-text");
    var createdAtEl = document.getElementById("premade-edit-created-at");
    var sourceScriptEl = document.getElementById("premade-edit-source-script-id");
    var publisherEl = document.getElementById("premade-edit-publisher");
    if (!backdrop || !title || !category || !desc || !text) return;
    category.innerHTML = surveyCategories
      .map(function (c) {
        var selected = c.id === (premade.categoryID || "") ? " selected" : "";
        return '<option value="' + escapeHtml(c.id) + '"' + selected + ">" + escapeHtml(c.name) + "</option>";
      })
      .join("");
    title.value = premade.title || "";
    category.value = premade.categoryID || "confidence";
    desc.value = premade.description || "";
    text.value = premade.scriptText || "";
    if (createdAtEl) createdAtEl.textContent = formatDate(premade.createdAt);
    if (sourceScriptEl) sourceScriptEl.textContent = premade.sourceScriptID || "-";
    if (publisherEl) {
      var publisherText =
        premade.createdByName ||
        premade.createdByEmail ||
        premade.createdByUID ||
        "Unknown";
      publisherEl.textContent = publisherText;
    }
    setEditPremadeMessage("", "");
    backdrop.hidden = false;
  }

  function closeEditPremadeModal() {
    var backdrop = document.getElementById("premade-edit-backdrop");
    if (backdrop) backdrop.hidden = true;
    editingPremadeId = null;
    setEditPremadeMessage("", "");
  }

  function savePremadeEdits() {
    if (!editingPremadeId) return;
    var title = ((document.getElementById("premade-edit-title").value || "").trim());
    var categoryID = ((document.getElementById("premade-edit-category").value || "").trim() || "confidence");
    var description = ((document.getElementById("premade-edit-description").value || "").trim());
    var scriptText = ((document.getElementById("premade-edit-text").value || "").trim());
    if (!title) {
      setEditPremadeMessage("Title is required.", "error");
      return;
    }
    setEditPremadeMessage("Saving...", "");
    premadeCollection()
      .doc(editingPremadeId)
      .set(
        {
          title: title,
          categoryID: categoryID,
          description: description,
          scriptText: scriptText,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      .then(function () {
        setPremadeMessage("Premade updated.", "success");
        closeEditPremadeModal();
      })
      .catch(function (e) {
        setEditPremadeMessage(e.message || "Could not save changes.", "error");
      });
  }

  function unpublishPremade() {
    if (!editingPremadeId) return;
    var premade = currentPremade.find(function (x) { return x.id === editingPremadeId; });
    if (!window.confirm('Unpublish "' + ((premade && premade.title) || "this premade") + '"?')) return;
    setEditPremadeMessage("Unpublishing...", "");
    premadeCollection()
      .doc(editingPremadeId)
      .delete()
      .then(function () {
        setPremadeMessage("Premade unpublished.", "success");
        closeEditPremadeModal();
      })
      .catch(function (e) {
        setEditPremadeMessage(e.message || "Could not unpublish premade.", "error");
      });
  }

  function setAdminTab(tabId) {
    var normalized = tabId || "home";
    if (normalized === "create") normalized = "home";
    activeAdminTab = normalized;
    var sectionMap = {
      home: "section-home",
      library: "section-library",
      playlists: "section-playlists",
      voices: "section-voices",
      backgrounds: "section-backgrounds",
      "app-library": "section-app-library",
      account: "section-account",
    };
    Object.keys(sectionMap).forEach(function (key) {
      var section = document.getElementById(sectionMap[key]);
      if (!section) return;
      section.hidden = key !== activeAdminTab;
    });
    root.querySelectorAll("[data-admin-tab]").forEach(function (btn) {
      var isActive = btn.getAttribute("data-admin-tab") === activeAdminTab;
      btn.classList.toggle("is-active", isActive);
    });
    try {
      localStorage.setItem(ADMIN_TAB_STORAGE_KEY, activeAdminTab);
    } catch (_e) {}
  }

  function generationMessage(text, kind) {
    var el = document.getElementById("generation-message");
    if (!el) return;
    el.className = "app-inline-msg" + (kind ? " " + kind : "");
    el.textContent = text || "";
  }

  function setMediaPickerMessage(text, kind) {
    var el = document.getElementById("media-picker-message");
    if (!el) return;
    el.className = "app-inline-msg" + (kind ? " " + kind : "");
    el.textContent = text || "";
  }

  function voiceNameById(voiceID) {
    var found = availableVoices.find(function (v) {
      return v.id === voiceID;
    });
    if (!found) {
      found = currentClonedVoices.find(function (v) {
        return v.id === voiceID;
      });
    }
    return (found && found.name) || "Voice";
  }

  function backgroundNameById(backgroundID) {
    var found = availableBackgrounds.find(function (b) {
      return b.id === backgroundID;
    });
    return (found && found.name) || "Background";
  }

  function setVoicesMessage(text, kind) {
    var el = document.getElementById("voices-message");
    if (!el) return;
    el.className = "app-inline-msg" + (kind ? " " + kind : "");
    el.textContent = text || "";
  }

  function setBackgroundsMessage(text, kind) {
    var el = document.getElementById("backgrounds-message");
    if (!el) return;
    el.className = "app-inline-msg" + (kind ? " " + kind : "");
    el.textContent = text || "";
  }

  function saveUserDefaults(partial) {
    if (!currentUser) return Promise.resolve();
    return db
      .collection("users")
      .doc(currentUser.uid)
      .set(
        {
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          defaultVoiceID: selectedVoiceId,
          defaultBackgroundID: selectedBackgroundId,
          webDefaultsUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          webDefaults: {
            voiceID: selectedVoiceId,
            backgroundID: selectedBackgroundId,
          },
          ...(partial || {}),
        },
        { merge: true }
      )
      .then(function () {
        currentUserProfile = Object.assign({}, currentUserProfile || {}, partial || {}, {
          defaultVoiceID: selectedVoiceId,
          defaultBackgroundID: selectedBackgroundId,
        });
      });
  }

  function renderVoices() {
    var list = document.getElementById("voices-list");
    if (!list) return;
    var tabMy = document.getElementById("voices-tab-my");
    var tabApp = document.getElementById("voices-tab-app");
    if (tabMy) tabMy.classList.toggle("is-active", activeVoicesTab === "my-voices");
    if (tabApp) tabApp.classList.toggle("is-active", activeVoicesTab === "app-voices");

    var savedAppVoiceIDs = Array.isArray((currentUserProfile || {}).savedAppVoiceIDs)
      ? (currentUserProfile || {}).savedAppVoiceIDs
      : [];
    var savedSet = {};
    savedAppVoiceIDs.forEach(function (id) {
      savedSet[id] = true;
    });

    var myVoices = []
      .concat(currentClonedVoices)
      .concat(
        availableVoices.filter(function (v) {
          return savedSet[v.id] === true;
        })
      );
    var sourceVoices = activeVoicesTab === "my-voices" ? myVoices : availableVoices;
    if (!sourceVoices.length) {
      list.innerHTML = '<div class="app-empty-hint">No voices here yet. Save from App Voices or create a cloned voice.</div>';
      return;
    }

    list.innerHTML = sourceVoices
      .map(function (v) {
        var isSelected = v.id === selectedVoiceId;
        var inMyVoices = !!savedSet[v.id] || currentClonedVoices.some(function (cv) { return cv.id === v.id; });
        var supportsSaveToggle = activeVoicesTab === "app-voices";
        var isCloned = isClonedVoiceOption(v);
        var supportsCloneActions = activeVoicesTab === "my-voices" && isCloned;
        return (
          '<div class="app-modal-row" style="margin-bottom:0.45rem;">' +
          '  <div class="app-modal-row-name">' +
          escapeHtml(v.name) +
          (v.description ? '<div class="app-muted" style="font-size:0.75rem;">' + escapeHtml(v.description) + "</div>" : "") +
          "</div>" +
          '<div style="display:flex;gap:0.4rem;flex-wrap:wrap;justify-content:flex-end;">' +
          (supportsSaveToggle
            ? '<button type="button" class="app-btn app-btn-ghost" data-voice-save-id="' +
              escapeHtml(v.id) +
              '">' +
              (inMyVoices ? "Saved" : "Add to My Voices") +
              "</button>"
            : "") +
          '<button type="button" class="app-btn app-btn-ghost" data-voice-preview-id="' +
          escapeHtml(v.id) +
          '">Preview</button>' +
          (supportsCloneActions
            ? '<button type="button" class="app-btn app-btn-ghost" data-voice-settings-id="' +
              escapeHtml(v.id) +
              '">Settings</button>' +
              '<button type="button" class="app-btn app-btn-danger" data-voice-delete-id="' +
              escapeHtml(v.id) +
              '">Delete</button>'
            : "") +
          '<button type="button" class="app-btn ' +
          (isSelected ? "app-btn-primary" : "app-btn-secondary") +
          '" data-voice-id="' +
          escapeHtml(v.id) +
          '">' +
          (isSelected ? "Default" : "Set Default") +
          "</button>" +
          "</div>" +
          "</div>"
        );
      })
      .join("");
    list.querySelectorAll("[data-voice-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var voiceID = btn.getAttribute("data-voice-id");
        if (!voiceID || voiceID === selectedVoiceId) return;
        selectedVoiceId = voiceID;
        setVoicesMessage("Saving default voice...", "");
        saveUserDefaults()
          .then(function () {
            renderVoices();
            setVoicesMessage("Default voice saved.", "success");
          })
          .catch(function (e) {
            setVoicesMessage(e.message || "Could not save default voice.", "error");
          });
      });
    });
    list.querySelectorAll("[data-voice-save-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var voiceID = btn.getAttribute("data-voice-save-id");
        if (!voiceID) return;
        var currentIDs = Array.isArray((currentUserProfile || {}).savedAppVoiceIDs)
          ? (currentUserProfile || {}).savedAppVoiceIDs.slice()
          : [];
        var has = currentIDs.indexOf(voiceID) >= 0;
        var nextIDs = has
          ? currentIDs.filter(function (id) { return id !== voiceID; })
          : currentIDs.concat([voiceID]);
        setVoicesMessage(has ? "Removing from My Voices..." : "Adding to My Voices...", "");
        saveUserDefaults({ savedAppVoiceIDs: nextIDs })
          .then(function () {
            setVoicesMessage(has ? "Removed from My Voices." : "Added to My Voices.", "success");
            renderVoices();
          })
          .catch(function (e) {
            setVoicesMessage(e.message || "Could not update My Voices.", "error");
          });
      });
    });
    list.querySelectorAll("[data-voice-preview-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var voiceID = btn.getAttribute("data-voice-preview-id");
        var voice = sourceVoices.find(function (v) {
          return v.id === voiceID;
        });
        if (!voice) return;
        previewVoiceSample(voice);
      });
    });
    list.querySelectorAll("[data-voice-settings-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var voiceID = btn.getAttribute("data-voice-settings-id");
        if (!voiceID) return;
        editClonedVoiceSettings(voiceID);
      });
    });
    list.querySelectorAll("[data-voice-delete-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var voiceID = btn.getAttribute("data-voice-delete-id");
        if (!voiceID) return;
        deleteClonedVoice(voiceID);
      });
    });
  }

  function allVoiceOptionsForSelection() {
    var map = {};
    var out = [];
    function pushVoice(v) {
      if (!v || !v.id || map[v.id]) return;
      map[v.id] = true;
      out.push(v);
    }
    currentClonedVoices.forEach(pushVoice);
    availableVoices.forEach(pushVoice);
    return out;
  }

  function isClonedVoiceOption(voice) {
    if (!voice || !voice.id) return false;
    return currentClonedVoices.some(function (cv) {
      return cv.id === voice.id;
    });
  }

  function clonedVoiceById(voiceID) {
    return (
      currentClonedVoices.find(function (cv) {
        return cv.id === voiceID;
      }) || null
    );
  }

  function beginVoiceUploadFlow(mode) {
    var input = document.getElementById("voice-upload-input");
    if (!input) return;
    input.value = "";
    input.setAttribute("data-voice-upload-mode", mode || "upload");
    input.click();
  }

  function readFileAsBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = String(reader.result || "");
        var parts = result.split(",");
        if (parts.length < 2) {
          reject(new Error("Could not read audio file."));
          return;
        }
        resolve(parts[1]);
      };
      reader.onerror = function () {
        reject(new Error("Could not read audio file."));
      };
      reader.readAsDataURL(file);
    });
  }

  function stopVoiceRecorderStream() {
    if (!activeVoiceRecorderStream) return;
    try {
      activeVoiceRecorderStream.getTracks().forEach(function (t) {
        try { t.stop(); } catch (_e) {}
      });
    } catch (_err) {}
    activeVoiceRecorderStream = null;
  }

  function setVoiceRecordingStatus(text, kind) {
    var el = document.getElementById("voice-recording-status");
    if (!el) return;
    el.className = "app-inline-msg" + (kind ? " " + kind : "");
    el.textContent = text || "";
  }

  function formatDurationShort(seconds) {
    var sec = Math.max(0, Math.floor(Number(seconds) || 0));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function clearRecordedSample() {
    if (recordedSampleAudio) {
      try { recordedSampleAudio.pause(); } catch (_e) {}
      recordedSampleAudio = null;
    }
    if (recordedSampleBlobURL) {
      try { URL.revokeObjectURL(recordedSampleBlobURL); } catch (_e2) {}
      recordedSampleBlobURL = null;
    }
    recordedSampleFile = null;
    recordedSampleDurationSec = 0;
    var review = document.getElementById("voice-recording-review");
    if (review) review.style.display = "none";
    var play = document.getElementById("voice-recording-play");
    if (play) play.textContent = "Play";
    var dur = document.getElementById("voice-recording-review-duration");
    if (dur) dur.textContent = "0:00";
  }

  function showRecordedSampleReview() {
    var review = document.getElementById("voice-recording-review");
    if (review) review.style.display = "block";
    var dur = document.getElementById("voice-recording-review-duration");
    if (dur) dur.textContent = formatDurationShort(recordedSampleDurationSec);
    var play = document.getElementById("voice-recording-play");
    if (play) play.textContent = "Play";
  }

  function togglePlayRecordedSample() {
    if (!recordedSampleBlobURL) return;
    var play = document.getElementById("voice-recording-play");
    if (recordedSampleAudio && !recordedSampleAudio.paused) {
      try { recordedSampleAudio.pause(); } catch (_e) {}
      if (play) play.textContent = "Play";
      return;
    }
    if (!recordedSampleAudio) {
      recordedSampleAudio = new Audio(recordedSampleBlobURL);
      recordedSampleAudio.onended = function () {
        if (play) play.textContent = "Play";
      };
    }
    recordedSampleAudio.currentTime = 0;
    recordedSampleAudio.play().then(function () {
      if (play) play.textContent = "Stop";
    }).catch(function () {});
  }

  function useRecordedSampleForClone() {
    if (!recordedSampleFile) {
      setVoicesMessage("Record a sample first.", "error");
      return;
    }
    uploadVoiceSample(recordedSampleFile, "clone");
  }

  function setVoiceConsentMessage(text, kind) {
    var el = document.getElementById("voice-consent-message");
    if (!el) return;
    el.className = "app-inline-msg" + (kind ? " " + kind : "");
    el.textContent = text || "";
  }

  function setVoiceMicHelpMessage(text, kind) {
    var el = document.getElementById("voice-mic-help-message");
    if (!el) return;
    el.className = "app-inline-msg" + (kind ? " " + kind : "");
    el.textContent = text || "";
  }

  function openVoiceMicHelpModal(reasonText) {
    var backdrop = document.getElementById("voice-mic-help-backdrop");
    var subtitle = document.getElementById("voice-mic-help-subtitle");
    if (!backdrop || !subtitle) return;
    subtitle.textContent = reasonText || "Enable microphone access to record your voice sample.";
    setVoiceMicHelpMessage("", "");
    backdrop.hidden = false;
  }

  function closeVoiceMicHelpModal() {
    var backdrop = document.getElementById("voice-mic-help-backdrop");
    if (backdrop) backdrop.hidden = true;
    setVoiceMicHelpMessage("", "");
  }

  function clearVoiceProcessingStatusTicker() {
    if (voiceProcessingStatusTimer) {
      clearInterval(voiceProcessingStatusTimer);
      voiceProcessingStatusTimer = null;
    }
  }

  function openVoiceProcessingModal() {
    var backdrop = document.getElementById("voice-processing-backdrop");
    var status = document.getElementById("voice-processing-status");
    if (!backdrop || !status) return;
    var statuses = [
      "Preparing your voice sample...",
      "Uploading to ElevenLabs...",
      "Analyzing voice characteristics...",
      "Creating your voice clone...",
      "Almost done...",
    ];
    var idx = 0;
    status.textContent = statuses[idx];
    clearVoiceProcessingStatusTicker();
    voiceProcessingStatusTimer = setInterval(function () {
      idx = Math.min(idx + 1, statuses.length - 1);
      status.textContent = statuses[idx];
      if (idx >= statuses.length - 1) clearVoiceProcessingStatusTicker();
    }, 8000);
    backdrop.hidden = false;
  }

  function closeVoiceProcessingModal() {
    var backdrop = document.getElementById("voice-processing-backdrop");
    if (backdrop) backdrop.hidden = true;
    clearVoiceProcessingStatusTicker();
  }

  function openVoiceCompleteModal(voiceName) {
    var backdrop = document.getElementById("voice-complete-backdrop");
    var subtitle = document.getElementById("voice-complete-subtitle");
    if (!backdrop || !subtitle) return;
    subtitle.textContent = '"' + (voiceName || "My Cloned Voice") + '" is now ready to use.';
    backdrop.hidden = false;
  }

  function closeVoiceCompleteModal() {
    var backdrop = document.getElementById("voice-complete-backdrop");
    if (backdrop) backdrop.hidden = true;
  }

  function setVoiceAdjustMessage(text, kind) {
    var el = document.getElementById("voice-adjust-message");
    if (!el) return;
    el.className = "app-inline-msg" + (kind ? " " + kind : "");
    el.textContent = text || "";
  }

  function updateVoiceAdjustReadout(kind) {
    var input = document.getElementById("voice-adjust-" + kind);
    var out = document.getElementById("voice-adjust-" + kind + "-value");
    if (!input || !out) return;
    var val = Number(input.value || 0);
    if (!isFinite(val)) val = 0;
    out.textContent = val.toFixed(2);
  }

  function currentVoiceAdjustPayload() {
    function clamp01(n, fallback) {
      var x = Number(n);
      if (!isFinite(x)) return fallback;
      return Math.max(0, Math.min(1, x));
    }
    var stability = document.getElementById("voice-adjust-stability");
    var similarity = document.getElementById("voice-adjust-similarity");
    var style = document.getElementById("voice-adjust-style");
    var speaker = document.getElementById("voice-adjust-speaker-boost");
    return {
      stability: clamp01(stability && stability.value, 0.5),
      similarity_boost: clamp01(similarity && similarity.value, 0.8),
      style: clamp01(style && style.value, 0.3),
      use_speaker_boost: !!(speaker && speaker.checked),
    };
  }

  function applyVoiceAdjustPreset(preset) {
    var s = document.getElementById("voice-adjust-stability");
    var m = document.getElementById("voice-adjust-similarity");
    var y = document.getElementById("voice-adjust-style");
    var b = document.getElementById("voice-adjust-speaker-boost");
    if (!s || !m || !y || !b) return;
    if (preset === "energetic") {
      s.value = "0.60"; m.value = "0.80"; y.value = "0.50"; b.checked = true;
    } else if (preset === "calm") {
      s.value = "0.70"; m.value = "0.70"; y.value = "0.00"; b.checked = true;
    } else if (preset === "clear") {
      s.value = "0.60"; m.value = "0.90"; y.value = "0.20"; b.checked = true;
    } else {
      s.value = "0.50"; m.value = "0.75"; y.value = "0.00"; b.checked = true;
    }
    updateVoiceAdjustReadout("stability");
    updateVoiceAdjustReadout("similarity");
    updateVoiceAdjustReadout("style");
  }

  function openVoiceAdjustModal(localVoiceId, elevenLabsVoiceId, voiceName) {
    if (!localVoiceId || !elevenLabsVoiceId || !currentUser) {
      openVoiceCompleteModal(voiceName || "Voice");
      return;
    }
    cloneAdjustLocalVoiceId = localVoiceId;
    cloneAdjustElevenLabsVoiceId = elevenLabsVoiceId;
    cloneAdjustVoiceName = voiceName || "Voice";
    var subtitle = document.getElementById("voice-adjust-subtitle");
    if (subtitle) subtitle.textContent = 'Fine-tune "' + cloneAdjustVoiceName + '" to match your inner voice.';
    setVoiceAdjustMessage("Loading current settings...", "");
    currentUser
      .getIdToken(true)
      .then(function (token) {
        cloneAdjustToken = token || "";
        return fetch(backendBaseURL() + "/elevenlabs/voices/" + encodeURIComponent(cloneAdjustElevenLabsVoiceId) + "/settings", {
          method: "GET",
          headers: { Authorization: "Bearer " + token },
        });
      })
      .then(function (resp) {
        return resp.json().then(function (json) {
          if (!resp.ok) throw new Error((json && json.error) || "Could not load voice settings.");
          return json || {};
        });
      })
      .then(function (settings) {
        var s = document.getElementById("voice-adjust-stability");
        var m = document.getElementById("voice-adjust-similarity");
        var y = document.getElementById("voice-adjust-style");
        var b = document.getElementById("voice-adjust-speaker-boost");
        if (s) s.value = String(typeof settings.stability === "number" ? settings.stability : 0.5);
        if (m) m.value = String(typeof settings.similarity_boost === "number" ? settings.similarity_boost : 0.75);
        if (y) y.value = String(typeof settings.style === "number" ? settings.style : 0.0);
        if (b) b.checked = settings.use_speaker_boost !== false;
        updateVoiceAdjustReadout("stability");
        updateVoiceAdjustReadout("similarity");
        updateVoiceAdjustReadout("style");
        var backdrop = document.getElementById("voice-adjust-backdrop");
        if (backdrop) backdrop.hidden = false;
        setVoiceAdjustMessage("", "");
      })
      .catch(function (e) {
        setVoicesMessage(e.message || "Could not open adjustment step.", "error");
        openVoiceCompleteModal(cloneAdjustVoiceName);
      });
  }

  function closeVoiceAdjustModal() {
    var backdrop = document.getElementById("voice-adjust-backdrop");
    if (backdrop) backdrop.hidden = true;
    setVoiceAdjustMessage("", "");
  }

  function previewVoiceAdjust() {
    if (!cloneAdjustElevenLabsVoiceId || !currentUser) return;
    setVoiceAdjustMessage("Generating preview...", "");
    currentUser
      .getIdToken(true)
      .then(function (token) {
        return fetch(backendBaseURL() + "/text-to-speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({
            text: "Hello, this is a preview of how I sound.",
            voiceID: cloneAdjustElevenLabsVoiceId,
            voice_settings: currentVoiceAdjustPayload(),
          }),
        });
      })
      .then(function (resp) {
        if (!resp.ok) throw new Error("Could not generate preview.");
        return resp.blob();
      })
      .then(function (blob) {
        if (activePreviewBlobURL) {
          try { URL.revokeObjectURL(activePreviewBlobURL); } catch (_e) {}
          activePreviewBlobURL = null;
        }
        var blobURL = URL.createObjectURL(blob);
        activePreviewBlobURL = blobURL;
        stopActiveAudio(false);
        activeAudio = new Audio(blobURL);
        activeAudioScriptId = null;
        activeAudioTitle = "Adjustment preview — " + (cloneAdjustVoiceName || "Voice");
        bindAudioLifecycle(function () {
          if (activePreviewBlobURL) {
            try { URL.revokeObjectURL(activePreviewBlobURL); } catch (_e2) {}
            activePreviewBlobURL = null;
          }
          activeAudioScriptId = null;
          activeAudioTitle = "";
          activeAudio = null;
          updateMiniPlayer();
        });
        return activeAudio.play();
      })
      .then(function () {
        setVoiceAdjustMessage("Playing preview.", "success");
        updateMiniPlayer();
      })
      .catch(function (e) {
        setVoiceAdjustMessage(e.message || "Preview failed.", "error");
      });
  }

  function skipVoiceAdjust() {
    closeVoiceAdjustModal();
    openVoiceCompleteModal(cloneAdjustVoiceName || "Voice");
  }

  function saveVoiceAdjust() {
    if (!cloneAdjustElevenLabsVoiceId || !cloneAdjustToken) {
      setVoiceAdjustMessage("Missing voice settings session. Please try again.", "error");
      return;
    }
    setVoiceAdjustMessage("Saving settings...", "");
    fetch(backendBaseURL() + "/elevenlabs/voices/" + encodeURIComponent(cloneAdjustElevenLabsVoiceId) + "/settings/edit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + cloneAdjustToken,
      },
      body: JSON.stringify(currentVoiceAdjustPayload()),
    })
      .then(function (resp) {
        return resp.json().then(function (json) {
          if (!resp.ok) throw new Error((json && json.error) || "Could not save settings.");
          return true;
        }).catch(function () {
          if (!resp.ok) throw new Error("Could not save settings.");
          return true;
        });
      })
      .then(function () {
        closeVoiceAdjustModal();
        openVoiceCompleteModal(cloneAdjustVoiceName || "Voice");
      })
      .catch(function (e) {
        setVoiceAdjustMessage(e.message || "Could not save settings.", "error");
      });
  }

  function closeVoiceConsentModal() {
    var backdrop = document.getElementById("voice-consent-backdrop");
    if (backdrop) backdrop.hidden = true;
    setVoiceConsentMessage("", "");
  }

  function openVoiceConsentModal() {
    var backdrop = document.getElementById("voice-consent-backdrop");
    var check = document.getElementById("voice-consent-check");
    var btn = document.getElementById("voice-consent-continue");
    if (!backdrop || !check || !btn) return;
    check.checked = false;
    btn.disabled = true;
    setVoiceConsentMessage("", "");
    backdrop.hidden = false;
  }

  function openCloneVoiceGuideInternal() {
    setVoiceRecordingGuideVisible(true);
    setVoiceRecordButtonState(false);
    setVoicesMessage("Review the script, then tap Start Recording when ready.", "");
  }

  function ensureVoiceCloneConsentThen(action) {
    if (hasVoiceCloneConsent) {
      if (typeof action === "function") action();
      return;
    }
    openVoiceConsentModal();
  }

  function openCloneVoiceGuide() {
    ensureVoiceCloneConsentThen(function () {
      openCloneVoiceGuideInternal();
    });
  }

  function acceptVoiceCloneConsentAndContinue() {
    if (!currentUser) return;
    var check = document.getElementById("voice-consent-check");
    if (!check || !check.checked) {
      setVoiceConsentMessage("Please check consent to continue.", "error");
      return;
    }
    setVoiceConsentMessage("Saving consent...", "");
    db
      .collection("users")
      .doc(currentUser.uid)
      .set(
        {
          voiceCloneConsentAcceptedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      .then(function () {
        hasVoiceCloneConsent = true;
        currentUserProfile = Object.assign({}, currentUserProfile || {}, {
          voiceCloneConsentAcceptedAt: new Date().toISOString(),
        });
        closeVoiceConsentModal();
        openCloneVoiceGuideInternal();
      })
      .catch(function (e) {
        setVoiceConsentMessage(e.message || "Could not save consent.", "error");
      });
  }

  function voiceScriptParagraphs() {
    return String(voiceCloneReadScript || "")
      .split(/\n\s*\n/)
      .map(function (p) {
        return (p || "").trim();
      })
      .filter(function (p) {
        return !!p;
      });
  }

  function renderVoiceRecordingScript(activeIndex) {
    var container = document.getElementById("voice-recording-script");
    if (!container) return;
    var paragraphs = voiceScriptParagraphs();
    container.innerHTML = paragraphs
      .map(function (p, idx) {
        return (
          '<p class="voice-script-paragraph' +
          (idx === activeIndex ? " is-active" : "") +
          '" data-voice-script-idx="' +
          idx +
          '">' +
          escapeHtml(p) +
          "</p>"
        );
      })
      .join("");
  }

  function updateVoiceRecordingScriptProgress(elapsedSec) {
    var container = document.getElementById("voice-recording-script");
    if (!container) return;
    var paragraphs = voiceScriptParagraphs();
    if (!paragraphs.length) return;
    var wordsPerMinute = 145;
    var wordsPerSecond = wordsPerMinute / 60;
    var cumulative = 0;
    var nextIndex = paragraphs.length - 1;
    for (var i = 0; i < paragraphs.length; i++) {
      var words = paragraphs[i].split(/\s+/).filter(function (w) { return !!w; }).length;
      var segmentSeconds = Math.max(7, Math.round(words / wordsPerSecond));
      cumulative += segmentSeconds;
      if (elapsedSec <= cumulative) {
        nextIndex = i;
        break;
      }
    }
    if (nextIndex === activeVoiceScriptParagraphIndex) return;
    activeVoiceScriptParagraphIndex = nextIndex;
    renderVoiceRecordingScript(nextIndex);
    var activeEl = container.querySelector('[data-voice-script-idx="' + nextIndex + '"]');
    if (activeEl && typeof activeEl.scrollIntoView === "function") {
      try {
        activeEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch (_e) {}
    }
  }

  function setVoiceRecordingGuideVisible(visible) {
    var box = document.getElementById("voice-recording-guide");
    if (!box) return;
    box.style.display = visible ? "block" : "none";
    box.classList.toggle("is-recording", !!visible);
    if (!visible) {
      var timeEl = document.getElementById("voice-recording-guide-time");
      if (timeEl) timeEl.textContent = "0:00";
      activeVoiceScriptParagraphIndex = -1;
      renderVoiceRecordingScript(-1);
      setVoiceRecordButtonState(false);
      clearRecordedSample();
    }
  }

  function recordingDurationText() {
    if (!activeVoiceRecordingStartedAt) return "0:00";
    var elapsedSec = Math.max(0, Math.floor((Date.now() - activeVoiceRecordingStartedAt) / 1000));
    var mins = Math.floor(elapsedSec / 60);
    var secs = elapsedSec % 60;
    return mins + ":" + (secs < 10 ? "0" : "") + secs;
  }

  function beginVoiceRecordingTicker() {
    endVoiceRecordingTicker();
    activeVoiceRecordingStartedAt = Date.now();
    setVoiceRecordingStatus("Recording... " + recordingDurationText(), "error");
    var timeEl = document.getElementById("voice-recording-guide-time");
    if (timeEl) timeEl.textContent = recordingDurationText();
    updateVoiceRecordingScriptProgress(0);
    activeVoiceRecordingTimer = setInterval(function () {
      var elapsed = Math.max(0, Math.floor((Date.now() - activeVoiceRecordingStartedAt) / 1000));
      if (elapsed < 30) {
        setVoiceRecordingStatus("Recording... " + recordingDurationText() + " (Aim for at least 30s)", "error");
      } else if (elapsed < 60) {
        setVoiceRecordingStatus("Great. Keep going to 1-2 minutes for best results.", "");
      } else {
        setVoiceRecordingStatus("Perfect. You can stop anytime.", "success");
      }
      var t = document.getElementById("voice-recording-guide-time");
      if (t) t.textContent = recordingDurationText();
      updateVoiceRecordingScriptProgress(elapsed);
    }, 500);
  }

  function endVoiceRecordingTicker() {
    if (activeVoiceRecordingTimer) {
      clearInterval(activeVoiceRecordingTimer);
      activeVoiceRecordingTimer = null;
    }
    activeVoiceRecordingStartedAt = 0;
  }

  function setVoiceRecordButtonState(isRecording) {
    var btn = document.getElementById("voice-recording-toggle");
    if (!btn) return;
    btn.textContent = isRecording ? "Stop Recording" : "Start Recording";
    btn.classList.toggle("app-btn-danger", !!isRecording);
    btn.classList.toggle("app-btn-secondary", !isRecording);
  }

  function startVoiceRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoicesMessage("Microphone recording is not supported in this browser.", "error");
      openVoiceMicHelpModal("This browser does not support in-app microphone recording. Use Upload Voice Audio or try Safari/Chrome.");
      return;
    }
    if (activeVoiceRecorder) return;
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(function (stream) {
        activeVoiceRecorderStream = stream;
        activeVoiceRecorderChunks = [];
        var recorder = new MediaRecorder(stream);
        activeVoiceRecorder = recorder;
        recorder.ondataavailable = function (ev) {
          if (ev && ev.data && ev.data.size > 0) {
            activeVoiceRecorderChunks.push(ev.data);
          }
        };
        recorder.onstop = function () {
          var mimeType = recorder.mimeType || "audio/webm";
          var blob = new Blob(activeVoiceRecorderChunks, { type: mimeType });
          var elapsedCapturedSec = Math.max(1, Math.floor((Date.now() - activeVoiceRecordingStartedAt) / 1000));
          activeVoiceRecorder = null;
          activeVoiceRecorderChunks = [];
          stopVoiceRecorderStream();
          endVoiceRecordingTicker();
          setVoiceRecordButtonState(false);
          if (!blob || !blob.size) {
            setVoicesMessage("No audio captured. Please try again.", "error");
            setVoiceRecordingStatus("", "");
            return;
          }
          var extension = (mimeType || "").indexOf("ogg") >= 0 ? "ogg" : "webm";
          clearRecordedSample();
          recordedSampleBlobURL = URL.createObjectURL(blob);
          recordedSampleFile = new File([blob], "recorded-voice-sample." + extension, {
            type: mimeType || "audio/webm",
          });
          recordedSampleDurationSec = elapsedCapturedSec;
          showRecordedSampleReview();
          setVoiceRecordingStatus("Recording captured. Review it, then tap Use Recording.", "success");
        };
        recorder.onerror = function () {
          activeVoiceRecorder = null;
          activeVoiceRecorderChunks = [];
          stopVoiceRecorderStream();
          endVoiceRecordingTicker();
          setVoiceRecordButtonState(false);
          setVoicesMessage("Recording failed. Please try again.", "error");
          setVoiceRecordingStatus("", "");
        };
        recorder.start();
        setVoiceRecordButtonState(true);
        setVoiceRecordingGuideVisible(true);
        clearRecordedSample();
        beginVoiceRecordingTicker();
        setVoicesMessage("Read the script while recording, then tap Stop Recording.", "");
      })
      .catch(function (e) {
        setVoicesMessage((e && e.message) || "Microphone access was denied.", "error");
        setVoiceRecordingStatus("", "");
        openVoiceMicHelpModal("Microphone permission was denied. Please allow microphone access and try again.");
      });
  }

  function stopVoiceRecording() {
    if (!activeVoiceRecorder) return;
    try {
      activeVoiceRecorder.stop();
    } catch (_e) {
      activeVoiceRecorder = null;
      activeVoiceRecorderChunks = [];
      stopVoiceRecorderStream();
      endVoiceRecordingTicker();
      setVoiceRecordButtonState(false);
      setVoiceRecordingStatus("", "");
    }
  }

  function toggleVoiceRecording() {
    if (activeVoiceRecorder) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  }

  function uploadVoiceSample(file, mode) {
    if (!currentUser) return;
    if (!file) return;
    if (!file.type || file.type.indexOf("audio/") !== 0) {
      setVoicesMessage("Please choose an audio file.", "error");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setVoicesMessage("Audio file is too large (max 20MB).", "error");
      return;
    }

    var suggested = mode === "clone" ? "My Cloned Voice" : "My Uploaded Voice";
    var name = window.prompt("Voice name:", suggested);
    if (!name || !name.trim()) {
      setVoicesMessage("Voice creation cancelled.", "");
      return;
    }
    var description = window.prompt("Short description (optional):", "") || "";

    setVoicesMessage("Uploading voice sample...", "");
    openVoiceProcessingModal();
    currentUser
      .getIdToken(true)
      .then(function (token) {
        return readFileAsBase64(file).then(function (audioBase64) {
          return fetch(backendBaseURL() + "/elevenlabs/voices/add", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + token,
            },
            body: JSON.stringify({
              name: name.trim(),
              description: description.trim(),
              audioBase64: audioBase64,
              filename: file.name || "voice-sample",
              mimeType: file.type || "audio/mpeg",
            }),
          });
        });
      })
      .then(function (resp) {
        return resp.json().then(function (json) {
          if (!resp.ok || !json || !json.voice_id) {
            throw new Error((json && json.error) || "Voice cloning failed.");
          }
          return json.voice_id;
        });
      })
      .then(function (elevenLabsVoiceID) {
        var docRef = clonedVoicesCollection(currentUser.uid).doc();
        return clonedVoicesCollection(currentUser.uid)
          .doc(docRef.id)
          .set({
            name: name.trim(),
            description: (description || "").trim(),
            elevenLabsVoiceID: elevenLabsVoiceID,
            sampleFilename: file.name || "",
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          })
          .then(function () {
            activeVoicesTab = "my-voices";
            selectedVoiceId = docRef.id;
            return saveUserDefaults();
          })
          .then(function () {
            setVoicesMessage("Voice created and added to My Voices.", "success");
            setVoiceRecordingStatus("", "");
            setVoiceRecordingGuideVisible(false);
            renderVoices();
            closeVoiceProcessingModal();
            openVoiceAdjustModal(docRef.id, elevenLabsVoiceID, name.trim());
          });
      })
      .catch(function (e) {
        closeVoiceProcessingModal();
        setVoicesMessage(e.message || "Could not create voice.", "error");
      });
  }

  function handleVoiceRecordedBlob(blob, mimeType) {
    var extension = (mimeType || "").indexOf("ogg") >= 0 ? "ogg" : "webm";
    var file = new File([blob], "recorded-voice-sample." + extension, {
      type: mimeType || "audio/webm",
    });
    uploadVoiceSample(file, "clone");
  }

  function handleVoiceFileSelected(ev) {
    var input = ev && ev.target;
    var file = input && input.files && input.files[0] ? input.files[0] : null;
    if (!file) return;
    var mode = (input && input.getAttribute("data-voice-upload-mode")) || "upload";
    uploadVoiceSample(file, mode);
  }

  function previewVoiceSample(voice) {
    if (!currentUser || !voice || !voice.id) return;
    setVoicesMessage('Generating preview for "' + (voice.name || "voice") + '"...', "");
    currentUser
      .getIdToken(true)
      .then(function (token) {
        return fetch(backendBaseURL() + "/text-to-speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({
            text: "I am focused. I am calm. I am ready for a great day.",
            voiceID: voice.id,
          }),
        });
      })
      .then(function (resp) {
        if (!resp.ok) {
          return resp.json().then(function (json) {
            throw new Error((json && json.error) || "Could not preview voice.");
          }).catch(function () {
            throw new Error("Could not preview voice.");
          });
        }
        return resp.blob();
      })
      .then(function (blob) {
        if (activePreviewBlobURL) {
          try { URL.revokeObjectURL(activePreviewBlobURL); } catch (_e) {}
          activePreviewBlobURL = null;
        }
        var blobURL = URL.createObjectURL(blob);
        activePreviewBlobURL = blobURL;
        stopActiveAudio(false);
        activeAudio = new Audio(blobURL);
        activeAudioScriptId = null;
        activeAudioTitle = "Voice preview — " + (voice.name || "Voice");
        bindAudioLifecycle(function () {
          if (activePreviewBlobURL) {
            try { URL.revokeObjectURL(activePreviewBlobURL); } catch (_e) {}
            activePreviewBlobURL = null;
          }
          activeAudioScriptId = null;
          activeAudioTitle = "";
          activeAudio = null;
          updateMiniPlayer();
        });
        return activeAudio.play();
      })
      .then(function () {
        updateMiniPlayer();
        setVoicesMessage("Playing preview.", "success");
      })
      .catch(function (e) {
        setVoicesMessage(e.message || "Could not preview voice.", "error");
      });
  }

  function setVoiceSettingsMessage(text, kind) {
    var el = document.getElementById("voice-settings-message");
    if (!el) return;
    el.className = "app-inline-msg" + (kind ? " " + kind : "");
    el.textContent = text || "";
  }

  function updateVoiceSettingsReadout(kind) {
    var input = document.getElementById("voice-setting-" + kind);
    var out = document.getElementById("voice-setting-" + kind + "-value");
    if (!input || !out) return;
    var val = Number(input.value || 0);
    if (!isFinite(val)) val = 0;
    out.textContent = val.toFixed(2);
  }

  function closeVoiceSettingsModal() {
    var backdrop = document.getElementById("voice-settings-backdrop");
    if (backdrop) backdrop.hidden = true;
    editingVoiceSettingsId = null;
    editingVoiceSettingsToken = "";
    setVoiceSettingsMessage("", "");
  }

  function openVoiceSettingsModal(voice, token, settings) {
    var backdrop = document.getElementById("voice-settings-backdrop");
    if (!backdrop || !voice || !voice.id) return;
    editingVoiceSettingsId = voice.id;
    editingVoiceSettingsToken = token || "";

    var subtitle = document.getElementById("voice-settings-subtitle");
    var stability = document.getElementById("voice-setting-stability");
    var similarity = document.getElementById("voice-setting-similarity");
    var style = document.getElementById("voice-setting-style");
    var speaker = document.getElementById("voice-setting-speaker-boost");
    if (!stability || !similarity || !style || !speaker) return;

    var s = settings || {};
    stability.value = String(typeof s.stability === "number" ? s.stability : 0.5);
    similarity.value = String(typeof s.similarity_boost === "number" ? s.similarity_boost : 0.8);
    style.value = String(typeof s.style === "number" ? s.style : 0.3);
    speaker.checked = s.use_speaker_boost !== false;

    updateVoiceSettingsReadout("stability");
    updateVoiceSettingsReadout("similarity");
    updateVoiceSettingsReadout("style");
    if (subtitle) subtitle.textContent = 'Editing "' + (voice.name || "Cloned voice") + '"';
    setVoiceSettingsMessage("", "");

    backdrop.hidden = false;
  }

  function saveVoiceSettingsFromModal() {
    var cloned = clonedVoiceById(editingVoiceSettingsId);
    if (!currentUser || !cloned || !cloned.elevenLabsVoiceID || !editingVoiceSettingsToken) {
      setVoiceSettingsMessage("Voice settings session expired. Reopen settings and try again.", "error");
      return;
    }

    function clamp01(n, fallback) {
      var x = Number(n);
      if (!isFinite(x)) return fallback;
      return Math.max(0, Math.min(1, x));
    }

    var stability = document.getElementById("voice-setting-stability");
    var similarity = document.getElementById("voice-setting-similarity");
    var style = document.getElementById("voice-setting-style");
    var speaker = document.getElementById("voice-setting-speaker-boost");
    if (!stability || !similarity || !style || !speaker) return;

    var payload = {
      stability: clamp01(stability.value, 0.5),
      similarity_boost: clamp01(similarity.value, 0.8),
      style: clamp01(style.value, 0.3),
      use_speaker_boost: !!speaker.checked,
    };

    setVoiceSettingsMessage("Saving voice settings...", "");
    fetch(backendBaseURL() + "/elevenlabs/voices/" + encodeURIComponent(cloned.elevenLabsVoiceID) + "/settings/edit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + editingVoiceSettingsToken,
      },
      body: JSON.stringify(payload),
    })
      .then(function (resp) {
        return resp.json().then(function (json) {
          if (!resp.ok) throw new Error((json && json.error) || "Could not save settings.");
          return true;
        }).catch(function () {
          if (!resp.ok) throw new Error("Could not save settings.");
          return true;
        });
      })
      .then(function () {
        closeVoiceSettingsModal();
        setVoicesMessage("Voice settings updated.", "success");
      })
      .catch(function (e) {
        setVoiceSettingsMessage(e.message || "Could not update voice settings.", "error");
      });
  }

  function editClonedVoiceSettings(voiceID) {
    var cloned = clonedVoiceById(voiceID);
    if (!currentUser || !cloned || !cloned.elevenLabsVoiceID) {
      setVoicesMessage("Could not find cloned voice settings target.", "error");
      return;
    }
    setVoicesMessage("Loading current settings...", "");
    currentUser
      .getIdToken(true)
      .then(function (token) {
        return fetch(backendBaseURL() + "/elevenlabs/voices/" + encodeURIComponent(cloned.elevenLabsVoiceID) + "/settings", {
          method: "GET",
          headers: {
            Authorization: "Bearer " + token,
          },
        }).then(function (resp) {
          return resp.json().then(function (json) {
            if (!resp.ok) throw new Error((json && json.error) || "Could not load voice settings.");
            return { token: token, settings: json || {}, voice: cloned };
          });
        });
      })
      .then(function (ctx) {
        openVoiceSettingsModal(ctx.voice, ctx.token, ctx.settings);
      })
      .catch(function (e) {
        setVoicesMessage(e.message || "Could not update voice settings.", "error");
      });
  }

  function deleteClonedVoice(voiceID) {
    var cloned = clonedVoiceById(voiceID);
    if (!currentUser || !cloned || !cloned.elevenLabsVoiceID) {
      setVoicesMessage("Could not find cloned voice to delete.", "error");
      return;
    }
    if (!window.confirm('Delete cloned voice "' + (cloned.name || "voice") + '"?')) return;
    setVoicesMessage("Deleting cloned voice...", "");
    currentUser
      .getIdToken(true)
      .then(function (token) {
        return fetch(backendBaseURL() + "/elevenlabs/voices/" + encodeURIComponent(cloned.elevenLabsVoiceID), {
          method: "DELETE",
          headers: {
            Authorization: "Bearer " + token,
          },
        }).then(function (resp) {
          if (!resp.ok) {
            return resp.text().then(function (t) {
              throw new Error(t || "Could not delete cloned voice from provider.");
            });
          }
          return true;
        });
      })
      .then(function () {
        return clonedVoicesCollection(currentUser.uid).doc(cloned.id).delete();
      })
      .then(function () {
        if (selectedVoiceId === cloned.id) {
          selectedVoiceId = availableVoices.length ? availableVoices[0].id : selectedVoiceId;
          return saveUserDefaults();
        }
        return null;
      })
      .then(function () {
        setVoicesMessage("Cloned voice deleted.", "success");
      })
      .catch(function (e) {
        setVoicesMessage(e.message || "Could not delete cloned voice.", "error");
      });
  }

  function renderBackgrounds() {
    var list = document.getElementById("backgrounds-list");
    if (!list) return;
    list.innerHTML = availableBackgrounds
      .map(function (b) {
        var isSelected = b.id === selectedBackgroundId;
        return (
          '<div class="app-modal-row" style="margin-bottom:0.45rem;">' +
          '  <div class="app-modal-row-name">' +
          escapeHtml(b.name) +
          ' <span class="app-muted" style="font-size:0.78rem;">(' +
          escapeHtml(b.categoryID || "general") +
          ")</span></div>" +
          '  <button type="button" class="app-btn ' +
          (isSelected ? "app-btn-primary" : "app-btn-secondary") +
          '" data-background-id="' +
          escapeHtml(b.id) +
          '">' +
          (isSelected ? "Default" : "Set Default") +
          "</button>" +
          "</div>"
        );
      })
      .join("");
    list.querySelectorAll("[data-background-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var backgroundID = btn.getAttribute("data-background-id");
        if (!backgroundID || backgroundID === selectedBackgroundId) return;
        selectedBackgroundId = backgroundID;
        setBackgroundsMessage("Saving default background...", "");
        saveUserDefaults()
          .then(function () {
            renderBackgrounds();
            setBackgroundsMessage("Default background saved.", "success");
          })
          .catch(function (e) {
            setBackgroundsMessage(e.message || "Could not save default background.", "error");
          });
      });
    });
  }

  function setAccountMessage(text, kind) {
    var el = document.getElementById("account-message");
    if (!el) return;
    el.className = "app-inline-msg" + (kind ? " " + kind : "");
    el.textContent = text || "";
  }

  function updateAccountLastLoginLabel() {
    var el = document.getElementById("account-last-login");
    if (!el) return;
    var lastLogin =
      currentUser &&
      currentUser.metadata &&
      currentUser.metadata.lastSignInTime;
    el.textContent = formatDateString(lastLogin);
  }

  function saveAccountDisplayName() {
    if (!currentUser) return;
    var input = document.getElementById("account-display-name");
    var name = ((input && input.value) || "").trim();
    if (!name) {
      setAccountMessage("Display name cannot be empty.", "error");
      return;
    }
    setAccountMessage("Saving...", "");
    currentUser
      .updateProfile({ displayName: name })
      .then(function () {
        return db
          .collection("users")
          .doc(currentUser.uid)
          .set(
            {
              displayName: name,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
      })
      .then(function () {
        setAccountMessage("Display name saved successfully.", "success");
      })
      .catch(function (e) {
        setAccountMessage(e.message || "Could not save display name. Please try again.", "error");
      });
  }

  function sendPasswordResetFromAccount() {
    if (!currentUser || !currentUser.email) {
      setAccountMessage("No email found for this account.", "error");
      return;
    }
    auth
      .sendPasswordResetEmail(currentUser.email)
      .then(function () {
        setAccountMessage("Password reset email sent. Check your inbox.", "success");
      })
      .catch(function (e) {
        setAccountMessage(e.message || "Could not send reset email. Please try again.", "error");
      });
  }

  function refreshSessionToken() {
    if (!currentUser) return;
    setAccountMessage("Refreshing session...", "");
    currentUser
      .getIdToken(true)
      .then(function () {
        return currentUser.reload();
      })
      .then(function () {
        currentUser = auth.currentUser || currentUser;
        updateAccountLastLoginLabel();
        setAccountMessage("Session refreshed. Account details are up to date.", "success");
      })
      .catch(function (e) {
        setAccountMessage(e.message || "Could not refresh session. Please try again.", "error");
      });
  }

  function selectedCategory() {
    return (
      surveyCategories.find(function (c) {
        return c.id === activeCategoryId;
      }) || surveyCategories[0]
    );
  }

  function scriptsWithAudioCount() {
    return currentScripts.filter(function (s) {
      return !!(s.audioURL && String(s.audioURL).trim());
    }).length;
  }

  function publishedByMeCount() {
    if (!currentUser) return 0;
    return currentPremade.filter(function (p) {
      return p.createdByUID && p.createdByUID === currentUser.uid;
    }).length;
  }

  function mostRecentScriptUpdateLabel() {
    if (!currentScripts.length) return "No scripts yet";
    var latest = currentScripts.reduce(function (best, s) {
      var candidate = s.updatedAt || s.createdAt || null;
      var bestTs = best && (best.updatedAt || best.createdAt || null);
      var cMillis =
        candidate && typeof candidate.toMillis === "function" ? candidate.toMillis() : 0;
      var bMillis =
        bestTs && typeof bestTs.toMillis === "function" ? bestTs.toMillis() : 0;
      return cMillis > bMillis ? s : best;
    }, null);
    var ts = latest && (latest.updatedAt || latest.createdAt || null);
    return "Last script update: " + formatDate(ts);
  }

  function resolvePlanLabel() {
    if (!currentUserProfile) return "Plan not set";
    var candidates = [
      currentUserProfile.subscriptionTier,
      currentUserProfile.plan,
      currentUserProfile.tier,
    ];
    for (var i = 0; i < candidates.length; i += 1) {
      var raw = (candidates[i] || "").toString().trim();
      if (raw) return raw;
    }
    return "Plan not set";
  }

  function setHomeFlowStep(step, displayName) {
    homeFlowStep = step;
    renderHomeFlow(displayName || "");
  }

  function renderHomeFlow(displayName) {
    var el = document.getElementById("home-flow");
    if (!el) return;
    var cat = selectedCategory();
    if (homeFlowStep === "landing") {
      el.innerHTML =
        '<div style="display:flex;flex-direction:column;gap:0.65rem;">' +
        '  <div class="app-card app-glass-card" style="margin:0;padding:0.95rem 0.9rem;">' +
        '    <div class="app-home-hero">' +
        '      <div>' +
        '        <p class="app-home-hero-title">Welcome' +
        (displayName ? ", <strong>" + escapeHtml(displayName) + "</strong>" : "") +
        ".</p>" +
        '        <p class="app-home-hero-subtitle">Where Focus Becomes Power.</p>' +
        "      </div>" +
        '      <span class="app-chip">' + escapeHtml(resolvePlanLabel()) + "</span>" +
        "    </div>" +
        '    <div style="display:flex;justify-content:space-between;align-items:center;gap:0.45rem;flex-wrap:wrap;margin-bottom:0.45rem;">' +
        '      <strong style="font-size:0.95rem;">Your Dashboard</strong>' +
        '      <span class="app-muted" style="font-size:0.8rem;">Cross-device sync</span>' +
        "    </div>" +
        '    <div class="app-stat-grid">' +
        '      <div class="app-stat-tile"><div class="app-stat-label"><span aria-hidden="true">📝</span> Scripts</div><div class="app-stat-value">' +
        escapeHtml(String(currentScripts.length)) +
        "</div></div>" +
        '      <div class="app-stat-tile"><div class="app-stat-label"><span aria-hidden="true">🎧</span> Audio Ready</div><div class="app-stat-value">' +
        escapeHtml(String(scriptsWithAudioCount())) +
        "</div></div>" +
        '      <div class="app-stat-tile"><div class="app-stat-label"><span aria-hidden="true">📚</span> Playlists</div><div class="app-stat-value">' +
        escapeHtml(String(currentPlaylists.length)) +
        "</div></div>" +
        '      <div class="app-stat-tile"><div class="app-stat-label"><span aria-hidden="true">☁️</span> Published</div><div class="app-stat-value">' +
        escapeHtml(String(publishedByMeCount())) +
        "</div></div>" +
        "    </div>" +
        '    <p class="app-muted" style="margin:0.55rem 0 0;">' + escapeHtml(mostRecentScriptUpdateLabel()) + "</p>" +
        "  </div>" +
        '  <div class="app-card app-glass-card" style="margin:0;padding:0.95rem 0.9rem;">' +
        '    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.6rem;flex-wrap:wrap;">' +
        "      <div>" +
        '        <strong style="font-size:1rem;">Create Personalized Mental Script</strong>' +
        '        <p class="app-muted" style="margin:0.25rem 0 0;">Follow category selection, then answer your survey questions.</p>' +
        "      </div>" +
        "    </div>" +
        '    <div style="margin-top:0.75rem;"><button type="button" class="app-btn app-btn-primary" id="home-start-create">Create Personalized Mental Script</button></div>' +
        "  </div>" +
        '  <div class="app-card" style="margin:0;padding:0.85rem;border-radius:14px;">' +
        '    <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.45rem;">' +
        '      <strong style="font-size:0.95rem;">Account-linked data</strong>' +
        '      <span class="app-chip">' + escapeHtml(resolvePlanLabel()) + "</span>" +
        "    </div>" +
        '    <p class="app-muted" style="margin:0;">This dashboard is pulled from your Firebase account data so your numbers stay consistent across devices.</p>' +
        "  </div>" +
        "</div>";
      var startBtn = document.getElementById("home-start-create");
      if (startBtn) {
        startBtn.addEventListener("click", function () {
          setHomeFlowStep("category", displayName);
        });
      }
      return;
    }
    if (homeFlowStep === "category") {
      el.innerHTML =
        '<div style="display:flex;flex-direction:column;gap:0.65rem;">' +
        '  <p class="app-muted" style="margin:0;">Choose a category to personalize your script.</p>' +
        '  <div id="home-category-list" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:0.5rem;"></div>' +
        '  <div><button type="button" class="app-btn app-btn-secondary" id="home-back-landing">Back</button></div>' +
        "</div>";
      var list = document.getElementById("home-category-list");
      if (list) {
        list.innerHTML = surveyCategories
          .map(function (c) {
            return (
              '<button type="button" class="app-btn app-btn-secondary" data-home-category="' +
              escapeHtml(c.id) +
              '" style="text-align:left;">' +
              escapeHtml(c.name) +
              "</button>"
            );
          })
          .join("");
        list.querySelectorAll("[data-home-category]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            activeCategoryId = btn.getAttribute("data-home-category") || "confidence";
            setHomeFlowStep("survey", displayName);
          });
        });
      }
      var backLanding = document.getElementById("home-back-landing");
      if (backLanding) {
        backLanding.addEventListener("click", function () {
          setHomeFlowStep("landing", displayName);
        });
      }
      return;
    }
    el.innerHTML =
      '<form id="generate-form" class="app-form" style="margin:0;">' +
      '  <p class="app-muted" style="margin:0 0 0.45rem;">Category: <strong>' +
      escapeHtml(cat.name) +
      "</strong></p>" +
      '  <label id="gen-q1-label" for="gen-q1" style="margin-top:0.2rem;">' +
      escapeHtml(cat.questions[0] || "Question 1") +
      "</label>" +
      '  <textarea id="gen-q1" required></textarea>' +
      '  <label id="gen-q2-label" for="gen-q2">' +
      escapeHtml(cat.questions[1] || "Question 2") +
      "</label>" +
      '  <textarea id="gen-q2" required></textarea>' +
      '  <label for="gen-tone">Tone</label>' +
      '  <select id="gen-tone" class="app-btn" style="width:100%;text-align:left;">' +
      '    <option value="Calming">Calming</option>' +
      '    <option value="Motivational">Motivational</option>' +
      '    <option value="Compassionate">Compassionate</option>' +
      '    <option value="Assertive">Assertive</option>' +
      "  </select>" +
      '  <label for="gen-length" style="margin-top:0.8rem;">Length</label>' +
      '  <select id="gen-length" class="app-btn" style="width:100%;text-align:left;">' +
      '    <option value="Short">Short</option>' +
      '    <option value="Medium" selected>Medium</option>' +
      '    <option value="Long">Long</option>' +
      "  </select>" +
      '  <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.9rem;">' +
      '    <button type="button" class="app-btn app-btn-secondary" id="home-back-category">Back to Categories</button>' +
      '    <button type="submit" class="app-btn app-btn-primary">Generate & Save</button>' +
      "  </div>" +
      "</form>";
    var form = document.getElementById("generate-form");
    if (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        generateAndSavePersonalizedScript(displayName || "");
      });
    }
    var backCategory = document.getElementById("home-back-category");
    if (backCategory) {
      backCategory.addEventListener("click", function () {
        setHomeFlowStep("category", displayName);
      });
    }
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
            backgroundID: selectedBackgroundId,
            voiceID: selectedVoiceId,
            audioCreatedAt: null,
            categoryID: cat.id,
          })
          .then(function () {
            generationMessage("Generated and saved as \"" + title + "\".", "success");
            var q1El = document.getElementById("gen-q1");
            var q2El = document.getElementById("gen-q2");
            if (q1El) q1El.value = "";
            if (q2El) q2El.value = "";
            setMessage("Generated script saved to My Library.", "success");
            setHomeFlowStep("landing", displayName || "");
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

  function setPremadeMessage(text, kind) {
    var el = document.getElementById("premade-message");
    if (!el) return;
    el.className = "app-inline-msg" + (kind ? " " + kind : "");
    el.textContent = text || "";
  }

  function updateTabCounts() {
    var cLib = document.getElementById("count-library");
    var cPlay = document.getElementById("count-playlists");
    var cPre = document.getElementById("count-premade");
    if (cLib) cLib.textContent = String(currentScripts.length);
    if (cPlay) cPlay.textContent = String(currentPlaylists.length);
    if (cPre) cPre.textContent = String(currentPremade.length);
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
    var isExpanded = expandedScriptTextById[script.id] === true;
    var isBusy = isScriptBusy(script.id);
    var hasAudio = !!(script.audioURL && String(script.audioURL).trim());
    var playingThis = activeAudioScriptId === script.id && activeAudio && !activeAudio.paused;
    var scriptVoiceID = (script.voiceID || "").trim() || selectedVoiceId;
    var scriptBackgroundID = (script.backgroundID || "").trim() || selectedBackgroundId;
    return (
      '<article class="app-card" data-script-id="' +
      escapeHtml(script.id) +
      '">' +
      "<h3>" +
      escapeHtml(script.title || "Untitled Script") +
      "</h3>" +
      '<div class="app-card-meta-row">' +
      '<div class="app-card-meta">Created: ' +
      escapeHtml(formatDate(script.createdAt)) +
      "</div>" +
      '<span class="app-chip">My Library</span>' +
      "</div>" +
      (isExpanded
        ? '<p class="app-card-text">' + escapeHtml(plainText) + "</p>"
        : '<p class="app-card-collapsed-note"><span aria-hidden="true">▸</span> Script preview hidden</p>') +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.45rem;margin-top:0.55rem;">' +
      '  <button type="button" class="app-btn app-btn-secondary" data-script-media-open="' +
      escapeHtml(script.id) +
      '" data-script-media-field="voice" style="text-align:left;">Voice: ' +
      escapeHtml(voiceNameById(scriptVoiceID)) +
      "</button>" +
      '  <button type="button" class="app-btn app-btn-secondary" data-script-media-open="' +
      escapeHtml(script.id) +
      '" data-script-media-field="background" style="text-align:left;">Background: ' +
      escapeHtml(backgroundNameById(scriptBackgroundID)) +
      "</button>" +
      "</div>" +
      '<div class="app-card-actions">' +
      '  <button type="button" class="app-btn app-btn-secondary" data-action="toggle-text" data-script-id="' +
      escapeHtml(script.id) +
      '">' +
      (isExpanded ? "Hide Text" : "Show Text") +
      "</button>" +
      '  <button type="button" class="app-btn app-btn-primary" data-action="generate-audio" data-script-id="' +
      escapeHtml(script.id) +
      '"' +
      (isBusy ? " disabled" : "") +
      ">" +
      (isBusy ? "Generating audio..." : "Generate Audio") +
      "</button>" +
      '  <button type="button" class="app-btn app-btn-secondary" data-action="play-audio" data-script-id="' +
      escapeHtml(script.id) +
      '"' +
      (!hasAudio || isBusy ? " disabled" : "") +
      ">" +
      (playingThis ? "Pause" : "Play") +
      "</button>" +
      '  <button type="button" class="app-btn app-btn-secondary" data-action="edit" data-script-id="' +
      escapeHtml(script.id) +
      '">Edit</button>' +
      '  <button type="button" class="app-btn app-btn-ghost" data-action="add-to-playlist" data-script-id="' +
      escapeHtml(script.id) +
      '"' +
      (!currentPlaylists.length ? " disabled" : "") +
      ">Add to Playlist</button>" +
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
        if (action === "toggle-text") {
          expandedScriptTextById[script.id] = expandedScriptTextById[script.id] !== true;
          renderScripts(currentScripts);
        } else if (action === "edit") {
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
    list.querySelectorAll("[data-script-media-open]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var scriptId = btn.getAttribute("data-script-media-open");
        var field = btn.getAttribute("data-script-media-field");
        if (!scriptId || !field) return;
        openMediaPicker({
          kind: "script",
          id: scriptId,
          field: field,
        });
      });
    });
  }

  function updateScriptMediaSettings(scriptId, patch) {
    if (!currentUser || !scriptId || !patch) return;
    scriptCollection(currentUser.uid)
      .doc(scriptId)
      .set(
        {
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          ...(patch || {}),
        },
        { merge: true }
      )
      .then(function () {
        setMessage("Script audio settings updated.", "success");
      })
      .catch(function (e) {
        setMessage(e.message || "Could not update script settings.", "error");
      });
  }

  function openMediaPicker(target) {
    mediaPickerTarget = target || null;
    var backdrop = document.getElementById("media-picker-backdrop");
    var title = document.getElementById("media-picker-title");
    var subtitle = document.getElementById("media-picker-subtitle");
    var list = document.getElementById("media-picker-list");
    var searchInput = document.getElementById("media-picker-search");
    if (!backdrop || !title || !subtitle || !list || !searchInput || !mediaPickerTarget) return;

    var isVoice = mediaPickerTarget.field === "voice";
    var options = isVoice ? allVoiceOptionsForSelection() : availableBackgrounds;
    var currentValue = "";
    if (mediaPickerTarget.kind === "script") {
      var script = currentScripts.find(function (s) {
        return s.id === mediaPickerTarget.id;
      });
      if (!script) return;
      currentValue = isVoice
        ? (script.voiceID || "").trim() || selectedVoiceId
        : (script.backgroundID || "").trim() || selectedBackgroundId;
      title.textContent = isVoice ? "Select Voice" : "Select Background";
      subtitle.textContent = script.title || "Script";
    } else {
      var premade = currentPremade.find(function (p) {
        return p.id === mediaPickerTarget.id;
      });
      if (!premade) return;
      currentValue = isVoice
        ? premadeVoiceOverrideById[premade.id] || selectedVoiceId
        : premadeBackgroundOverrideById[premade.id] || selectedBackgroundId;
      title.textContent = isVoice ? "Select Voice Override" : "Select Background Override";
      subtitle.textContent = premade.title || "Premade";
    }

  function recommendedOptionIDs(kind, categoryID, voiceOptions) {
      if (kind === "voice") {
        var preferred = ["lnieQLGTodpbhjpZtg1k", "YZHSTqsq1isdXNsFLzBw"];
        var existing = {};
        (voiceOptions || []).forEach(function (v) {
          existing[v.id] = true;
        });
        var out = preferred.filter(function (id) {
          return existing[id];
        });
        (currentClonedVoices || []).slice(0, 2).forEach(function (v) {
          if (v && v.id && out.indexOf(v.id) < 0) out.push(v.id);
        });
        return out;
      }
      if (!categoryID) return ["bg-none", "bg-rain", "bg-piano"];
      return availableBackgrounds
        .filter(function (b) {
          return b.id === "bg-none" || b.categoryID === categoryID || b.categoryID === "general";
        })
        .slice(0, 4)
        .map(function (b) {
          return b.id;
        });
    }

    var activeCategoryID = null;
    if (mediaPickerTarget.kind === "script") {
      var categoryScript = currentScripts.find(function (s) {
        return s.id === mediaPickerTarget.id;
      });
      activeCategoryID = categoryScript && categoryScript.categoryID ? categoryScript.categoryID : null;
    } else {
      var categoryPremade = currentPremade.find(function (p) {
        return p.id === mediaPickerTarget.id;
      });
      activeCategoryID = categoryPremade && categoryPremade.categoryID ? categoryPremade.categoryID : null;
    }

    function optionRowHtml(opt, selected) {
      return (
        '<button type="button" class="app-picker-option' +
        (selected ? " is-selected" : "") +
        '" data-media-option="' +
        escapeHtml(opt.id) +
        '">' +
        '<span>' +
        escapeHtml(opt.name) +
        "</span>" +
        '<span class="app-picker-check" aria-hidden="true">' +
        (selected ? "✓" : "") +
        "</span>" +
        "</button>"
      );
    }

    function sectionHtml(titleText, items, selectedID) {
      if (!items.length) return "";
      return (
        '<div class="app-picker-group">' +
        '<p class="app-picker-group-title">' +
        escapeHtml(titleText) +
        "</p>" +
        items
          .map(function (opt) {
            return optionRowHtml(opt, opt.id === selectedID);
          })
          .join("") +
        "</div>"
      );
    }

    function renderPickerOptions(filterText) {
      var q = (filterText || "").trim().toLowerCase();
      var filtered = options.filter(function (opt) {
        if (!q) return true;
        var name = (opt.name || "").toLowerCase();
        var id = (opt.id || "").toLowerCase();
        var cat = (opt.categoryID || "").toLowerCase();
        return name.indexOf(q) >= 0 || id.indexOf(q) >= 0 || cat.indexOf(q) >= 0;
      });
      var defaultItem = filtered.find(function (opt) {
        return opt.id === (isVoice ? selectedVoiceId : selectedBackgroundId);
      });
      var recommendedIDs = recommendedOptionIDs(
        isVoice ? "voice" : "background",
        activeCategoryID,
        isVoice ? options : []
      );
      var recommended = filtered.filter(function (opt) {
        return recommendedIDs.indexOf(opt.id) >= 0;
      });
      var groupedIDs = {};
      if (defaultItem) groupedIDs[defaultItem.id] = true;
      recommended.forEach(function (opt) {
        groupedIDs[opt.id] = true;
      });
      var allRemaining = filtered.filter(function (opt) {
        return !groupedIDs[opt.id];
      });

      if (!filtered.length) {
        list.innerHTML = '<p class="app-muted">No results found.</p>';
        bindPickerOptionClicks();
        return;
      }

      list.innerHTML =
        sectionHtml("Default", defaultItem ? [defaultItem] : [], currentValue) +
        sectionHtml("Recommended", recommended, currentValue) +
        sectionHtml("All", allRemaining, currentValue);
      bindPickerOptionClicks();
    }

    function bindPickerOptionClicks() {
      list.querySelectorAll("[data-media-option]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var selectedID = btn.getAttribute("data-media-option");
        if (!selectedID || !mediaPickerTarget) return;
        if (mediaPickerTarget.kind === "script") {
          var patch = mediaPickerTarget.field === "voice" ? { voiceID: selectedID } : { backgroundID: selectedID };
          updateScriptMediaSettings(mediaPickerTarget.id, patch);
          closeMediaPicker();
          return;
        }
        if (mediaPickerTarget.field === "voice") {
          premadeVoiceOverrideById[mediaPickerTarget.id] = selectedID;
        } else {
          premadeBackgroundOverrideById[mediaPickerTarget.id] = selectedID;
        }
        renderPremade();
        closeMediaPicker();
      });
      });
    }

    searchInput.value = "";
    searchInput.oninput = function () {
      renderPickerOptions(searchInput.value || "");
    };
    renderPickerOptions("");
    setMediaPickerMessage("", "");
    backdrop.hidden = false;
    setTimeout(function () {
      try {
        searchInput.focus();
      } catch (_e) {}
    }, 0);
  }

  function closeMediaPicker() {
    var backdrop = document.getElementById("media-picker-backdrop");
    if (backdrop) backdrop.hidden = true;
    mediaPickerTarget = null;
    setMediaPickerMessage("", "");
  }

  function renderScripts(scripts) {
    var list = document.getElementById("scripts-list");
    if (!list) return;
    if (!scripts.length) {
      list.innerHTML =
        '<div class="app-empty-hint">No scripts yet. Tap <strong>+ New Script</strong> to create one, or use the <strong>Home</strong> tab flow to generate a personalized mental script and auto-save it here.</div>';
      return;
    }
    var nextExpanded = {};
    scripts.forEach(function (s) {
      if (expandedScriptTextById[s.id] === true) nextExpanded[s.id] = true;
    });
    expandedScriptTextById = nextExpanded;
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
        backgroundID: selectedBackgroundId,
        voiceID: selectedVoiceId,
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
    if (activePreviewBlobURL) {
      try {
        URL.revokeObjectURL(activePreviewBlobURL);
      } catch (_e2) {}
      activePreviewBlobURL = null;
    }
    activeAudio = null;
    activeAudioScriptId = null;
    if (resetQueue) {
      activePlaylistQueue = [];
      activePlaylistIndex = -1;
    }
    activeAudioTitle = "";
    updateMiniPlayer();
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
    activeAudioTitle = script.title || "Audio";
    bindAudioLifecycle();
    activeAudio
      .play()
      .then(function () {
        updateMiniPlayer();
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
    activeAudioTitle = script.title || "Playlist audio";
    bindAudioLifecycle(function () {
      playQueueAt(activePlaylistIndex + 1);
    });
    activeAudio
      .play()
      .then(function () {
        updateMiniPlayer();
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

  function bindAudioLifecycle(onEnded) {
    if (!activeAudio) return;
    activeAudio.addEventListener("play", updateMiniPlayer);
    activeAudio.addEventListener("pause", updateMiniPlayer);
    activeAudio.addEventListener("timeupdate", updateMiniPlayer);
    activeAudio.addEventListener("ended", function () {
      if (typeof onEnded === "function") {
        onEnded();
      } else {
        activeAudioScriptId = null;
        activeAudioTitle = "";
        activeAudio = null;
      }
      updateMiniPlayer();
      renderScripts(currentScripts);
      renderSelectedPlaylistDetail();
    });
  }

  function formatTime(sec) {
    var s = Math.max(0, Math.floor(sec));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  function updateMiniPlayer() {
    var shell = document.getElementById("mini-player");
    if (!shell) return;
    if (!activeAudio) {
      shell.hidden = true;
      return;
    }
    shell.hidden = false;
    var titleEl = document.getElementById("mini-player-title");
    var toggleEl = document.getElementById("mini-player-toggle");
    var timeEl = document.getElementById("mini-player-time");
    if (titleEl) titleEl.textContent = activeAudioTitle || "Now playing";
    if (toggleEl) toggleEl.textContent = activeAudio.paused ? "Play" : "Pause";
    if (timeEl) timeEl.textContent = formatTime(activeAudio.currentTime || 0);
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
          backgroundID: script.backgroundID || selectedBackgroundId || "",
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
      list.innerHTML =
        '<div class="app-empty-hint">No playlists yet. Tap <strong>+ New Playlist</strong>, then add scripts from <strong>My Library</strong> using <em>Add to Playlist</em>.</div>';
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
    createPlaylistNamed(trimmed).catch(function () {});
  }

  function createPlaylistNamed(name) {
    if (!currentUser) return Promise.resolve(null);
    var trimmed = (name || "").trim();
    if (!trimmed) return Promise.resolve(null);
    var order = currentPlaylists.reduce(function (max, p) {
      return Math.max(max, p.order || 0);
    }, -1);
    return playlistCollection(currentUser.uid)
      .add({
        name: trimmed,
        colorIndex: 0,
        scriptIDs: [],
        items: [],
        loop: false,
        mixMode: false,
        order: order + 1,
      })
      .then(function (ref) {
        setPlaylistsMessage('Playlist "' + trimmed + '" created.', "success");
        return {
          id: ref.id,
          name: trimmed,
          scriptIDs: [],
          order: order + 1,
          colorIndex: 0,
          loop: false,
          mixMode: false,
        };
      })
      .catch(function (e) {
        setPlaylistsMessage(e.message || "Could not create playlist.", "error");
        throw e;
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
    openPlaylistPicker(script, function (playlist) {
      setPlaylistsMessage('Added to "' + playlist.name + '".', "success");
    });
  }

  function addScriptToPlaylist(script, p) {
    if (!currentUser) return;
    var ids = (p.scriptIDs || []).slice();
    if (!ids.includes(script.id)) ids.push(script.id);
    var items = ids.map(function (id) {
      return { type: "script", id: id };
    });
    return playlistCollection(currentUser.uid)
      .doc(p.id)
      .set(
        {
          scriptIDs: ids,
          items: items,
        },
        { merge: true }
      )
      .then(function () {
        return p;
      })
      .catch(function (e) {
        setPlaylistsMessage(e.message || "Could not add to playlist.", "error");
        throw e;
      });
  }

  function renderPlaylistPickerOptions() {
    var list = document.getElementById("playlist-picker-list");
    if (!list) return;
    if (!playlistPickerScript) {
      list.innerHTML = '<p class="app-muted">Select a script first.</p>';
      return;
    }
    if (!currentPlaylists.length) {
      list.innerHTML = '<p class="app-muted">No playlists yet. Create one above.</p>';
      return;
    }
    list.innerHTML = currentPlaylists
      .map(function (p) {
        return (
          '<div class="app-modal-row">' +
          '  <div class="app-modal-row-name">' +
          escapeHtml(p.name || "Untitled Playlist") +
          "</div>" +
          '  <button type="button" class="app-btn" data-picker-playlist-id="' +
          escapeHtml(p.id) +
          '">Add</button>' +
          "</div>"
        );
      })
      .join("");
    list.querySelectorAll("[data-picker-playlist-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var pid = btn.getAttribute("data-picker-playlist-id");
        var p = currentPlaylists.find(function (x) {
          return x.id === pid;
        });
        if (!p || !playlistPickerScript) return;
        addScriptToPlaylist(playlistPickerScript, p)
          .then(function () {
            if (playlistPickerSuccessHandler) playlistPickerSuccessHandler(p);
            closePlaylistPicker();
          })
          .catch(function () {});
      });
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
          updateTabCounts();
          renderPlaylistPickerOptions();
          if (activeAdminTab === "home") renderHomeFlow((currentUser && currentUser.displayName) || "");
        },
        function (e) {
          setPlaylistsMessage(e.message || "Could not load playlists.", "error");
          currentPlaylists = [];
          renderPlaylists([]);
        }
      );
  }

  function premadeToScript(premade) {
    return {
      id: premade.id,
      title: premade.title,
      text: premade.scriptText || "",
      audioURL: premade.audioURL || "",
      voiceID: selectedVoiceId,
      backgroundID: "",
      createdAt: null,
    };
  }

  function resolvePremadeVoiceSelection(premade) {
    if (!premade) return selectedVoiceId;
    return premadeVoiceOverrideById[premade.id] || selectedVoiceId;
  }

  function resolvePremadeBackgroundSelection(premade) {
    if (!premade) return selectedBackgroundId;
    return premadeBackgroundOverrideById[premade.id] || selectedBackgroundId;
  }

  function savePremadeToMyLibrary(premade) {
    if (!currentUser) return;
    var title = uniqueScriptTitle(premade.title || "Premade Script");
    var voiceID = resolvePremadeVoiceSelection(premade);
    var backgroundID = resolvePremadeBackgroundSelection(premade);
    var docRef = scriptCollection(currentUser.uid).doc();
    scriptCollection(currentUser.uid)
      .doc(docRef.id)
      .set({
        title: title,
        text: premade.scriptText || "",
        createdAt: firebase.firestore.Timestamp.now(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        audioURL: premade.audioURL || "",
        backgroundID: backgroundID,
        voiceID: voiceID,
        audioCreatedAt: premade.audioURL ? firebase.firestore.FieldValue.serverTimestamp() : null,
        categoryID: premade.categoryID || "",
      })
      .then(function () {
        setPremadeMessage('Saved "' + title + '" to My Library.', "success");
      })
      .catch(function (e) {
        setPremadeMessage(e.message || "Could not save premade script.", "error");
      });
  }

  function addPremadeToPlaylist(premade) {
    if (!currentPlaylists.length) {
      setPremadeMessage("Create a playlist first.", "error");
      return;
    }
    var s = premadeToScript(premade);
    var voiceID = resolvePremadeVoiceSelection(premade);
    var backgroundID = resolvePremadeBackgroundSelection(premade);
    var tempTitle = uniqueScriptTitle(premade.title || "Premade Script");
    var docRef = scriptCollection(currentUser.uid).doc();
    scriptCollection(currentUser.uid)
      .doc(docRef.id)
      .set({
        title: tempTitle,
        text: s.text,
        createdAt: firebase.firestore.Timestamp.now(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        audioURL: s.audioURL || "",
        backgroundID: backgroundID,
        voiceID: voiceID,
        audioCreatedAt: s.audioURL ? firebase.firestore.FieldValue.serverTimestamp() : null,
        categoryID: premade.categoryID || "",
      })
      .then(function () {
        var savedScript = {
          id: docRef.id,
          title: tempTitle,
          text: s.text,
          audioURL: s.audioURL || "",
          voiceID: voiceID,
          backgroundID: backgroundID,
        };
        openPlaylistPicker(savedScript, function (playlist) {
          setPremadeMessage(
            'Saved "' + tempTitle + '" and added to "' + playlist.name + '".',
            "success"
          );
        });
      })
      .catch(function (e) {
        setPremadeMessage(e.message || "Could not save premade script.", "error");
      });
  }

  function renderPremade() {
    var list = document.getElementById("premade-list");
    if (!list) return;
    if (!currentPremade.length) {
      list.innerHTML =
        '<div class="app-empty-hint">No premade items found in Firestore yet. iOS can also read bundled premade audio, but web only reads published docs from <code>premadeAudio</code>. Once premade is published there, it appears here automatically.</div>';
      return;
    }
    list.innerHTML = currentPremade
      .map(function (p) {
        var isExpanded = expandedPremadeTextById[p.id] === true;
        var hasAudio = !!(p.audioURL && String(p.audioURL).trim());
        var playingThis = activeAudioScriptId === p.id && activeAudio && !activeAudio.paused;
        var premadeVoiceID = premadeVoiceOverrideById[p.id] || selectedVoiceId;
        var premadeBackgroundID = premadeBackgroundOverrideById[p.id] || selectedBackgroundId;
        return (
          '<article class="app-card" data-premade-id="' +
          escapeHtml(p.id) +
          '">' +
          "<h3>" +
          escapeHtml(p.title || "Untitled Premade") +
          "</h3>" +
          '<div class="app-card-meta-row">' +
          '<div class="app-card-meta">' +
          escapeHtml(p.description || "No description") +
          "</div>" +
          '<span class="app-chip">' +
          escapeHtml(p.categoryID || "general") +
          "</span>" +
          "</div>" +
          (isExpanded
            ? '<p class="app-card-text">' +
              escapeHtml((p.scriptText || "").trim() || "(No script text)") +
              "</p>"
            : '<p class="app-card-collapsed-note"><span aria-hidden="true">▸</span> Script preview hidden</p>') +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.45rem;margin-top:0.55rem;">' +
          '  <button type="button" class="app-btn app-btn-secondary" data-premade-media-open="' +
          escapeHtml(p.id) +
          '" data-premade-media-field="voice" style="text-align:left;">Voice: ' +
          escapeHtml(voiceNameById(premadeVoiceID)) +
          "</button>" +
          '  <button type="button" class="app-btn app-btn-secondary" data-premade-media-open="' +
          escapeHtml(p.id) +
          '" data-premade-media-field="background" style="text-align:left;">Background: ' +
          escapeHtml(backgroundNameById(premadeBackgroundID)) +
          "</button>" +
          "</div>" +
          '<div class="app-card-actions">' +
          '  <button type="button" class="app-btn app-btn-secondary" data-premade-action="toggle-text" data-premade-id="' +
          escapeHtml(p.id) +
          '">' +
          (isExpanded ? "Hide Text" : "Show Text") +
          "</button>" +
          '  <button type="button" class="app-btn app-btn-primary" data-premade-action="save" data-premade-id="' +
          escapeHtml(p.id) +
          '">Save to My Library</button>' +
          '  <button type="button" class="app-btn app-btn-secondary" data-premade-action="play" data-premade-id="' +
          escapeHtml(p.id) +
          '"' +
          (!hasAudio ? " disabled" : "") +
          ">" +
          (playingThis ? "Pause" : "Play") +
          "</button>" +
          '  <button type="button" class="app-btn app-btn-ghost" data-premade-action="add-playlist" data-premade-id="' +
          escapeHtml(p.id) +
          '">Save + Add to Playlist</button>' +
          '  <button type="button" class="app-btn app-btn-secondary" data-premade-action="edit" data-premade-id="' +
          escapeHtml(p.id) +
          '">Edit</button>' +
          "</div>" +
          "</article>"
        );
      })
      .join("");

    list.querySelectorAll("[data-premade-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var action = btn.getAttribute("data-premade-action");
        var pid = btn.getAttribute("data-premade-id");
        var premade = currentPremade.find(function (x) {
          return x.id === pid;
        });
        if (!premade) return;
        if (action === "toggle-text") {
          expandedPremadeTextById[premade.id] = expandedPremadeTextById[premade.id] !== true;
          renderPremade();
        } else if (action === "save") {
          savePremadeToMyLibrary(premade);
        } else if (action === "add-playlist") {
          addPremadeToPlaylist(premade);
        } else if (action === "edit") {
          openEditPremadeModal(premade);
        } else if (action === "play") {
          togglePlayScriptAudio(premadeToScript(premade));
        }
      });
    });
    list.querySelectorAll("[data-premade-media-open]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var pid = btn.getAttribute("data-premade-media-open");
        var field = btn.getAttribute("data-premade-media-field");
        if (!pid || !field) return;
        openMediaPicker({
          kind: "premade",
          id: pid,
          field: field,
        });
      });
    });
  }

  function subscribePremade() {
    teardownPremadeListener();
    premadeUnsubscribe = premadeCollection().onSnapshot(
      function (snap) {
        currentPremade = snap.docs
          .map(function (doc) {
            var data = doc.data() || {};
            return {
              id: doc.id,
              title: data.title || "",
              categoryID: data.categoryID || "",
              description: data.description || "",
              scriptText: data.scriptText || "",
              audioURL: data.audioURL || "",
              sourceScriptID: data.sourceScriptID || "",
              createdByUID: data.createdByUID || "",
              createdByEmail: data.createdByEmail || "",
              createdByName: data.createdByName || "",
              createdAt: data.createdAt || null,
            };
          })
          .sort(function (a, b) {
            var at = a.createdAt && typeof a.createdAt.toMillis === "function" ? a.createdAt.toMillis() : 0;
            var bt = b.createdAt && typeof b.createdAt.toMillis === "function" ? b.createdAt.toMillis() : 0;
            return bt - at;
          });
        var nextExpanded = {};
        currentPremade.forEach(function (p) {
          if (expandedPremadeTextById[p.id] === true) nextExpanded[p.id] = true;
        });
        expandedPremadeTextById = nextExpanded;
        updateTabCounts();
        renderPremade();
        if (activeAdminTab === "home") renderHomeFlow((currentUser && currentUser.displayName) || "");
      },
      function (e) {
        setPremadeMessage(e.message || "Could not load premade library.", "error");
        currentPremade = [];
        renderPremade();
      }
    );
  }

  function subscribeClonedVoices(uid) {
    teardownClonedVoicesListener();
    clonedVoicesUnsubscribe = clonedVoicesCollection(uid).onSnapshot(
      function (snap) {
        currentClonedVoices = snap.docs.map(function (doc) {
          var data = doc.data() || {};
          return {
            id: doc.id,
            name: data.name || data.voiceName || "Cloned Voice",
            description: data.description || "Cloned voice",
            elevenLabsVoiceID: data.elevenLabsVoiceID || "",
          };
        });
        if (activeAdminTab === "voices") renderVoices();
      },
      function (_e) {
        currentClonedVoices = [];
        if (activeAdminTab === "voices") renderVoices();
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
              categoryID: data.categoryID || "",
              createdAt: data.createdAt || null,
              updatedAt: data.updatedAt || null,
            };
          });
          currentScripts = scripts;
          updateTabCounts();
          renderScripts(scripts);
          renderSelectedPlaylistDetail();
          if (activeAdminTab === "home") renderHomeFlow((currentUser && currentUser.displayName) || "");
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
        try {
          var savedTab = localStorage.getItem(ADMIN_TAB_STORAGE_KEY);
          if (savedTab) activeAdminTab = savedTab;
        } catch (_e) {}
        currentUserProfile = snap.exists ? snap.data() || {} : {};
        hasVoiceCloneConsent = !!(currentUserProfile && currentUserProfile.voiceCloneConsentAcceptedAt);
        var profileVoiceID = (currentUserProfile.defaultVoiceID || "").trim();
        if (
          profileVoiceID &&
          availableVoices.some(function (v) {
            return v.id === profileVoiceID;
          })
        ) {
          selectedVoiceId = profileVoiceID;
        }
        var profileBackgroundID = (currentUserProfile.defaultBackgroundID || "").trim();
        if (
          profileBackgroundID &&
          availableBackgrounds.some(function (b) {
            return b.id === profileBackgroundID;
          })
        ) {
          selectedBackgroundId = profileBackgroundID;
        }
        var isAdmin = snap.exists && snap.data().isAdmin === true;
        if (isAdmin) {
          renderAdminShell(user.email, user.displayName);
          subscribeScripts(user.uid);
          subscribePlaylists(user.uid);
          subscribePremade();
          subscribeClonedVoices(user.uid);
        } else {
          renderNonAdmin(user.email, user.displayName);
        }
      })
      .catch(function () {
        renderNonAdmin(user.email, user.displayName);
      });
  });
})();
