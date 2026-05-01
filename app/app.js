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
  var playlistDetailVisible = false;
  var activePlaylistLoopForQueue = false;
  var playlistTimerIntervalId = null;
  var playlistTimerDeadlineMs = 0;
  var playlistTimerPlaylistId = null;
  var activeAdminTab = "home";
  var activeLibraryTab = "my-library";
  var ADMIN_TAB_STORAGE_KEY = "focusshiftWebAdminTab";
  var PREF_RESUME_ADMIN_KEY = "focusshiftWebPrefResumeAdmin";
  var PREF_LIBRARY_SUB_KEY = "focusshiftWebPrefLibrarySub";
  var PREF_AUTO_PLAY_KEY = "focusshiftWebPrefAutoPlay";
  var PREF_LISTEN_SHORTCUT_KEY = "focusshiftWebPrefListenTodayShortcut";
  var accountEscapeBound = false;
  var playlistPickerScript = null;
  var playlistPickerSuccessHandler = null;
  var publishCategoryId = "confidence";
  var publishTextDirty = false;
  var publishTitleDirty = false;
  var editingPremadeId = null;
  var expandedScriptTextById = {};
  var expandedScriptAudioControlsById = {};
  var scriptsRenderGeneration = 0;
  var CARD_AUDIO_EXPAND_STORAGE_PREFIX = "focusshiftWebCardAudioControls_";
  var GENERATED_HASH_STORAGE_PREFIX = "generatedHash_";
  var expandedPremadeTextById = {};
  var expandedPremadeAudioControlsById = {};
  var expandedPremadeSectionById = {};
  var premadeVoiceOverrideById = {};
  var premadeBackgroundOverrideById = {};
  var premadeRenderGeneration = 0;
  var GENERATED_PREMADE_HASH_PREFIX = "generatedHashPremade_";
  var PREMADE_CARD_AUDIO_EXPAND_STORAGE_PREFIX = "focusshiftWebPremadeCardAudio_";
  var PREMADE_SECTION_EXPAND_STORAGE_PREFIX = "focusshiftWebPremadeSectionExpanded_";
  /** Same seven categories as iOS bundled / cloud premade library (PremadeAudioManager). */
  var PREMADE_LIBRARY_CATEGORY_ORDER = [
    { id: "confidence", name: "Confidence & Self-Worth" },
    { id: "relationships", name: "Relationships & Love" },
    { id: "success-prosperity", name: "Success & Prosperity" },
    { id: "mental-wellbeing", name: "Mental Well-Being" },
    { id: "health-fitness", name: "Health & Fitness" },
    { id: "sports-performance", name: "Sports Performance" },
    { id: "sleep-rest", name: "Sleep & Rest" },
  ];
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
  /** `file` must match the filename in `website/audio/backgrounds/` (same catalog as iOS `BackGroundAudio`). */
  var availableBackgrounds = [
    { id: "bg-none", name: "No Background", categoryID: "general", file: "" },
    // General (original calm/focus tracks)
    { id: "bg-rain", name: "Rain", categoryID: "general", file: "background-music-soft-calm-333111.mp3" },
    { id: "bg-calm-night", name: "Calm Night", categoryID: "general", file: "calm-night-312296.mp3" },
    { id: "bg-calm-soft", name: "Calm Soft", categoryID: "general", file: "calm-soft-background-music-398280.mp3" },
    { id: "bg-just-relax", name: "Just Relax", categoryID: "general", file: "just-relax-11157.mp3" },
    { id: "bg-meditation", name: "Meditation Background", categoryID: "general", file: "meditation-relaxing-music-background-320405.mp3" },
    {
      id: "bg-oasis",
      name: "Oasis (Chill)",
      categoryID: "general",
      file: "oasis-background-relax-hip-hop-vlog-music-for-video-stories-short-379505.mp3",
    },
    { id: "bg-penguin", name: "Modern Chillout", categoryID: "general", file: "penguinmusic-modern-chillout-future-calm-12641.mp3" },
    { id: "bg-piano", name: "Piano Background", categoryID: "general", file: "piano-background-music-337774.mp3" },
    { id: "bg-please-calm", name: "Please Calm My Mind", categoryID: "general", file: "please-calm-my-mind-125566.mp3" },
    { id: "bg-soft-calm-piano", name: "Soft Calm Piano", categoryID: "general", file: "soft-calm-piano-music-405074.mp3" },
    // Confidence & Self-Worth
    { id: "bg-assertive-whisper", name: "Assertive Whisper", categoryID: "confidence", file: "Assertive Whisper.mp3" },
    { id: "bg-calm-groove", name: "Calm Groove", categoryID: "confidence", file: "Calm Groove.mp3" },
    { id: "bg-kindness-melody", name: "Kindness Melody", categoryID: "confidence", file: "Kindness Melody.mp3" },
    { id: "bg-purpose-pulse", name: "Purpose Pulse", categoryID: "confidence", file: "Purpose Pulse.mp3" },
    { id: "bg-resilience-ascend", name: "Resilience Ascend", categoryID: "confidence", file: "Resilience Ascend.mp3" },
    // Health & Fitness
    { id: "bg-groove-bloom", name: "Groove Bloom", categoryID: "health-fitness", file: "Groove Bloom.mp3" },
    { id: "bg-joyful-fusion", name: "Joyful Fusion", categoryID: "health-fitness", file: "Joyful Fusion.mp3" },
    { id: "bg-mindful-drift", name: "Mindful Drift", categoryID: "health-fitness", file: "Mindful Drift.mp3" },
    { id: "bg-recovery-glow", name: "Recovery Glow", categoryID: "health-fitness", file: "Recovery Glow .mp3" },
    { id: "bg-vitality-wave-rise", name: "Vitality Wave Rise", categoryID: "health-fitness", file: "Vitality Wave Rise.mp3" },
    // Mental Well-Being
    { id: "bg-clarity-sting-echo", name: "Clarity Sting Echo", categoryID: "mental-wellbeing", file: "Clarity Sting Echo.mp3" },
    { id: "bg-compassion-rise", name: "Compassion Rise", categoryID: "mental-wellbeing", file: "Compassion Rise.mp3" },
    { id: "bg-inner-calm", name: "Inner Calm", categoryID: "mental-wellbeing", file: "Inner Calm.mp3" },
    { id: "bg-nature-presence-glow", name: "Nature Presence Glow", categoryID: "mental-wellbeing", file: "Nature Presence Glow.mp3" },
    { id: "bg-serene-mind-whisper", name: "Serene Mind Whisper", categoryID: "mental-wellbeing", file: "Serene Mind Whisper.mp3" },
    // Relationships & Love
    { id: "bg-breeze-glow", name: "Breeze Glow", categoryID: "relationships", file: "Breeze Glow.mp3" },
    { id: "bg-connection-drift", name: "Connection Drift", categoryID: "relationships", file: "Cennection Drift.mp3" },
    { id: "bg-harmony-rise", name: "Harmony Rise", categoryID: "relationships", file: "Harmony Rise.mp3" },
    { id: "bg-warm-melody", name: "Warm Melody", categoryID: "relationships", file: "Warm Melody.mp3" },
    { id: "bg-whisper-flow", name: "Whisper Flow", categoryID: "relationships", file: "Whisper Flow.mp3" },
    // Sleep & Rest
    { id: "bg-calm-piano-whisper", name: "Calm Piano Whisper", categoryID: "sleep-rest", file: "Calm Piano Whisper.mp3" },
    { id: "bg-deep-serenity-pulse", name: "Deep Serenity Pulse", categoryID: "sleep-rest", file: "Deep Serenity Pulse.mp3" },
    { id: "bg-orchestral-calm-embrace", name: "Orchestral Calm Embrace", categoryID: "sleep-rest", file: "Orchestral Calm Embrace.mp3" },
    { id: "bg-serene-wave-drift", name: "Serene Wave Drift", categoryID: "sleep-rest", file: "Serene Wave Drift.mp3" },
    { id: "bg-theta-peace-drift", name: "Theta Peace Drift", categoryID: "sleep-rest", file: "Theta Peace Drift.mp3" },
    // Sports Performance
    { id: "bg-ambient-mastery-pulse", name: "Ambient Mastery Pulse", categoryID: "sports-performance", file: "Ambient Mastery Pulse.mp3" },
    { id: "bg-orchestral-resilience-rush", name: "Orchestral Resilience Rush", categoryID: "sports-performance", file: "orchestral Resilience Rush.mp3" },
    { id: "bg-relentless-edge-surge", name: "Relentless Edge Surge", categoryID: "sports-performance", file: "Relentless Edge Surge.mp3" },
    { id: "bg-riff-resilience-rush", name: "Riff Resilience Rush", categoryID: "sports-performance", file: "Riff Resilience Rush.mp3" },
    { id: "bg-synth-flow-fury", name: "Synth Flow Fury", categoryID: "sports-performance", file: "Synth Flow Fury.mp3" },
    // Success & Prosperity
    { id: "bg-breakthrough-surge", name: "Breakthrough Surge", categoryID: "success-prosperity", file: "Breakthrough Surge.mp3" },
    { id: "bg-freedom-whisper", name: "Freedom Whisper", categoryID: "success-prosperity", file: "Freedom Whisper.mp3" },
    { id: "bg-growth-glow", name: "Growth Glow", categoryID: "success-prosperity", file: "Growth Glow.mp3" },
    { id: "bg-momentum-desire", name: "Momentum Desire", categoryID: "success-prosperity", file: "Momentum Desire.mp3" },
    { id: "bg-symphony-ascend", name: "Symphony Ascend", categoryID: "success-prosperity", file: "Symphony Ascend.mp3" },
  ];
  var backgroundCategoryOrder = [
    "general",
    "confidence",
    "relationships",
    "success-prosperity",
    "mental-wellbeing",
    "health-fitness",
    "sports-performance",
    "sleep-rest",
  ];
  var backgroundCategoryOpenById = { general: true };
  function backgroundCategoryDisplayName(id) {
    switch (id) {
      case "general":
        return "General";
      case "confidence":
        return "Confidence & Self-Worth";
      case "relationships":
        return "Relationships & Love";
      case "success-prosperity":
        return "Success & Prosperity";
      case "mental-wellbeing":
        return "Mental Well-Being";
      case "health-fitness":
        return "Health & Fitness";
      case "sports-performance":
        return "Sports Performance";
      case "sleep-rest":
        return "Sleep & Rest";
      default:
        return id || "Other";
    }
  }
  var activeCategoryId = "confidence";
  var homeFlowStep = "landing";
  /** Set while asking Stripe-style follow-ups before final script (see iOS SurveyViewModel). */
  var homeClarifyFlow = null;
  /** Long tips for I am… questions (matches iOS `IAMSurveyHelp`). */
  var IAM_SURVEY_HELP_Q1 =
    "Add everything you want in your script—who you're becoming.\n\n" +
    "• Easiest: one idea per line\n" +
    "• If an idea is longer and has commas inside it, end that idea with a period so it stays one thought (commas won't be mistaken for a new idea)\n" +
    "• Short lists can stay simple: a few words or phrases per line are fine (e.g. honor, courage, patient with myself)\n" +
    "• You don't need to type \"I am\" before every line\n\n" +
    "Your script will weave these into smooth, spoken lines and include each idea.";
  var IAM_SURVEY_HELP_Q2 =
    "This is what makes the script feel alive when you listen.\n\n" +
    "Imagine your goals and what you deeply want are already done—you've arrived. What rises in you? Pride, relief, warmth, strength, quiet joy, something in your chest or gut?\n\n" +
    "Name a few feelings or sensations. You don't need perfect words—honest fragments are enough. The script will lean on this so the listening experience matches that inner win.";
  /** Mirrors iOS `SurveyCategories.swift` + default placeholder from `SurveyQuestionCard`. */
  var surveyCategories = [
    {
      id: "confidence",
      name: "Confidence & Self-Worth",
      questions: [
        "What's one area where you'd like to feel more confident or worthy right now? (e.g., speaking up, accepting yourself, handling criticism)",
        "How do you want to feel about yourself on a great day?",
      ],
    },
    {
      id: "relationships",
      name: "Relationships & Love",
      questions: [
        "What aspect of your relationships would you most like to improve or attract? (e.g., deeper connections, self-love, healthier boundaries, or more passion)",
        "What does an ideal relationship feel like to you? Describe a moment or quality in a relationship that feels ideal to you",
      ],
    },
    {
      id: "success-prosperity",
      name: "Success & Prosperity",
      questions: [
        "What's your main goal right now in career, money, or abundance? (e.g., promotion, financial freedom, feeling deserving)",
        "What would success or prosperity look and feel like for you day-to-day?",
      ],
    },
    {
      id: "mental-wellbeing",
      name: "Mental Well-Being",
      questions: [
        "What's the biggest mental or emotional challenge you're facing lately? (e.g., anxiety, overwhelm, overthinking, low mood)",
        "How do you want to feel most of the time?",
      ],
    },
    {
      id: "health-fitness",
      name: "Health & Fitness",
      questions: [
        "What's your primary health or fitness focus right now? (e.g., habits, energy, body confidence, finding joy in movement)",
        "When your body and energy are at their best, what does that feel like?",
      ],
    },
    {
      id: "sports-performance",
      name: "Sports Performance",
      questions: [
        "What aspect of your mental game do you want to strengthen for peak performance? (e.g., building relentless focus and toughness under pressure, staying present one play at a time, or developing daily routines for consistency and resilience)",
        "When you're at your best in your sport, what do you feel, tell yourself or visualize? Describe the mindset, emotions, or self-talk that helps you perform at your peak.",
      ],
    },
    {
      id: "sleep-rest",
      name: "Sleep & Rest",
      questions: [
        "What gets in the way of good sleep or rest for you right now? (e.g., racing thoughts, irregular schedule, trouble winding down)",
        "How do you want to feel when falling asleep, waking up fully rested, or both? Describe the ideal sleep experience or morning feeling for you.",
      ],
    },
    {
      id: "i-am",
      name: "I am…",
      questions: [
        "What do you most want to believe or embody about yourself right now? (e.g., I am confident, I am worthy of love, I am strong and resilient, I am successful)",
        "How would your life feel different if you fully believed and lived this 'I Am' statement every day? Describe the emotions, actions, or changes you would experience.",
      ],
    },
    {
      id: "other",
      name: "Custom Topic",
      questions: [
        "Describe the specific area or theme you'd like affirmations for (e.g. creativity, parenting, spirituality, recovery).",
        "What's one key challenge or desired feeling in this area?",
      ],
    },
  ];

  function surveyAnswerPlaceholder() {
    return "Share as much as you like—the more specific, the better your script.";
  }

  function surveyIamHelpDetailsHtml(catId, questionIndex) {
    if (catId !== "i-am") return "";
    var body = questionIndex === 0 ? IAM_SURVEY_HELP_Q1 : IAM_SURVEY_HELP_Q2;
    return (
      '<details class="gen-iam-help">' +
      '<summary>Tips for this question</summary>' +
      '<div class="gen-iam-help-body">' +
      escapeHtml(body) +
      "</div></details>"
    );
  }

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
  /** HTTPS callables (e.g. deleteOwnAccount); null if functions compat script missing */
  var cloudFunctions =
    typeof firebase.functions === "function" ? firebase.functions() : null;

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
      '<header class="app-admin-header">' +
      '  <div class="app-admin-header-main">' +
      '    <h1 class="app-admin-title">Focus Shift</h1>' +
      '    <p class="app-muted app-admin-tagline">Signed in as <strong>' +
      escapeHtml(email || "") +
      "</strong> · " +
      escapeHtml(displayName || "no display name") +
      "</p>" +
      "  </div>" +
      '  <div class="app-admin-header-actions">' +
      '    <div id="app-playlist-timer-wrap" class="app-playlist-timer-wrap" hidden title="Playlist sleep timer">' +
      '      <span class="app-playlist-timer-icon" aria-hidden="true">⏱</span>' +
      '      <span id="app-playlist-timer-label" class="app-playlist-timer-label"></span>' +
      '      <button type="button" class="app-playlist-timer-clear" id="btn-app-playlist-timer-clear" aria-label="Clear playlist timer">×</button>' +
      "    </div>" +
      '    <button type="button" class="app-header-account-btn" id="btn-account-menu" aria-label="Account menu" aria-haspopup="dialog" aria-expanded="false">' +
      '      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
      '        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>' +
      '        <circle cx="12" cy="7" r="4"/>' +
      "      </svg>" +
      "    </button>" +
      "  </div>" +
      "</header>" +
      '<p class="app-muted app-admin-intro">Home, Library, Playlists, Voices, and Backgrounds — use the account button (top right) for settings and sign out.</p>' +
      '<nav class="app-tabs" aria-label="Admin sections">' +
      '  <button type="button" class="app-tab-btn" data-admin-tab="home">Home</button>' +
      '  <button type="button" class="app-tab-btn" data-admin-tab="library">Library <span class="app-tab-count" id="count-library">0</span></button>' +
      '  <button type="button" class="app-tab-btn" data-admin-tab="playlists">Playlists <span class="app-tab-count" id="count-playlists">0</span></button>' +
      '  <button type="button" class="app-tab-btn" data-admin-tab="voices">Voices</button>' +
      '  <button type="button" class="app-tab-btn" data-admin-tab="backgrounds">Backgrounds</button>' +
      "</nav>" +
      '<section id="section-home" class="app-section" aria-label="Home">' +
      '<section class="app-card" aria-label="Focus Shift home">' +
      '  <h2 style="font-size:1.1rem;margin:0 0 0.6rem;">Home</h2>' +
      '  <div id="home-flow"></div>' +
      '  <div id="generation-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      "</section>" +
      "</section>" +
      '<section id="section-library" class="app-section">' +
      '  <div class="library-toolbar-row">' +
      '    <div class="app-tabs voice-segmented-tabs" id="library-segmented-tabs" style="margin-top:0.1rem;">' +
      '      <button type="button" class="app-tab-btn" id="library-tab-my" data-library-tab="my-library">My Library</button>' +
      '      <button type="button" class="app-tab-btn" id="library-tab-app" data-library-tab="app-library">App Library <span class="app-tab-count" id="count-premade">0</span></button>' +
      "    </div>" +
      '    <div class="library-toolbar-actions" id="library-my-only-toolbar">' +
      '      <div class="library-dual-btn" role="group" aria-label="Create or import script">' +
      '        <button type="button" class="library-dual-btn-main" id="btn-create-script" title="New script">+ New</button>' +
      '        <button type="button" class="library-dual-btn-menu" id="btn-library-create-menu" aria-expanded="false" aria-haspopup="true" title="More options">▾</button>' +
      "      </div>" +
      '      <div id="library-create-dropdown" class="library-create-dropdown" hidden>' +
      '        <button type="button" class="library-dropdown-item" id="library-dropdown-create">Create Script</button>' +
      '        <button type="button" class="library-dropdown-item" id="library-dropdown-import">Import Audio</button>' +
      "      </div>" +
      '      <button type="button" class="library-chevron-btn" id="library-expand-all-toggle" aria-label="Expand or collapse audio controls on all cards">▼</button>' +
      "    </div>" +
      "  </div>" +
      '  <input id="script-import-audio-input" type="file" accept="audio/*" style="display:none" />' +
      '  <div id="library-sub-my">' +
      '<div id="scripts-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      '<div id="premade-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      '<div id="script-editor"></div>' +
      '<section aria-label="My Library scripts">' +
      '  <div class="app-section-title-row"><h2>My Library Scripts</h2></div>' +
      '  <div id="scripts-list"><p class="app-muted">Loading scripts...</p></div>' +
      "</section>" +
      "  </div>" +
      '  <div id="library-sub-app" hidden>' +
      '<section aria-label="App Library (Premade)" style="margin-top:1rem;">' +
      '  <div class="app-section-title-row premade-app-toolbar">' +
      "    <h2>App Library</h2>" +
      '    <div class="premade-app-toolbar-actions">' +
      '      <button type="button" class="library-chevron-btn" id="premade-expand-all-audio" aria-label="Expand or collapse audio controls on all premade cards">▼</button>' +
      '      <button type="button" class="app-btn" id="btn-open-publish-premade">Publish from My Library</button>' +
      "    </div>" +
      "  </div>" +
      '  <div id="premade-list"><p class="app-muted">Loading premade scripts...</p></div>' +
      "</section>" +
      "  </div>" +
      "</section>" +
      '<section id="section-playlists" class="app-section">' +
      '  <div id="playlists-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      '  <section aria-label="Playlists" style="margin-top:0.5rem;">' +
      '  <div id="playlists-list-view">' +
      '    <div class="app-section-title-row"><h2>Playlists</h2></div>' +
      '    <div class="app-toolbar" style="margin-top:0;">' +
      '      <button type="button" class="app-btn" id="btn-create-playlist">+ New Playlist</button>' +
      "    </div>" +
      '    <div id="playlists-list"><p class="app-muted">Loading playlists...</p></div>' +
      "  </div>" +
      '  <div id="playlists-detail-view" hidden>' +
      '    <div class="playlist-detail-nav">' +
      '      <button type="button" class="app-btn app-btn-ghost" id="btn-playlist-back">← Playlists</button>' +
      '      <h2 id="playlist-detail-heading" class="playlist-detail-heading">Playlist</h2>' +
      "    </div>" +
      '    <div id="playlist-detail" class="playlist-detail-body"></div>' +
      "  </div>" +
      "  </section>" +
      "</section>" +
      '<section id="section-voices" class="app-section">' +
      '<section class="app-card" aria-label="Voice settings">' +
      '  <h2 style="font-size:1.1rem;margin:0 0 0.6rem;">Voices</h2>' +
      '  <p class="app-muted" style="margin-top:0;">Choose from App Voices or manage My Voices (saved + cloned), then set defaults.</p>' +
      '  <div class="app-tabs voice-segmented-tabs" style="margin-top:0.5rem;">' +
      '    <button type="button" class="app-tab-btn" id="voices-tab-my" data-voices-tab="my-voices">My Voices</button>' +
      '    <button type="button" class="app-tab-btn" id="voices-tab-app" data-voices-tab="app-voices">App Voices</button>' +
      "  </div>" +
      '  <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.5rem;">' +
      '    <button type="button" class="app-btn app-btn-secondary" id="btn-voice-clone">Upload Voice Audio</button>' +
      '    <button type="button" class="app-btn app-btn-secondary" id="btn-voice-record">Clone Voice</button>' +
      "  </div>" +
      '  <p class="app-muted" style="margin-top:-0.2rem;margin-bottom:0.35rem;">Use <strong>Upload Voice Audio</strong> for an existing file, or <strong>Clone Voice</strong> to record a guided sample in-browser.</p>' +
      '  <div id="voice-recording-status" class="app-inline-msg" style="margin-top:0;margin-bottom:0.6rem;"></div>' +
      '  <div id="voice-recording-guide" class="app-empty-hint voice-recording-guide" style="display:none;margin-top:0;margin-bottom:0.7rem;">' +
      '    <div class="voice-recording-guide-head">' +
      '      <strong>Read this script while recording</strong>' +
      '      <div class="voice-recording-guide-controls">' +
      '        <span id="voice-recording-guide-time" class="voice-recording-guide-time">0:00</span>' +
      '        <button type="button" class="app-btn app-btn-secondary" id="voice-recording-toggle">Start Recording</button>' +
      '        <button type="button" class="app-btn app-btn-ghost" id="voice-recording-cancel">Cancel</button>' +
      "      </div>" +
      "    </div>" +
      '    <div class="voice-recording-guide-sub">Speak clearly in a quiet place. Aim for 30s minimum, 1-2 minutes best.</div>' +
      '    <div class="app-empty-hint" style="border-style:solid;padding:0.65rem;margin:0 0 0.55rem;">' +
      '      <div style="display:flex;flex-direction:column;gap:0.2rem;">' +
      '        <div class="app-muted"><strong>Recording tips</strong></div>' +
      '        <div class="app-muted">- Record 1-2 minutes of clear speech</div>' +
      '        <div class="app-muted">- Speak naturally at a consistent volume</div>' +
      '        <div class="app-muted">- Minimize background noise</div>' +
      '        <div class="app-muted">- Supported formats: MP3, WAV, M4A (upload)</div>' +
      "      </div>" +
      "    </div>" +
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
      '<div id="account-modal-backdrop" class="app-modal-backdrop" hidden>' +
      '  <div class="app-modal app-modal-account" role="dialog" aria-modal="true" aria-labelledby="account-modal-title">' +
      '    <div class="account-modal-head">' +
      '      <h3 id="account-modal-title">Account & Settings</h3>' +
      '      <button type="button" class="app-btn app-btn-ghost account-modal-close-x" id="account-modal-close" aria-label="Close">×</button>' +
      "    </div>" +
      '    <nav class="app-tabs account-modal-tabs" aria-label="Account sections">' +
      '      <button type="button" class="app-tab-btn is-active" data-account-tab="settings">Account</button>' +
      '      <button type="button" class="app-tab-btn" data-account-tab="preferences">Preferences</button>' +
      '      <button type="button" class="app-tab-btn" data-account-tab="privacy">Privacy & Support</button>' +
      "    </nav>" +
      '    <div id="account-tab-settings" class="account-tab-panel">' +
      '      <p class="app-muted" style="margin:0 0 0.65rem;">Signed in as <strong>' +
      escapeHtml(email || "") +
      "</strong></p>" +
      '      <p class="app-muted" style="margin:0 0 0.85rem;">Last login: <strong id="account-last-login">' +
      escapeHtml(formatDateString(currentUser && currentUser.metadata && currentUser.metadata.lastSignInTime)) +
      "</strong></p>" +
      '      <section class="account-pref-sync-summary" style="margin-bottom:0.7rem;">' +
      '        <strong style="display:block;margin-bottom:0.3rem;">Subscription</strong>' +
      '        <p class="app-muted" style="margin:0 0 0.5rem;">Plan and billing currently come from your account profile. During beta, plan upgrades are managed in the iOS app.</p>' +
      '        <button type="button" class="app-btn app-btn-secondary" id="account-subscription-manage">Manage subscription (iOS)</button>' +
      "      </section>" +
      '      <section class="account-pref-sync-summary" style="margin-bottom:0.7rem;">' +
      '        <strong style="display:block;margin-bottom:0.3rem;">Devices & Sharing</strong>' +
      '        <p class="app-muted" style="margin:0 0 0.5rem;">Device and sharing controls are available in iOS today. This web section mirrors your account counts.</p>' +
      '        <button type="button" class="app-btn app-btn-secondary" id="account-manage-devices">Manage devices (iOS)</button>' +
      "      </section>" +
      '      <section class="account-pref-sync-summary" style="margin-bottom:0.7rem;">' +
      '        <strong style="display:block;margin-bottom:0.3rem;">Library & Storage</strong>' +
      '        <p class="app-muted" style="margin:0 0 0.5rem;">Library counts below are account-linked. Refresh to re-read profile and script stats.</p>' +
      '        <div style="display:flex;gap:0.45rem;flex-wrap:wrap;">' +
      '          <button type="button" class="app-btn app-btn-secondary" id="account-refresh-library-stats">Refresh library stats</button>' +
      '          <button type="button" class="app-btn app-btn-secondary" id="account-sync-cloud">Sync status</button>' +
      "        </div>" +
      "      </section>" +
      '      <div id="account-insights" class="account-insights-grid"></div>' +
      '      <form id="account-form" class="app-form" style="margin-top:0.65rem;">' +
      '        <label for="account-display-name">Display name</label>' +
      '        <input id="account-display-name" type="text" maxlength="80" value="' +
      escapeHtml(displayName || "") +
      '">' +
      '        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">' +
      '          <button type="submit" class="app-btn">Save display name</button>' +
      '          <button type="button" class="app-btn" id="account-password-reset">Send password reset email</button>' +
      '          <button type="button" class="app-btn" id="account-refresh-token">Refresh session</button>' +
      '          <button type="button" class="app-btn app-btn-danger" id="account-signout">Sign out</button>' +
      "        </div>" +
      "      </form>" +
      '      <div id="account-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      "    </div>" +
      '    <div id="account-tab-preferences" class="account-tab-panel" hidden>' +
      '      <p class="app-muted" style="margin:0 0 0.75rem;">These options apply in this browser only.</p>' +
      '      <section class="account-pref-sync-summary" style="margin-bottom:0.7rem;">' +
      '        <strong style="display:block;margin-bottom:0.3rem;">App Preferences</strong>' +
      '        <div style="display:flex;gap:0.45rem;flex-wrap:wrap;margin-bottom:0.5rem;">' +
      '          <button type="button" class="app-btn app-btn-secondary" id="account-pref-open-voices">Default Voice</button>' +
      '          <button type="button" class="app-btn app-btn-secondary" id="account-pref-open-backgrounds">Default Background</button>' +
      "        </div>" +
      '        <label class="account-pref-row"><input type="checkbox" id="pref-auto-play-next" /> Auto-Play Next</label>' +
      '        <label class="account-pref-row" for="pref-listen-shortcut">Listen today shortcut</label>' +
      '        <select id="pref-listen-shortcut" class="app-btn" style="width:100%;text-align:left;margin-top:0.15rem;">' +
      '          <option value="playlists">Playlists tab</option>' +
      '          <option value="library">Library tab</option>' +
      "        </select>" +
      "      </section>" +
      '      <label class="account-pref-row"><input type="checkbox" id="pref-resume-last-screen" /> Remember my last workspace screen after sign-in</label>' +
      '      <fieldset class="account-pref-fieldset">' +
      '        <legend class="account-pref-legend">When you open Library, show</legend>' +
      '        <label class="account-pref-row"><input type="radio" name="pref-library-sub" id="pref-library-sub-my" value="my-library" /> My Library</label>' +
      '        <label class="account-pref-row"><input type="radio" name="pref-library-sub" id="pref-library-sub-app" value="app-library" /> App Library</label>' +
      "      </fieldset>" +
      "    </div>" +
      '    <div id="account-tab-privacy" class="account-tab-panel" hidden>' +
      '      <div id="account-privacy-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      '      <section class="account-pref-sync-summary" style="margin-bottom:0.7rem;">' +
      '        <strong style="display:block;margin-bottom:0.3rem;">Security</strong>' +
      '        <p class="app-muted" style="margin:0 0 0.5rem;">Web sign-in uses your email/password or Google. Biometric unlock is iOS-only today.</p>' +
      '        <div style="display:flex;gap:0.45rem;flex-wrap:wrap;">' +
      '          <button type="button" class="app-btn app-btn-secondary" id="account-privacy-password-reset">Send password reset email</button>' +
      '          <button type="button" class="app-btn app-btn-secondary" id="account-privacy-refresh-session">Refresh session</button>' +
      "        </div>" +
      "      </section>" +
      '      <section class="account-pref-sync-summary" style="margin-bottom:0.7rem;">' +
      '        <strong style="display:block;margin-bottom:0.3rem;">Privacy & Data</strong>' +
      '        <p class="app-muted" style="margin:0 0 0.5rem;">Your scripts, playlists, and generated audio live in your Firebase account. This browser may also store lightweight UI preferences locally.</p>' +
      '        <div style="display:flex;gap:0.45rem;flex-wrap:wrap;margin-bottom:0.45rem;">' +
      '          <button type="button" class="app-btn app-btn-secondary" id="account-privacy-export-json">Export my data (JSON)</button>' +
      '          <button type="button" class="app-btn app-btn-danger" id="account-privacy-delete-account">Delete account…</button>' +
      "        </div>" +
      '        <p class="app-muted" style="margin:0 0 0.45rem;">You can delete your account from the web (server-side, same cloud cleanup as iOS). Local data on phones or tablets is cleared the next time that app syncs or you remove the app.</p>' +
      '        <p style="margin:0;display:flex;gap:0.5rem;flex-wrap:wrap;">' +
      '          <a class="app-btn app-btn-secondary" href="https://focusshift.app/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>' +
      '          <a class="app-btn app-btn-secondary" href="https://focusshift.app/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>' +
      "        </p>" +
      "      </section>" +
      '      <section class="account-pref-sync-summary" style="margin-bottom:0.2rem;">' +
      '        <strong style="display:block;margin-bottom:0.3rem;">About & Support</strong>' +
      '        <p class="app-muted" style="margin:0 0 0.45rem;">Web workspace build. For app store reviews and device-specific help, use the iOS app.</p>' +
      '        <p class="app-muted" style="margin:0 0 0.45rem;"><strong>Firebase JS:</strong> <span id="account-privacy-firebase-sdk">-</span></p>' +
      '        <div style="display:flex;gap:0.45rem;flex-wrap:wrap;">' +
      '          <a class="app-btn app-btn-secondary" href="mailto:support@focusshift.app">Contact support</a>' +
      "        </div>" +
      "      </section>" +
      "    </div>" +
      "  </div>" +
      "</div>" +
      '<div id="account-delete-backdrop" class="app-modal-backdrop" hidden>' +
      '  <div class="app-modal" role="dialog" aria-modal="true" aria-labelledby="account-delete-title">' +
      '    <h3 id="account-delete-title">Delete account</h3>' +
      '    <p class="app-muted" style="margin:0 0 0.5rem;">This removes your sign-in and deletes your cloud library (scripts, playlists, cloned voices, and hosted audio). Export first if you need a copy. Other devices signed into this account will lose access.</p>' +
      '    <p class="app-muted" style="margin:0 0 0.55rem;">This is not the same as canceling a subscription or switching to Free—use subscription management when web billing is available.</p>' +
      '    <label class="account-pref-row" for="account-delete-phrase">Type <strong>DELETE</strong> to confirm</label>' +
      '    <input id="account-delete-phrase" type="text" autocomplete="off" placeholder="DELETE" style="width:100%;box-sizing:border-box;margin-bottom:0.45rem;padding:0.55rem;border-radius:10px;">' +
      '    <div id="account-delete-error" class="app-inline-msg" style="display:none;margin-bottom:0.35rem;"></div>' +
      '    <div class="app-modal-actions">' +
      '      <button type="button" class="app-btn" id="account-delete-cancel">Cancel</button>' +
      '      <button type="button" class="app-btn app-btn-danger" id="account-delete-confirm" disabled>Delete permanently</button>' +
      "    </div>" +
      "  </div>" +
      "</div>" +
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
      '<div id="playlist-add-audio-backdrop" class="app-modal-backdrop" hidden>' +
      '  <div class="app-modal" role="dialog" aria-modal="true" aria-label="Add audio to playlist">' +
      "    <h3>Add audio from My Library</h3>" +
      '    <p class="app-muted" style="margin:0 0 0.45rem;">Pick scripts that already have generated audio. New tracks are added to the end of the playlist.</p>' +
      '    <div id="playlist-add-audio-list" class="app-modal-list"></div>' +
      '    <div class="app-modal-actions">' +
      '      <button type="button" class="app-btn" id="playlist-add-audio-close">Close</button>' +
      "    </div>" +
      "  </div>" +
      "</div>" +
      '<div id="playlist-timer-backdrop" class="app-modal-backdrop" hidden>' +
      '  <div class="app-modal" role="dialog" aria-modal="true" aria-label="Playlist timer">' +
      "    <h3>Playlist timer</h3>" +
      '    <p class="app-muted" style="margin:0 0 0.45rem;">When time is up, playback stops (same idea as the iOS playlist timer).</p>' +
      '    <label for="playlist-timer-hours">Hours</label>' +
      '    <select id="playlist-timer-hours" style="width:100%;box-sizing:border-box;margin-bottom:0.6rem;padding:0.55rem;border-radius:10px;"></select>' +
      '    <label for="playlist-timer-minutes">Minutes</label>' +
      '    <select id="playlist-timer-minutes" style="width:100%;box-sizing:border-box;margin-bottom:0.6rem;padding:0.55rem;border-radius:10px;"></select>' +
      '    <div id="playlist-timer-modal-msg" class="app-inline-msg" style="margin-top:0.25rem;"></div>' +
      '    <div class="app-modal-actions">' +
      '      <button type="button" class="app-btn" id="playlist-timer-clear">Clear timer</button>' +
      '      <button type="button" class="app-btn" id="playlist-timer-cancel">Cancel</button>' +
      '      <button type="button" class="app-btn app-btn-primary" id="playlist-timer-save">Set timer</button>' +
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
    document.getElementById("btn-library-create-menu").addEventListener("click", function (ev) {
      ev.stopPropagation();
      toggleLibraryCreateMenu();
    });
    document.getElementById("library-dropdown-create").addEventListener("click", function () {
      closeLibraryCreateMenu();
      openEditor(null);
    });
    document.getElementById("library-dropdown-import").addEventListener("click", function () {
      closeLibraryCreateMenu();
      var inp = document.getElementById("script-import-audio-input");
      if (inp) inp.click();
    });
    document.getElementById("script-import-audio-input").addEventListener("change", function (ev) {
      var f = ev.target.files && ev.target.files[0];
      ev.target.value = "";
      if (f) importScriptAudioFromFile(f);
    });
    document.getElementById("library-expand-all-toggle").addEventListener("click", function () {
      if (activeLibraryTab !== "my-library") return;
      toggleExpandAllLibraryAudioControls();
    });
    document.addEventListener("click", function (ev) {
      var wrap = document.getElementById("library-my-only-toolbar");
      if (!wrap || wrap.style.display === "none") return;
      var dd = document.getElementById("library-create-dropdown");
      var trig = document.getElementById("btn-library-create-menu");
      if (!dd || dd.hidden) return;
      var t = ev.target;
      if (trig && (trig === t || trig.contains(t))) return;
      if (dd === t || dd.contains(t)) return;
      closeLibraryCreateMenu();
    });
    document.getElementById("btn-create-playlist").addEventListener("click", function () {
      createPlaylist();
    });
    document.getElementById("btn-playlist-back").addEventListener("click", function () {
      closePlaylistDetailView();
      renderPlaylists(currentPlaylists);
    });
    document.getElementById("playlist-add-audio-close").addEventListener("click", function () {
      closePlaylistAddAudioModal();
    });
    document.getElementById("playlist-timer-cancel").addEventListener("click", function () {
      closePlaylistTimerModal();
    });
    document.getElementById("playlist-timer-clear").addEventListener("click", function () {
      clearPlaylistTimer();
      closePlaylistTimerModal();
      setPlaylistsMessage("Playlist timer cleared.", "success");
      renderSelectedPlaylistDetail();
    });
    document.getElementById("playlist-timer-save").addEventListener("click", function () {
      var hEl = document.getElementById("playlist-timer-hours");
      var mEl = document.getElementById("playlist-timer-minutes");
      if (!hEl || !mEl || !selectedPlaylistId) return;
      var h = parseInt(hEl.value, 10) || 0;
      var m = parseInt(mEl.value, 10) || 0;
      var total = h * 3600 + m * 60;
      if (total <= 0) {
        setPlaylistTimerModalMessage("Choose a duration greater than zero.", "error");
        return;
      }
      beginPlaylistTimer(selectedPlaylistId, total);
      closePlaylistTimerModal();
      setPlaylistsMessage("Playlist timer set.", "success");
      renderSelectedPlaylistDetail();
    });
    populatePlaylistTimerSelectsInit();
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
    document.getElementById("account-subscription-manage").addEventListener("click", function () {
      setAccountMessage(
        "Subscriptions: iOS uses App Store today. Web/Android billing uses Stripe: point Stripe webhooks to POST …/api/stripe/webhook on your Cloud Functions URL, set STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET (+ optional STRIPE_PRICE_STARTER / STRIPE_PRICE_CREATOR), and pass firebaseUid in Checkout metadata. Until checkout UI exists, tiers can still be set manually in Firestore.",
        ""
      );
    });
    document.getElementById("account-manage-devices").addEventListener("click", function () {
      setAccountMessage("Device management is currently available in the iOS app. Web mirrors your account counts.", "");
    });
    document.getElementById("account-refresh-library-stats").addEventListener("click", function () {
      renderAccountInsights();
      setAccountMessage("Library and storage stats refreshed.", "success");
    });
    document.getElementById("account-sync-cloud").addEventListener("click", function () {
      setAccountMessage("Cloud sync is account-linked. New scripts and playlists should appear across devices after refresh.", "");
    });
    document.getElementById("account-signout").addEventListener("click", function () {
      closeAccountModal();
      auth.signOut().then(redirectLogin);
    });
    document.getElementById("account-privacy-password-reset").addEventListener("click", function () {
      sendPasswordResetFromAccount();
      setPrivacyMessage("If you requested a reset, check your email inbox.", "success");
    });
    document.getElementById("account-privacy-refresh-session").addEventListener("click", function () {
      refreshSessionToken();
      setPrivacyMessage("Session refreshed.", "success");
    });
    document.getElementById("account-privacy-export-json").addEventListener("click", function () {
      exportWebAccountDataJson();
    });
    document.getElementById("account-privacy-delete-account").addEventListener("click", function () {
      openAccountDeleteModal();
    });
    (function bindAccountDeleteModal() {
      var phraseEl = document.getElementById("account-delete-phrase");
      var confirmBtn = document.getElementById("account-delete-confirm");
      var errEl = document.getElementById("account-delete-error");
      function syncDeletePhrase() {
        if (!phraseEl || !confirmBtn) return;
        var ok = phraseEl.value.trim().toUpperCase() === "DELETE";
        confirmBtn.disabled = !ok;
      }
      if (phraseEl) {
        phraseEl.addEventListener("input", syncDeletePhrase);
        phraseEl.addEventListener("keyup", syncDeletePhrase);
      }
      document.getElementById("account-delete-cancel").addEventListener("click", function () {
        closeAccountDeleteModal();
      });
      document.getElementById("account-delete-backdrop").addEventListener("click", function (ev) {
        if (ev.target === ev.currentTarget) closeAccountDeleteModal();
      });
      document.getElementById("account-delete-confirm").addEventListener("click", function () {
        runDeleteAccountWeb();
      });
    })();
    document.getElementById("btn-account-menu").addEventListener("click", function () {
      openAccountModal();
    });
    document.getElementById("account-modal-close").addEventListener("click", function () {
      closeAccountModal();
    });
    document.getElementById("account-modal-backdrop").addEventListener("click", function (ev) {
      if (ev.target === ev.currentTarget) closeAccountModal();
    });
    document.querySelectorAll("[data-account-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setAccountModalTab(btn.getAttribute("data-account-tab") || "settings");
      });
    });
    document.getElementById("pref-resume-last-screen").addEventListener("change", function () {
      try {
        localStorage.setItem(PREF_RESUME_ADMIN_KEY, this.checked ? "1" : "0");
      } catch (_e) {}
    });
    document.getElementById("pref-auto-play-next").addEventListener("change", function () {
      try {
        localStorage.setItem(PREF_AUTO_PLAY_KEY, this.checked ? "1" : "0");
      } catch (_e) {}
      setAccountMessage("Auto-Play preference saved for this browser.", "success");
    });
    document.getElementById("pref-listen-shortcut").addEventListener("change", function () {
      var next = this.value === "library" ? "library" : "playlists";
      try {
        localStorage.setItem(PREF_LISTEN_SHORTCUT_KEY, next);
      } catch (_e) {}
      setAccountMessage("Listen today shortcut preference saved.", "success");
    });
    document.getElementById("pref-library-sub-my").addEventListener("change", function () {
      if (!this.checked) return;
      try {
        localStorage.setItem(PREF_LIBRARY_SUB_KEY, "my-library");
      } catch (_e) {}
      if (activeAdminTab === "library") {
        activeLibraryTab = "my-library";
        renderLibrarySubtab();
      }
    });
    document.getElementById("pref-library-sub-app").addEventListener("change", function () {
      if (!this.checked) return;
      try {
        localStorage.setItem(PREF_LIBRARY_SUB_KEY, "app-library");
      } catch (_e) {}
      if (activeAdminTab === "library") {
        activeLibraryTab = "app-library";
        renderLibrarySubtab();
      }
    });
    document.getElementById("account-pref-open-voices").addEventListener("click", function () {
      closeAccountModal();
      setAdminTab("voices");
      setVoicesMessage("Set your default voice here. This syncs across devices.", "");
      renderVoices();
    });
    document.getElementById("account-pref-open-backgrounds").addEventListener("click", function () {
      closeAccountModal();
      setAdminTab("backgrounds");
      setBackgroundsMessage("Set your default background here. This syncs across devices.", "");
      renderBackgrounds();
    });
    document.getElementById("btn-app-playlist-timer-clear").addEventListener("click", function () {
      clearPlaylistTimer();
      setPlaylistsMessage("Playlist timer cleared.", "success");
      renderSelectedPlaylistDetail();
      renderPlaylists(currentPlaylists);
    });
    if (!accountEscapeBound) {
      accountEscapeBound = true;
      document.addEventListener("keydown", function (ev) {
        if (ev.key !== "Escape") return;
        var bd = document.getElementById("account-modal-backdrop");
        if (bd && !bd.hidden) closeAccountModal();
      });
    }
    root.querySelectorAll("[data-admin-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tab = btn.getAttribute("data-admin-tab");
        if (tab === "home") {
          setHomeFlowStep("landing", displayName || "");
        }
        setAdminTab(tab);
      });
    });
    root.querySelectorAll("[data-library-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        activeLibraryTab = btn.getAttribute("data-library-tab") || "my-library";
        renderLibrarySubtab();
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
    document.getElementById("premade-expand-all-audio").addEventListener("click", function () {
      if (activeLibraryTab !== "app-library") return;
      toggleExpandAllPremadeAudioControls();
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
    window.onresize = function () {
      syncVoiceSegmentedPill();
      syncLibrarySegmentedPill();
      updatePremadeExpandAllToggleUi();
    };
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
    document.getElementById("voice-recording-cancel").addEventListener("click", function () {
      cancelCloneVoiceGuide();
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
    renderLibrarySubtab();
    renderVoices();
    renderBackgrounds();
    setAdminTab(activeAdminTab);
    updateMiniPlayer();
    updateTabCounts();
    updateAccountLastLoginLabel();
    updatePlaylistTimerBadge();
    var sdkEl = document.getElementById("account-privacy-firebase-sdk");
    if (sdkEl) sdkEl.textContent = (firebase && firebase.SDK_VERSION) || "-";
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

  function readPrefResumeAdmin() {
    try {
      return localStorage.getItem(PREF_RESUME_ADMIN_KEY) !== "0";
    } catch (_e) {
      return true;
    }
  }

  function syncAccountPreferencesForm() {
    var resumeCb = document.getElementById("pref-resume-last-screen");
    if (resumeCb) resumeCb.checked = readPrefResumeAdmin();
    var autoPlayCb = document.getElementById("pref-auto-play-next");
    if (autoPlayCb) autoPlayCb.checked = readPrefAutoPlay();
    var listenSel = document.getElementById("pref-listen-shortcut");
    if (listenSel) listenSel.value = readPrefListenTodayShortcut();
    var libMy = document.getElementById("pref-library-sub-my");
    var libApp = document.getElementById("pref-library-sub-app");
    if (libMy && libApp) {
      try {
        var sub = localStorage.getItem(PREF_LIBRARY_SUB_KEY) || "my-library";
        libMy.checked = sub !== "app-library";
        libApp.checked = sub === "app-library";
      } catch (_e2) {
        libMy.checked = true;
        libApp.checked = false;
      }
    }
  }

  function setAccountModalTab(tab) {
    var ids = ["settings", "preferences", "privacy"];
    var chosen = ids.indexOf(tab) >= 0 ? tab : "settings";
    ids.forEach(function (id) {
      var panel = document.getElementById("account-tab-" + id);
      if (panel) panel.hidden = id !== chosen;
    });
    document.querySelectorAll("[data-account-tab]").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-account-tab") === chosen);
    });
  }

  function readPrefAutoPlay() {
    try {
      return localStorage.getItem(PREF_AUTO_PLAY_KEY) === "1";
    } catch (_e) {
      return false;
    }
  }

  function readPrefListenTodayShortcut() {
    try {
      var raw = localStorage.getItem(PREF_LISTEN_SHORTCUT_KEY);
      return raw === "library" ? "library" : "playlists";
    } catch (_e) {
      return "playlists";
    }
  }

  function openAccountModal() {
    var bd = document.getElementById("account-modal-backdrop");
    if (!bd) return;
    syncAccountPreferencesForm();
    renderAccountInsights();
    setAccountModalTab("settings");
    bd.hidden = false;
    var btn = document.getElementById("btn-account-menu");
    if (btn) btn.setAttribute("aria-expanded", "true");
  }

  function closeAccountModal() {
    var bd = document.getElementById("account-modal-backdrop");
    if (!bd) return;
    bd.hidden = true;
    var b = document.getElementById("btn-account-menu");
    if (b) b.setAttribute("aria-expanded", "false");
  }

  function setAdminTab(tabId) {
    var normalized = tabId || "home";
    if (normalized === "create") normalized = "home";
    if (normalized === "account") normalized = "home";
    if (normalized === "app-library") {
      normalized = "library";
      activeLibraryTab = "app-library";
    }
    activeAdminTab = normalized;
    var sectionMap = {
      home: "section-home",
      library: "section-library",
      playlists: "section-playlists",
      voices: "section-voices",
      backgrounds: "section-backgrounds",
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
    if (activeAdminTab === "playlists") {
      updatePlaylistSectionVisibility();
    }
  }

  function closeLibraryCreateMenu() {
    var dd = document.getElementById("library-create-dropdown");
    var trig = document.getElementById("btn-library-create-menu");
    if (dd) dd.hidden = true;
    if (trig) trig.setAttribute("aria-expanded", "false");
  }

  function toggleLibraryCreateMenu() {
    var dd = document.getElementById("library-create-dropdown");
    var trig = document.getElementById("btn-library-create-menu");
    if (!dd || !trig) return;
    var willOpen = !!dd.hidden;
    dd.hidden = !willOpen;
    trig.setAttribute("aria-expanded", willOpen ? "true" : "false");
  }

  function renderLibrarySubtab() {
    var myBtn = document.getElementById("library-tab-my");
    var appBtn = document.getElementById("library-tab-app");
    var mySection = document.getElementById("library-sub-my");
    var appSection = document.getElementById("library-sub-app");
    var myTools = document.getElementById("library-my-only-toolbar");
    if (myBtn) myBtn.classList.toggle("is-active", activeLibraryTab === "my-library");
    if (appBtn) appBtn.classList.toggle("is-active", activeLibraryTab === "app-library");
    if (mySection) mySection.hidden = activeLibraryTab !== "my-library";
    if (appSection) appSection.hidden = activeLibraryTab !== "app-library";
    if (myTools) myTools.style.display = activeLibraryTab === "my-library" ? "" : "none";
    if (activeLibraryTab !== "my-library") closeLibraryCreateMenu();
    syncLibrarySegmentedPill();
    if (activeLibraryTab === "my-library") updateLibraryExpandAllToggleUi();
    if (activeLibraryTab === "app-library") updatePremadeExpandAllToggleUi();
  }

  function syncLibrarySegmentedPill() {
    var wrap = document.getElementById("library-segmented-tabs");
    if (!wrap) return;
    var activeBtn = wrap.querySelector(".app-tab-btn.is-active");
    if (!activeBtn) return;
    wrap.style.setProperty("--voice-pill-x", activeBtn.offsetLeft + "px");
    wrap.style.setProperty("--voice-pill-w", activeBtn.offsetWidth + "px");
    wrap.classList.add("is-ready");
    wrap.classList.remove("is-pulsing");
    void wrap.offsetWidth;
    wrap.classList.add("is-pulsing");
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

  /** Same timing as iOS `AudioMixingService` (lead-in / tail / bed level). */
  var BG_MIX_LEAD_IN_SEC = 2;
  var BG_MIX_TAIL_SEC = 2.5;
  var BG_MIX_BACKGROUND_GAIN = 0.3;
  var BG_MIX_OUTPUT_SAMPLE_RATE = 48000;

  function backgroundEntryById(backgroundId) {
    var bid = (backgroundId && String(backgroundId).trim()) || "";
    if (!bid) return null;
    return (
      availableBackgrounds.find(function (b) {
        return b.id === bid;
      }) || null
    );
  }

  function backgroundTrackAssetUrl(filename) {
    var fn = (filename && String(filename).trim()) || "";
    if (!fn) return "";
    return new URL("../audio/backgrounds/" + encodeURIComponent(fn), window.location.href).href;
  }

  function premadeTrackAssetUrl(folderName, filename) {
    var folder = (folderName && String(folderName).trim()) || "";
    var file = (filename && String(filename).trim()) || "";
    if (!folder || !file) return "";
    return new URL(
      "../audio/premade/" + encodeURIComponent(folder) + "/" + encodeURIComponent(file),
      window.location.href
    ).href;
  }

  function premadeStaticFolderCandidates(categoryID) {
    var cid = (categoryID && String(categoryID).trim()) || "";
    switch (cid) {
      case "confidence":
        return ["Confidence & Self-Worth"];
      case "relationships":
        // Keep typo first to match copied folder in this repo.
        return ["Realtionships & Love", "Relationships & Love"];
      case "success-prosperity":
        // Keep trailing-dot variant first to match copied folder in this repo.
        return ["Success & Prosperity.", "Success & Prosperity"];
      case "mental-wellbeing":
        return ["Mental Well-Being"];
      case "health-fitness":
        return ["Health & Fitness"];
      case "sports-performance":
        return ["Sports Performance"];
      case "sleep-rest":
        return ["Sleep & Rest"];
      default:
        return [];
    }
  }

  function premadeCategorySuffix(categoryID) {
    var cid = (categoryID && String(categoryID).trim()) || "";
    switch (cid) {
      case "confidence":
        return "csw";
      case "relationships":
        return "rls";
      case "success-prosperity":
        return "s&p";
      case "mental-wellbeing":
        return "mwb";
      case "health-fitness":
        return "hf";
      case "sports-performance":
        return "sp";
      case "sleep-rest":
        return "s&r";
      default:
        return "";
    }
  }

  function uniqueStrings(values) {
    var seen = {};
    var out = [];
    (values || []).forEach(function (v) {
      if (!v) return;
      if (seen[v]) return;
      seen[v] = true;
      out.push(v);
    });
    return out;
  }

  function resolvePremadeStaticAudioURLFromData(data) {
    var d = data || {};
    var title = (d.title && String(d.title).trim()) || "";
    var categoryID = (d.categoryID && String(d.categoryID).trim()) || "";
    var explicitFile =
      (d.audioFilename && String(d.audioFilename).trim()) ||
      (d.audioFileName && String(d.audioFileName).trim()) ||
      (d.filename && String(d.filename).trim()) ||
      (d.fileName && String(d.fileName).trim()) ||
      "";

    var folders = premadeStaticFolderCandidates(categoryID);
    if (!folders.length) return "";

    if (explicitFile) {
      return premadeTrackAssetUrl(folders[0], explicitFile);
    }
    var suffix = premadeCategorySuffix(categoryID);
    if (!title || !suffix) return "";

    var candidates = [];
    folders.forEach(function (folder) {
      candidates.push(premadeTrackAssetUrl(folder, title + "." + suffix + ".mp3"));
      candidates.push(premadeTrackAssetUrl(folder, title + "." + suffix + ".m4a"));
    });
    // Handle known typo filename in Sleep & Rest set.
    if (categoryID === "sleep-rest" && title.toLowerCase() === "claiming tranquil restoration") {
      folders.forEach(function (folder) {
        candidates.push(premadeTrackAssetUrl(folder, "Claiming Tranquil Resoration.s&r.mp3"));
      });
    }
    return uniqueStrings(candidates)[0] || "";
  }

  var STATIC_PREMADE_FALLBACK = [
    ["confidence", ["Embracing Inner Strength", "Radiating Self-Assurance", "Nurturing Self-Compassion", "Igniting Bold Confidence", "Cultivating Unwavering Worth"]],
    ["relationships", ["Cultivating Deep Connections", "Embracing Self-Love First", "Fostering Harmony and Trust", "Attracting Passionate Bonds", "Nurturing Emotional Intimacy"]],
    ["success-prosperity", ["Visionary Achievement", "Resilient Prosperity", "Empowered Wealth Building", "Harmonious Success Flow", "Bold Abundance Pursuit"]],
    ["mental-wellbeing", ["Finding Inner Peace", "Releasing Anxiety Gently", "Cultivating Emotional Resilience", "Embracing Daily Mindfulness", "Nurturing Mental Harmony"]],
    ["health-fitness", ["Building Vital Strength", "Nurturing Body Confidence", "Igniting Daily Energy", "Embracing Holistic Wellness", "Achieving Peak Performance"]],
    ["sports-performance", ["Unleashing Peak Performance", "Building Unstoppable Resilience", "Igniting Competitive Fire", "Mastering Athletic Flow", "Claiming Champion Mindset"]],
    ["sleep-rest", ["Embracing Gentle Slumber", "Cultivating Deep Recovery", "Nurturing Serene downtime", "Igniting Restful Renewal", "Claiming Tranquil Resoration"]],
  ];

  function buildStaticPremadeFallbackList() {
    var rows = [];
    STATIC_PREMADE_FALLBACK.forEach(function (entry) {
      var cid = entry[0];
      var titles = entry[1] || [];
      titles.forEach(function (title, idx) {
        var data = { title: title, categoryID: cid };
        var staticUrl = resolvePremadeStaticAudioURLFromData(data);
        rows.push({
          id: "static-premade-" + cid + "-" + String(idx + 1),
          title: title,
          categoryID: cid,
          description: "Built-in premade audio",
          scriptText: title,
          audioURL: staticUrl,
          sourceScriptID: "",
          createdByUID: "",
          createdByEmail: "",
          createdByName: "Built-in",
          createdAt: null,
        });
      });
    });
    return rows;
  }

  function normalizePremadeTitleKey(title) {
    return ((title && String(title).trim()) || "").toLowerCase();
  }

  function mergeCloudAndStaticPremades(cloudPremade) {
    var cloud = Array.isArray(cloudPremade) ? cloudPremade.slice() : [];
    var staticRows = buildStaticPremadeFallbackList();
    var seen = {};
    cloud.forEach(function (p) {
      var key = ((p.categoryID || "").trim() || "") + "::" + normalizePremadeTitleKey(p.title);
      seen[key] = true;
    });
    staticRows.forEach(function (p) {
      var key = ((p.categoryID || "").trim() || "") + "::" + normalizePremadeTitleKey(p.title);
      if (seen[key]) return;
      cloud.push(p);
    });
    return cloud;
  }

  var backgroundPreviewAudio = null;
  var backgroundPreviewId = "";
  function stopBackgroundPreview() {
    if (backgroundPreviewAudio) {
      try {
        backgroundPreviewAudio.pause();
      } catch (_e) {}
      try {
        backgroundPreviewAudio.removeAttribute("src");
        backgroundPreviewAudio.load();
      } catch (_e2) {}
      backgroundPreviewAudio = null;
    }
    backgroundPreviewId = "";
  }

  function isBackgroundPreviewing(backgroundId) {
    return !!(
      backgroundPreviewAudio &&
      backgroundPreviewId === ((backgroundId && String(backgroundId).trim()) || "") &&
      !backgroundPreviewAudio.paused
    );
  }

  function previewBackgroundById(backgroundId, onError) {
    var entry = backgroundEntryById(backgroundId);
    if (!entry || !entry.file) return Promise.resolve(false);
    if (isBackgroundPreviewing(entry.id)) {
      stopBackgroundPreview();
      return Promise.resolve(false);
    }
    stopBackgroundPreview(); // switch to a different background preview
    var url = backgroundTrackAssetUrl(entry.file);
    var a = new Audio(url);
    a.loop = true;
    backgroundPreviewId = entry.id;
    backgroundPreviewAudio = a;
    return a
      .play()
      .then(function () {
        return true;
      })
      .catch(function () {
        stopBackgroundPreview();
        var msg =
          "Could not play background preview. Add the MP3s to the site under audio/backgrounds/ (see that folder’s README), deploy, and hard-refresh.";
        if (typeof onError === "function") onError(msg);
        return false;
      });
  }

  function resampleFloat32Linear(src, srcRate, dstRate, dstLen) {
    var out = new Float32Array(dstLen);
    if (dstLen === 0) return out;
    var ratio = srcRate / dstRate;
    var srcLen = src.length;
    for (var i = 0; i < dstLen; i++) {
      var srcPos = i * ratio;
      var i0 = Math.floor(srcPos);
      var i1 = Math.min(i0 + 1, srcLen - 1);
      var f = srcPos - i0;
      out[i] = src[i0] * (1 - f) + src[i1] * f;
    }
    return out;
  }

  function encodeWaveFileFromAudioBuffer(audioBuffer) {
    var numCh = audioBuffer.numberOfChannels;
    var length = audioBuffer.length;
    var sampleRate = audioBuffer.sampleRate;
    var blockAlign = numCh * 2;
    var byteRate = sampleRate * blockAlign;
    var dataSize = length * blockAlign;
    var ab = new ArrayBuffer(44 + dataSize);
    var v = new DataView(ab);
    function writeStr(o, s) {
      for (var i = 0; i < s.length; i++) {
        v.setUint8(o + i, s.charCodeAt(i));
      }
    }
    writeStr(0, "RIFF");
    v.setUint32(4, 36 + dataSize, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, numCh, true);
    v.setUint32(24, sampleRate, true);
    v.setUint32(28, byteRate, true);
    v.setUint16(32, blockAlign, true);
    v.setUint16(34, 16, true);
    writeStr(36, "data");
    v.setUint32(40, dataSize, true);
    var offset = 44;
    var chData = [];
    for (var c = 0; c < numCh; c++) {
      chData.push(audioBuffer.getChannelData(c));
    }
    for (var i = 0; i < length; i++) {
      for (var c = 0; c < numCh; c++) {
        var s = Math.max(-1, Math.min(1, chData[c][i]));
        var int16 = (s < 0 ? s * 0x8000 : s * 0x7fff) | 0;
        v.setInt16(offset, int16, true);
        offset += 2;
      }
    }
    return new Blob([ab], { type: "audio/wav" });
  }

  function mixTtsWithBackgroundToWavBlob(ttsArrayBuffer, backgroundId) {
    return new Promise(function (resolve, reject) {
      var entry = backgroundEntryById(backgroundId);
      if (!entry || !entry.file) {
        reject(new Error("Unknown background for mixing."));
        return;
      }
      var bgUrl = backgroundTrackAssetUrl(entry.file);
      var ACtx = window.AudioContext || window.webkitAudioContext;
      if (!ACtx) {
        reject(new Error("Web Audio is not available in this browser."));
        return;
      }
      var ctx = new ACtx();
      Promise.all([
        ctx.decodeAudioData(ttsArrayBuffer.slice(0)),
        fetch(bgUrl).then(function (r) {
          if (!r.ok) {
            throw new Error(
              "Background file not found (" +
                r.status +
                "). Deploy the iOS BackGroundAudio MP3s to /audio/backgrounds/ on the live site."
            );
          }
          return r.arrayBuffer();
        }).then(function (bgAb) {
          return ctx.decodeAudioData(bgAb.slice(0));
        }),
      ])
        .then(function (buffers) {
          var voiceBuf = buffers[0];
          var bgBuf = buffers[1];
          var srOut = BG_MIX_OUTPUT_SAMPLE_RATE;
          var leadIn = BG_MIX_LEAD_IN_SEC;
          var tail = BG_MIX_TAIL_SEC;
          var bgVol = BG_MIX_BACKGROUND_GAIN;
          var voiceDur = voiceBuf.duration;
          var totalDur = leadIn + voiceDur + tail;
          var outLen = Math.max(1, Math.ceil(totalDur * srOut));
          var outCh = Math.min(2, Math.max(1, Math.max(voiceBuf.numberOfChannels, bgBuf.numberOfChannels)));
          var outBuf = ctx.createBuffer(outCh, outLen, srOut);
          var nVoice = Math.max(1, Math.round(voiceDur * srOut));
          var nBgLoop = Math.max(1, Math.round(bgBuf.duration * srOut));
          for (var c = 0; c < outCh; c++) {
            var vCh = Math.min(c, voiceBuf.numberOfChannels - 1);
            var bCh = Math.min(c, bgBuf.numberOfChannels - 1);
            var vSrc = voiceBuf.getChannelData(vCh);
            var bgSrc = bgBuf.getChannelData(bCh);
            var voiceRS = resampleFloat32Linear(vSrc, voiceBuf.sampleRate, srOut, nVoice);
            var bgLoop = resampleFloat32Linear(bgSrc, bgBuf.sampleRate, srOut, nBgLoop);
            var outData = outBuf.getChannelData(c);
            for (var i = 0; i < outLen; i++) {
              var t = i / srOut;
              var gain = 0;
              if (t < leadIn) {
                gain = bgVol * (t / leadIn);
              } else if (t < leadIn + voiceDur) {
                gain = bgVol;
              } else if (t < totalDur) {
                gain = bgVol * (1 - (t - leadIn - voiceDur) / tail);
              } else {
                gain = 0;
              }
              var bIdx = i % nBgLoop;
              var voiceSample = 0;
              if (t >= leadIn && t < leadIn + voiceDur) {
                var vi = Math.floor((t - leadIn) * srOut);
                if (vi >= 0 && vi < nVoice) {
                  voiceSample = voiceRS[vi];
                }
              }
              var m = voiceSample + bgLoop[bIdx] * gain;
              outData[i] = Math.max(-1, Math.min(1, m));
            }
          }
          try {
            ctx.close();
          } catch (_ce) {}
          resolve(encodeWaveFileFromAudioBuffer(outBuf));
        })
        .catch(function (e) {
          try {
            ctx.close();
          } catch (_ce2) {}
          reject(e instanceof Error ? e : new Error(String(e)));
        });
    });
  }

  function uploadFinalMixedWav(uid, scriptId, wavBlob) {
    if (typeof firebase.storage !== "function") {
      return Promise.reject(new Error("Firebase Storage is not loaded."));
    }
    var path = "users/" + uid + "/audios/" + scriptId + "_audio.wav";
    var ref = firebase.storage().ref(path);
    return ref.put(wavBlob, { contentType: "audio/wav" }).then(function (snap) {
      return snap.ref.getDownloadURL();
    });
  }

  function finalizeAwaitingClientMix(uid, scriptId, ttsDownloadURL, backgroundId) {
    return fetch(ttsDownloadURL)
      .then(function (r) {
        if (!r.ok) {
          throw new Error("Could not download speech audio for mixing (" + r.status + ").");
        }
        return r.arrayBuffer();
      })
      .then(function (ttsAb) {
        return mixTtsWithBackgroundToWavBlob(ttsAb, backgroundId);
      })
      .then(function (wavBlob) {
        return uploadFinalMixedWav(uid, scriptId, wavBlob);
      });
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
    syncVoiceSegmentedPill();

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

  function syncVoiceSegmentedPill() {
    var wrap = document.querySelector("#section-voices .voice-segmented-tabs");
    if (!wrap) return;
    var activeBtn = wrap.querySelector(".app-tab-btn.is-active");
    if (!activeBtn) return;
    wrap.style.setProperty("--voice-pill-x", activeBtn.offsetLeft + "px");
    wrap.style.setProperty("--voice-pill-w", activeBtn.offsetWidth + "px");
    wrap.classList.add("is-ready");
    wrap.classList.remove("is-pulsing");
    void wrap.offsetWidth;
    wrap.classList.add("is-pulsing");
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

  function cancelCloneVoiceGuide() {
    if (activeVoiceRecorder) {
      stopVoiceRecording();
    }
    setVoiceRecordingStatus("", "");
    setVoicesMessage("Clone voice cancelled.", "");
    setVoiceRecordingGuideVisible(false);
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
    var grouped = {};
    backgroundCategoryOrder.forEach(function (cid) {
      grouped[cid] = [];
    });
    availableBackgrounds.forEach(function (b) {
      if (b.id === "bg-none") return;
      var cid = (b.categoryID && String(b.categoryID).trim()) || "general";
      if (!grouped[cid]) grouped[cid] = [];
      grouped[cid].push(b);
    });
    var none = availableBackgrounds.find(function (b) {
      return b.id === "bg-none";
    });
    function rowHtml(b) {
      var isSelected = b.id === selectedBackgroundId;
      var isPreview = isBackgroundPreviewing(b.id);
      return (
        '<div class="app-modal-row" style="margin-bottom:0.45rem;display:flex;align-items:center;gap:0.45rem;flex-wrap:wrap;">' +
        '  <div style="flex:1;min-width:140px;">' +
        '    <div class="app-modal-row-name">' +
        escapeHtml(b.name) +
        "</div>" +
        "  </div>" +
        (b.file
          ? '  <button type="button" class="app-btn app-btn-ghost" style="padding:0.32rem 0.55rem;font-size:0.8rem;" data-background-preview="' +
            escapeHtml(b.id) +
            '">' +
            (isPreview ? "Stop" : "Preview") +
            "</button>"
          : "") +
        '  <button type="button" class="app-btn ' +
        (isSelected ? "app-btn-primary" : "app-btn-secondary") +
        '" data-background-id="' +
        escapeHtml(b.id) +
        '">' +
        (isSelected ? "Default" : "Set Default") +
        "</button>" +
        "</div>"
      );
    }
    var sections = backgroundCategoryOrder
      .map(function (cid) {
        var items = grouped[cid] || [];
        if (!items.length) return "";
        if (backgroundCategoryOpenById[cid] == null) {
          var containsSelected = selectedBackgroundId !== "bg-none" && items.some(function (b) { return b.id === selectedBackgroundId; });
          backgroundCategoryOpenById[cid] = cid === "general" || containsSelected;
        }
        var open = backgroundCategoryOpenById[cid] === true;
        return (
          '<details class="app-bg-category" data-bg-category="' +
          escapeHtml(cid) +
          '" ' +
          (open ? "open" : "") +
          ">" +
          '<summary class="app-bg-category-summary">' +
          escapeHtml(backgroundCategoryDisplayName(cid)) +
          ' <span class="app-muted">(' +
          String(items.length) +
          ")</span></summary>" +
          '<div class="app-bg-category-list">' +
          items
            .map(function (b) {
              return rowHtml(b);
            })
            .join("") +
          "</div>" +
          "</details>"
        );
      })
      .join("");
    list.innerHTML =
      (none
        ? '<div class="app-bg-none-row">' + rowHtml(none) + "</div>"
        : "") + sections;
    list.querySelectorAll("[data-background-preview]").forEach(function (pbtn) {
      pbtn.addEventListener("click", function () {
        var pid = pbtn.getAttribute("data-background-preview");
        previewBackgroundById(pid, function (msg) {
          setBackgroundsMessage(msg, "error");
        }).then(function () {
          renderBackgrounds();
        });
      });
    });
    list.querySelectorAll("[data-bg-category]").forEach(function (sec) {
      sec.addEventListener("toggle", function () {
        var cid = sec.getAttribute("data-bg-category");
        if (!cid) return;
        backgroundCategoryOpenById[cid] = !!sec.open;
      });
    });
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

  function setPrivacyMessage(text, kind) {
    var el = document.getElementById("account-privacy-message");
    if (!el) return;
    el.className = "app-inline-msg" + (kind ? " " + kind : "");
    el.textContent = text || "";
  }

  function jsonReplacer(_key, value) {
    if (value && typeof value.toDate === "function") {
      try {
        return value.toDate().toISOString();
      } catch (_e) {
        return null;
      }
    }
    if (value && typeof value.path === "string" && typeof value.id === "string" && value.parent) {
      try {
        return value.path;
      } catch (_e2) {
        return null;
      }
    }
    return value;
  }

  function exportWebAccountDataJson() {
    if (!currentUser) {
      setPrivacyMessage("You must be signed in to export data.", "error");
      return;
    }
    setPrivacyMessage("Preparing export…", "");
    var uid = currentUser.uid;
    var profileRef = db.collection("users").doc(uid);
    Promise.all([
      profileRef.get(),
      profileRef.collection("scripts").get(),
      profileRef.collection("playlists").get(),
      profileRef.collection("clonedVoices").get().catch(function () {
        return { docs: [] };
      }),
    ])
      .then(function (results) {
        var profileSnap = results[0];
        var scriptsSnap = results[1];
        var playlistsSnap = results[2];
        var clonedSnap = results[3];
        var payload = {
          exportedAt: new Date().toISOString(),
          user: {
            uid: uid,
            email: currentUser.email || "",
            displayName: currentUser.displayName || "",
          },
          profile: profileSnap.exists ? profileSnap.data() || {} : {},
          scripts: scriptsSnap.docs.map(function (d) {
            return { id: d.id, data: d.data() || {} };
          }),
          playlists: playlistsSnap.docs.map(function (d) {
            return { id: d.id, data: d.data() || {} };
          }),
          clonedVoices: clonedSnap.docs
            ? clonedSnap.docs.map(function (d) {
                return { id: d.id, data: d.data() || {} };
              })
            : [],
        };
        var json = JSON.stringify(payload, jsonReplacer, 2);
        var blob = new Blob([json], { type: "application/json;charset=utf-8" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "focushift-web-export-" + uid + "-" + Date.now() + ".json";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setPrivacyMessage("Export downloaded.", "success");
      })
      .catch(function (e) {
        setPrivacyMessage(e.message || "Could not export data.", "error");
      });
  }

  function openAccountDeleteModal() {
    var bd = document.getElementById("account-delete-backdrop");
    var phraseEl = document.getElementById("account-delete-phrase");
    var errEl = document.getElementById("account-delete-error");
    var confirmBtn = document.getElementById("account-delete-confirm");
    if (!bd || !phraseEl) return;
    phraseEl.value = "";
    if (confirmBtn) confirmBtn.disabled = true;
    if (errEl) {
      errEl.style.display = "none";
      errEl.textContent = "";
    }
    if (!cloudFunctions && errEl) {
      errEl.style.display = "block";
      errEl.textContent =
        "Firebase Functions client did not load. Ensure firebase-functions-compat.js is on the page, then reload.";
    }
    bd.hidden = false;
    setTimeout(function () {
      try {
        phraseEl.focus();
      } catch (_e) {}
    }, 80);
  }

  function closeAccountDeleteModal() {
    var bd = document.getElementById("account-delete-backdrop");
    if (bd) bd.hidden = true;
    var phraseEl = document.getElementById("account-delete-phrase");
    if (phraseEl) phraseEl.value = "";
    var errEl = document.getElementById("account-delete-error");
    if (errEl) {
      errEl.style.display = "none";
      errEl.textContent = "";
    }
    var confirmBtn = document.getElementById("account-delete-confirm");
    if (confirmBtn) confirmBtn.disabled = true;
  }

  function runDeleteAccountWeb() {
    if (!currentUser) {
      setPrivacyMessage("You are not signed in.", "error");
      return;
    }
    if (!cloudFunctions) {
      setPrivacyMessage(
        "Firebase Functions client is not available. Reload after deploy, or contact support.",
        "error"
      );
      return;
    }
    var phraseEl = document.getElementById("account-delete-phrase");
    var errEl = document.getElementById("account-delete-error");
    var confirmBtn = document.getElementById("account-delete-confirm");
    var phrase = (phraseEl && phraseEl.value.trim()) || "";
    if (phrase.toUpperCase() !== "DELETE") {
      if (errEl) {
        errEl.style.display = "block";
        errEl.textContent = "Type DELETE to confirm.";
      }
      return;
    }
    if (errEl) {
      errEl.style.display = "none";
      errEl.textContent = "";
    }
    if (confirmBtn) confirmBtn.disabled = true;
    var fn = cloudFunctions.httpsCallable("deleteOwnAccount");
    fn({ confirmationPhrase: phrase })
      .then(function () {
        closeAccountDeleteModal();
        closeAccountModal();
        return auth.signOut();
      })
      .then(function () {
        redirectLogin();
      })
      .catch(function (e) {
        if (confirmBtn) confirmBtn.disabled = false;
        var msg = (e && e.message) || (e && e.code) || "Account deletion failed.";
        if (e && e.code === "functions/not-found") {
          msg =
            "Server step not found. Deploy the deleteOwnAccount Cloud Function (see functions/index.js), then try again.";
        }
        if (errEl) {
          errEl.style.display = "block";
          errEl.textContent = msg;
        }
        setPrivacyMessage(msg, "error");
      });
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
        db.collection("users")
          .doc(currentUser.uid)
          .get()
          .then(function (snap) {
            currentUserProfile = snap.exists ? snap.data() || {} : currentUserProfile;
            renderAccountInsights();
          })
          .catch(function () {});
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

  function formatCount(v) {
    var n = Number(v);
    if (!isFinite(n) || n < 0) return "-";
    if (Math.floor(n) !== n) return String(n.toFixed(1));
    return String(n);
  }

  function formatBytesHuman(v) {
    var n = Number(v);
    if (!isFinite(n) || n <= 0) return "-";
    var units = ["B", "KB", "MB", "GB", "TB"];
    var i = 0;
    while (n >= 1024 && i < units.length - 1) {
      n = n / 1024;
      i += 1;
    }
    var precision = n >= 100 ? 0 : n >= 10 ? 1 : 2;
    return n.toFixed(precision) + " " + units[i];
  }

  function profileFirstNumber(keys) {
    if (!currentUserProfile || !keys || !keys.length) return null;
    for (var i = 0; i < keys.length; i += 1) {
      var val = currentUserProfile[keys[i]];
      if (val === null || typeof val === "undefined") continue;
      var n = Number(val);
      if (isFinite(n) && n >= 0) return n;
    }
    return null;
  }

  function profileFirstArrayLength(keys) {
    if (!currentUserProfile || !keys || !keys.length) return null;
    for (var i = 0; i < keys.length; i += 1) {
      var val = currentUserProfile[keys[i]];
      if (Array.isArray(val)) return val.length;
    }
    return null;
  }

  function importedAudioCount() {
    return currentScripts.filter(function (s) {
      var hasAudio = !!(s.audioURL && String(s.audioURL).trim());
      var noText = !((s.text || "").trim());
      return hasAudio && noText;
    }).length;
  }

  function renderAccountInsights() {
    var el = document.getElementById("account-insights");
    if (!el) return;

    var plan = resolvePlanLabel();
    var deviceCount = profileFirstArrayLength(["devices", "registeredDevices", "deviceIDs"]);
    if (deviceCount === null) {
      deviceCount = profileFirstNumber(["deviceCount", "connectedDevices", "devicesCount"]);
    }
    var deviceLimit = profileFirstNumber(["deviceLimit", "maxDevices", "devicesLimit"]);
    var sharingCount = profileFirstArrayLength(["sharedRecipients", "sharedListeners", "shareRecipients"]);
    if (sharingCount === null) {
      sharingCount = profileFirstNumber(["sharedRecipientsCount", "sharedListenersCount"]);
    }
    var scriptsUsed = profileFirstNumber(["scriptsThisMonth", "aiScriptsUsed", "usageScripts"]);
    var scriptsLimit = profileFirstNumber(["scriptsLimit", "monthlyScriptsLimit", "aiScriptsLimit"]);
    var wordsUsed = profileFirstNumber(["wordsThisMonth", "aiWordsUsed", "usageWords"]);
    var wordsLimit = profileFirstNumber(["wordsLimit", "monthlyWordsLimit", "aiWordsLimit"]);
    var storageBytes = profileFirstNumber(["storageUsageBytes", "storageBytes", "usedStorageBytes"]);
    var storageMB = profileFirstNumber(["storageUsageMB", "storageMB", "usedStorageMB"]);
    var storageDisplay = "-";
    if (storageBytes !== null) storageDisplay = formatBytesHuman(storageBytes);
    else if (storageMB !== null) storageDisplay = formatCount(storageMB) + " MB";

    function row(label, value) {
      return (
        '<div class="account-kv"><span class="account-kv-label">' +
        escapeHtml(label) +
        '</span><span class="account-kv-value">' +
        escapeHtml(value) +
        "</span></div>"
      );
    }

    el.innerHTML =
      '<section class="account-insight-card">' +
      "<h4>Subscription plan</h4>" +
      row("Current plan", plan || "Plan not set") +
      row(
        "Plan source",
        currentUserProfile && currentUserProfile.subscriptionSource
          ? String(currentUserProfile.subscriptionSource)
          : "Firebase profile"
      ) +
      "</section>" +
      '<section class="account-insight-card">' +
      "<h4>Devices and sharing</h4>" +
      row("Registered devices", deviceCount === null ? "-" : formatCount(deviceCount)) +
      row("Device limit", deviceLimit === null ? "-" : formatCount(deviceLimit)) +
      row("Shared listeners", sharingCount === null ? "-" : formatCount(sharingCount)) +
      "</section>" +
      '<section class="account-insight-card">' +
      "<h4>AI script usage</h4>" +
      row("Scripts this month", scriptsUsed === null ? "-" : formatCount(scriptsUsed)) +
      row("Scripts limit", scriptsLimit === null ? "-" : formatCount(scriptsLimit)) +
      row("Words this month", wordsUsed === null ? "-" : formatCount(wordsUsed)) +
      row("Words limit", wordsLimit === null ? "-" : formatCount(wordsLimit)) +
      "</section>" +
      '<section class="account-insight-card">' +
      "<h4>Library and storage</h4>" +
      row("My scripts", formatCount(currentScripts.length)) +
      row("Scripts with audio", formatCount(scriptsWithAudioCount())) +
      row("Imported audio", formatCount(importedAudioCount())) +
      row("Storage used", storageDisplay) +
      "</section>";
  }

  function setHomeFlowStep(step, displayName) {
    homeFlowStep = step;
    renderHomeFlow(displayName || "");
  }

  function resolvedSubscriptionTier() {
    if (!currentUserProfile) return "free";
    var raw = (currentUserProfile.subscriptionTier || "").toString().trim().toLowerCase();
    if (raw === "basic") return "starter";
    if (raw === "premium") return "creator";
    if (raw === "starter" || raw === "creator" || raw === "free") return raw;
    return "free";
  }

  function maxClarifyForWebTier(tier) {
    if (tier === "starter" || tier === "creator") return 3;
    return 0;
  }

  function resolveDisplayNameForScript(displayName) {
    var d = (displayName || "").trim();
    if (d) return d;
    if (currentUserProfile && currentUserProfile.displayName) {
      return String(currentUserProfile.displayName).trim();
    }
    if (currentUser && currentUser.displayName) return String(currentUser.displayName).trim();
    return "";
  }

  function firstClarifyingQuestionLine(content) {
    var lines = String(content || "")
      .split(/\r?\n/)
      .map(function (l) {
        return l.trim();
      })
      .filter(Boolean);
    var line = lines[0] || "";
    line = line.replace(/^\d+\.\s*/, "").replace(/\*\*/g, "").trim();
    return line;
  }

  function buildScriptGeneratePayload(ctx, clarifyCount) {
    var cat = ctx.cat;
    var third = (ctx.perspective || "").toLowerCase().indexOf("third") !== -1;
    var answersMap = {};
    answersMap[cat.id] = [ctx.q1, ctx.q2];
    return {
      categories: [
        {
          id: cat.id,
          name: cat.name,
          questions: cat.questions,
        },
      ],
      answers: answersMap,
      clarifyingAnswers: ctx.clarifyingAnswers || {},
      tone: ctx.tone || "Calming",
      length: ctx.length || "Medium",
      clarifyCount: clarifyCount,
      tier: resolvedSubscriptionTier(),
      perspective: third ? "Third person" : "First person",
      useNameInScript: third ? !!ctx.useNameInScript : false,
      userName: resolveDisplayNameForScript(ctx.displayName || ""),
    };
  }

  function postGenerateScriptRequest(payload) {
    if (!currentUser) return Promise.reject(new Error("Not signed in."));
    return currentUser.getIdToken(true).then(function (token) {
      return fetch(backendBaseURL() + "/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(payload),
      }).then(function (resp) {
        return resp.json().then(function (json) {
          if (json && json.ok === true && json.content != null && json.content !== "") {
            return json;
          }
          if (!resp.ok || !json || json.ok !== true) {
            var msg = (json && json.error) || "Generation failed.";
            throw new Error(msg);
          }
          return json;
        });
      });
    });
  }

  function readGenerateFormFromDom() {
    var cat = selectedCategory();
    var q1 = (document.getElementById("gen-q1") && document.getElementById("gen-q1").value) || "";
    var q2 = (document.getElementById("gen-q2") && document.getElementById("gen-q2").value) || "";
    var toneEl = document.getElementById("gen-tone");
    var lenRadio = document.querySelector('input[name="gen-length"]:checked');
    var persRadio = document.querySelector('input[name="gen-perspective"]:checked');
    var useNameEl = document.getElementById("gen-use-name");
    return {
      cat: cat,
      q1: q1.trim(),
      q2: q2.trim(),
      tone: (toneEl && toneEl.value) || "Calming",
      length: (lenRadio && lenRadio.value) || "Medium",
      perspective: (persRadio && persRadio.value) || "First person",
      useNameInScript: useNameEl ? !!useNameEl.checked : true,
    };
  }

  function wirePerspectiveUseNameRow() {
    var row = document.getElementById("gen-use-name-row");
    var radios = document.querySelectorAll('input[name="gen-perspective"]');
    if (!radios.length) return;
    function sync() {
      var checked = document.querySelector('input[name="gen-perspective"]:checked');
      var third = checked && String(checked.value || "").toLowerCase().indexOf("third") !== -1;
      if (row) row.style.display = third ? "" : "none";
    }
    radios.forEach(function (r) {
      r.addEventListener("change", sync);
    });
    sync();
  }

  function wireGenLengthHint() {
    var hint = document.getElementById("gen-length-hint");
    var labels = {
      Short: "Short — about 1 min of spoken audio (~150 words).",
      Medium: "Medium — about 2.5 min (~400 words).",
      Long: "Long — about 4 min (~800 words).",
    };
    function sync() {
      var checked = document.querySelector('input[name="gen-length"]:checked');
      var v = (checked && checked.value) || "Medium";
      if (hint) hint.textContent = labels[v] || labels.Medium;
    }
    document.querySelectorAll('input[name="gen-length"]').forEach(function (r) {
      r.addEventListener("change", sync);
    });
    sync();
  }

  function wireClarifyStepper() {
    var hidden = document.getElementById("gen-clarify-count");
    var display = document.getElementById("gen-clarify-display");
    var minus = document.getElementById("gen-clarify-minus");
    var plus = document.getElementById("gen-clarify-plus");
    var maxC = maxClarifyForWebTier(resolvedSubscriptionTier());
    function readVal() {
      var v = parseInt((hidden && hidden.value) || "0", 10);
      if (!isFinite(v) || v < 0) v = 0;
      if (v > maxC) v = maxC;
      return v;
    }
    function sync() {
      var v = readVal();
      if (hidden) hidden.value = String(v);
      if (display) display.textContent = String(v);
      if (minus) minus.disabled = v <= 0;
      if (plus) plus.disabled = maxC <= 0 ? true : v >= maxC;
      syncGenerateSubmitLabel();
    }
    if (minus) {
      minus.addEventListener("click", function () {
        var v = readVal();
        if (v > 0 && hidden) hidden.value = String(v - 1);
        sync();
      });
    }
    if (plus) {
      plus.addEventListener("click", function () {
        var v = readVal();
        if (v < maxC && hidden) hidden.value = String(v + 1);
        sync();
      });
    }
    sync();
  }

  function setClarifyStepperValue(n) {
    var hidden = document.getElementById("gen-clarify-count");
    var display = document.getElementById("gen-clarify-display");
    var maxC = maxClarifyForWebTier(resolvedSubscriptionTier());
    var v = parseInt(n, 10);
    if (!isFinite(v) || v < 0) v = 0;
    if (v > maxC) v = maxC;
    if (hidden) hidden.value = String(v);
    if (display) display.textContent = String(v);
    var minus = document.getElementById("gen-clarify-minus");
    var plus = document.getElementById("gen-clarify-plus");
    if (minus) minus.disabled = v <= 0;
    if (plus) plus.disabled = maxC <= 0 ? true : v >= maxC;
    syncGenerateSubmitLabel();
  }

  function syncGenerateSubmitLabel() {
    var btn = document.getElementById("gen-submit-primary");
    if (!btn) return;
    var hidden = document.getElementById("gen-clarify-count");
    var n = hidden ? parseInt(hidden.value, 10) : 0;
    if (!isFinite(n) || n < 0) n = 0;
    btn.textContent = n > 0 ? "Next" : "Generate";
  }

  function finalizeScriptGeneration(ctx) {
    if (!currentUser) return;
    var payload = buildScriptGeneratePayload(ctx, 0);
    generationMessage("Generating script...", "");
    postGenerateScriptRequest(payload)
      .then(function (json) {
        if (!json.content) throw new Error("Empty script response.");
        var title = uniqueScriptTitle(ctx.cat.name + " Script");
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
            categoryID: ctx.cat.id,
          })
          .then(function () {
            generationMessage("Generated and saved as \"" + title + "\".", "success");
            homeClarifyFlow = null;
            var q1El = document.getElementById("gen-q1");
            var q2El = document.getElementById("gen-q2");
            if (q1El) q1El.value = "";
            if (q2El) q2El.value = "";
            setMessage("Generated script saved to My Library.", "success");
            setHomeFlowStep("landing", ctx.displayName || "");
          });
      })
      .catch(function (e) {
        generationMessage(e.message || "Could not generate script.", "error");
      });
  }

  function requestNextClarifyingQuestion() {
    if (!homeClarifyFlow || !currentUser) return;
    var f = homeClarifyFlow;
    generationMessage(
      "Generating clarifying question " + (f.currentIndex + 1) + " of " + f.requested + "…",
      ""
    );
    var ctx = {
      displayName: f.displayName,
      cat: f.cat,
      q1: f.q1,
      q2: f.q2,
      tone: f.tone,
      length: f.length,
      perspective: f.perspective,
      useNameInScript: f.useNameInScript,
      clarifyingAnswers: f.answers,
    };
    var payload = buildScriptGeneratePayload(ctx, 1);
    postGenerateScriptRequest(payload)
      .then(function (json) {
        if (!json || json.content == null || String(json.content).trim() === "") {
          throw new Error("Unexpected server response for clarifying question.");
        }
        var q = firstClarifyingQuestionLine(json.content);
        if (!q) throw new Error("Could not read clarifying question from the server.");
        f.pendingQuestion = q;
        setHomeFlowStep("clarify", f.displayName);
      })
      .catch(function (e) {
        generationMessage(e.message || "Could not load clarifying question.", "error");
        homeClarifyFlow = null;
        setHomeFlowStep("survey", f.displayName);
      });
  }

  function beginScriptGenerationFromForm(displayName) {
    if (!currentUser) return;
    var ctx = readGenerateFormFromDom();
    ctx.displayName = displayName || "";
    if (!ctx.q1 || !ctx.q2) {
      generationMessage("Please answer both questions first.", "error");
      return;
    }
    var clarifyEl = document.getElementById("gen-clarify-count");
    var clarifyReq = clarifyEl ? parseInt(clarifyEl.value, 10) : 0;
    if (!isFinite(clarifyReq) || clarifyReq < 0) clarifyReq = 0;
    var maxC = maxClarifyForWebTier(resolvedSubscriptionTier());
    if (clarifyReq > maxC) clarifyReq = maxC;

    if (clarifyReq > 0) {
      homeClarifyFlow = {
        displayName: ctx.displayName,
        cat: ctx.cat,
        q1: ctx.q1,
        q2: ctx.q2,
        tone: ctx.tone,
        length: ctx.length,
        perspective: ctx.perspective,
        useNameInScript: ctx.useNameInScript,
        requested: clarifyReq,
        currentIndex: 0,
        answers: {},
        pendingQuestion: "",
      };
      requestNextClarifyingQuestion();
      return;
    }
    finalizeScriptGeneration(ctx);
  }

  function submitClarifyAnswerAndContinue() {
    if (!homeClarifyFlow) return;
    var f = homeClarifyFlow;
    var ta = document.getElementById("clarify-answer");
    var ans = (ta && ta.value.trim()) || "";
    if (!ans) {
      generationMessage("Please type an answer before continuing.", "error");
      return;
    }
    var q = f.pendingQuestion;
    if (!q) return;
    f.answers[q] = ans;
    f.currentIndex += 1;
    delete f.pendingQuestion;
    if (f.currentIndex < f.requested) {
      requestNextClarifyingQuestion();
    } else {
      finalizeScriptGeneration({
        displayName: f.displayName,
        cat: f.cat,
        q1: f.q1,
        q2: f.q2,
        tone: f.tone,
        length: f.length,
        perspective: f.perspective,
        useNameInScript: f.useNameInScript,
        clarifyingAnswers: f.answers,
      });
    }
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
    if (homeFlowStep === "clarify" && homeClarifyFlow) {
      generationMessage("", "");
      var cf = homeClarifyFlow;
      var pq = cf.pendingQuestion || "";
      el.innerHTML =
        '<div class="app-card app-glass-card" style="margin:0;padding:0.95rem 0.9rem;">' +
        '  <p class="app-muted" style="margin:0 0 0.5rem;">Clarifying question ' +
        escapeHtml(String(cf.currentIndex + 1)) +
        " of " +
        escapeHtml(String(cf.requested)) +
        "</p>" +
        '  <p style="margin:0 0 0.65rem;font-weight:600;">' +
        escapeHtml(pq) +
        "</p>" +
        '  <div class="gen-clarify-field">' +
        '    <label for="clarify-answer">Your answer</label>' +
        '    <textarea id="clarify-answer" class="gen-survey-textarea gen-clarify-textarea" required rows="5" placeholder="Share what feels true for you…"></textarea>' +
        "  </div>" +
        '  <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.85rem;">' +
        '    <button type="button" class="app-btn app-btn-secondary" id="clarify-cancel">Back</button>' +
        '    <button type="button" class="app-btn app-btn-primary" id="clarify-continue">' +
        (cf.currentIndex + 1 < cf.requested ? "Next" : "Generate") +
        "</button>" +
        "  </div>" +
        "</div>";
      var cont = document.getElementById("clarify-continue");
      if (cont) {
        cont.addEventListener("click", function () {
          submitClarifyAnswerAndContinue();
        });
      }
      var cancelCl = document.getElementById("clarify-cancel");
      if (cancelCl) {
        cancelCl.addEventListener("click", function () {
          var snap = homeClarifyFlow;
          homeClarifyFlow = null;
          generationMessage("", "");
          setHomeFlowStep("survey", displayName);
          if (snap) {
            setTimeout(function () {
              var e1 = document.getElementById("gen-q1");
              var e2 = document.getElementById("gen-q2");
              if (e1) e1.value = snap.q1 || "";
              if (e2) e2.value = snap.q2 || "";
              var toneE = document.getElementById("gen-tone");
              if (toneE && snap.tone) toneE.value = snap.tone;
              var lenWant = snap.length || "Medium";
              document.querySelectorAll('input[name="gen-length"]').forEach(function (r) {
                r.checked = r.value === lenWant;
              });
              var persWant = snap.perspective || "First person";
              document.querySelectorAll('input[name="gen-perspective"]').forEach(function (r) {
                r.checked = r.value === persWant;
              });
              var useE = document.getElementById("gen-use-name");
              if (useE) useE.checked = !!snap.useNameInScript;
              setClarifyStepperValue(snap.requested != null ? snap.requested : 0);
              wireGenLengthHint();
              wirePerspectiveUseNameRow();
            }, 0);
          }
        });
      }
      return;
    }
    homeClarifyFlow = null;
    var tierNow = resolvedSubscriptionTier();
    var maxClar = maxClarifyForWebTier(tierNow);
    var clarifyHint =
      maxClar > 0
        ? "Starter and Creator: up to " +
          maxClar +
          " follow-up questions (same idea as the iOS app), then your script is generated."
        : "Clarifying questions are available on Starter and Creator. You can still generate from your answers below.";
    var ph0 = surveyAnswerPlaceholder();
    var ph1 = surveyAnswerPlaceholder();
    el.innerHTML =
      '<form id="generate-form" class="app-form" style="margin:0;">' +
      '  <p class="app-muted" style="margin:0 0 0.45rem;">Category: <strong>' +
      escapeHtml(cat.name) +
      "</strong></p>" +
      '  <label id="gen-q1-label" for="gen-q1" style="margin-top:0.2rem;">' +
      escapeHtml(cat.questions[0] || "Question 1") +
      "</label>" +
      surveyIamHelpDetailsHtml(cat.id, 0) +
      '  <textarea id="gen-q1" class="gen-survey-textarea" required rows="6" placeholder="' +
      escapeHtml(ph0) +
      '"></textarea>' +
      '  <label id="gen-q2-label" for="gen-q2" style="margin-top:0.75rem;">' +
      escapeHtml(cat.questions[1] || "Question 2") +
      "</label>" +
      surveyIamHelpDetailsHtml(cat.id, 1) +
      '  <textarea id="gen-q2" class="gen-survey-textarea" required rows="6" placeholder="' +
      escapeHtml(ph1) +
      '"></textarea>' +
      '  <label for="gen-tone" style="margin-top:0.85rem;">Tone</label>' +
      '  <select id="gen-tone" class="app-btn" style="width:100%;text-align:left;">' +
      '    <option value="Calming">Calming</option>' +
      '    <option value="Motivational">Motivational</option>' +
      '    <option value="Compassionate">Compassionate</option>' +
      '    <option value="Assertive">Assertive</option>' +
      "  </select>" +
      '  <p class="gen-field-label" style="margin-top:0.85rem;">Length</p>' +
      '  <div class="gen-pill-row" role="radiogroup" aria-label="Script length">' +
      '    <span class="gen-pill-item">' +
      '      <input type="radio" name="gen-length" id="gen-length-short" value="Short" class="gen-pill-input" />' +
      '      <label for="gen-length-short" class="gen-pill-label">Short</label>' +
      "    </span>" +
      '    <span class="gen-pill-item">' +
      '      <input type="radio" name="gen-length" id="gen-length-medium" value="Medium" class="gen-pill-input" checked />' +
      '      <label for="gen-length-medium" class="gen-pill-label">Medium</label>' +
      "    </span>" +
      '    <span class="gen-pill-item">' +
      '      <input type="radio" name="gen-length" id="gen-length-long" value="Long" class="gen-pill-input" />' +
      '      <label for="gen-length-long" class="gen-pill-label">Long</label>' +
      "    </span>" +
      "  </div>" +
      '  <p id="gen-length-hint" class="gen-pill-hint app-muted"></p>' +
      '  <p class="gen-field-label" style="margin-top:0.75rem;">Perspective</p>' +
      '  <div class="gen-pill-row" role="radiogroup" aria-label="Narration perspective">' +
      '    <span class="gen-pill-item">' +
      '      <input type="radio" name="gen-perspective" id="gen-perspective-first" value="First person" class="gen-pill-input" checked />' +
      '      <label for="gen-perspective-first" class="gen-pill-label">First person</label>' +
      "    </span>" +
      '    <span class="gen-pill-item">' +
      '      <input type="radio" name="gen-perspective" id="gen-perspective-third" value="Third person" class="gen-pill-input" />' +
      '      <label for="gen-perspective-third" class="gen-pill-label">Third person</label>' +
      "    </span>" +
      "  </div>" +
      '  <div id="gen-use-name-row" style="margin-top:0.55rem;">' +
      '    <label class="account-pref-row"><input type="checkbox" id="gen-use-name" checked /> Use my name in the script (third person)</label>' +
      "  </div>" +
      '  <p class="gen-field-label" style="margin-top:0.85rem;">Clarifying questions</p>' +
      (maxClar > 0
        ? '  <div class="gen-stepper-row">' +
          '    <button type="button" class="app-btn gen-stepper-btn" id="gen-clarify-minus" aria-label="Fewer questions">−</button>' +
          '    <span id="gen-clarify-display" class="gen-stepper-value" aria-live="polite">0</span>' +
          '    <button type="button" class="app-btn gen-stepper-btn" id="gen-clarify-plus" aria-label="More questions">+</button>' +
          '    <input type="hidden" id="gen-clarify-count" value="0" />' +
          "  </div>"
        : '  <div class="gen-stepper-row gen-stepper-locked"><span id="gen-clarify-display" class="app-muted">0</span></div>' +
          '  <input type="hidden" id="gen-clarify-count" value="0" />') +
      '  <p class="gen-pill-hint app-muted" style="margin-top:0.35rem;">' +
      escapeHtml(clarifyHint) +
      "</p>" +
      '  <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.9rem;">' +
      '    <button type="button" class="app-btn app-btn-secondary" id="home-back-category">Back to Categories</button>' +
      '    <button type="submit" class="app-btn app-btn-primary" id="gen-submit-primary">Generate</button>' +
      "  </div>" +
      "</form>";
    wirePerspectiveUseNameRow();
    wireGenLengthHint();
    wireClarifyStepper();
    if (cat.id === "sports-performance") {
      var tonePick = document.getElementById("gen-tone");
      if (tonePick) tonePick.value = "Motivational";
    }
    var form = document.getElementById("generate-form");
    if (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        beginScriptGenerationFromForm(displayName || "");
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
    renderAccountInsights();
  }

  function effectiveVoiceIdForScript(script) {
    var v = script && script.voiceID ? String(script.voiceID).trim() : "";
    if (!v || v === "default") return (selectedVoiceId || "").trim();
    return v;
  }

  function effectiveBackgroundIdForScript(script) {
    var b = script && script.backgroundID ? String(script.backgroundID).trim() : "";
    if (!b) return (selectedBackgroundId || "").trim();
    return b;
  }

  function scriptDigestSourceFromScript(script) {
    return {
      text: (script && script.text) || "",
      voiceID: effectiveVoiceIdForScript(script),
      backgroundID: effectiveBackgroundIdForScript(script),
    };
  }

  function fallbackHashHex(raw) {
    var h = 5381;
    for (var i = 0; i < raw.length; i++) {
      h = ((h << 5) + h + raw.charCodeAt(i)) | 0;
    }
    return ("0000000" + (h >>> 0).toString(16)).slice(-8);
  }

  function scriptContentSha256Hex(digestSource) {
    var raw =
      String(digestSource.text || "") +
      "|" +
      String(digestSource.voiceID || "") +
      "|" +
      String(digestSource.backgroundID || "");
    if (!window.crypto || !window.crypto.subtle) {
      return Promise.resolve(fallbackHashHex(raw));
    }
    var enc = new TextEncoder();
    return crypto.subtle.digest("SHA-256", enc.encode(raw)).then(function (buf) {
      return Array.from(new Uint8Array(buf))
        .map(function (b) {
          return b.toString(16).padStart(2, "0");
        })
        .join("");
    });
  }

  function getStoredGeneratedHash(scriptId) {
    try {
      return localStorage.getItem(GENERATED_HASH_STORAGE_PREFIX + scriptId) || "";
    } catch (_e) {
      return "";
    }
  }

  function setStoredGeneratedHash(scriptId, hex) {
    try {
      if (!scriptId || !hex) return;
      localStorage.setItem(GENERATED_HASH_STORAGE_PREFIX + scriptId, hex);
    } catch (_e) {}
  }

  function shouldEnableGenerateFromHash(script, contentHashHex) {
    var hasAudio = !!(script.audioURL && String(script.audioURL).trim());
    if (!hasAudio) return true;
    var stored = getStoredGeneratedHash(script.id);
    if (!stored) return true;
    return stored !== contentHashHex;
  }

  function getStoredGeneratedHashPremade(premadeId) {
    try {
      return localStorage.getItem(GENERATED_PREMADE_HASH_PREFIX + premadeId) || "";
    } catch (_e) {
      return "";
    }
  }

  function setStoredGeneratedHashPremade(premadeId, hex) {
    try {
      if (!premadeId || !hex) return;
      localStorage.setItem(GENERATED_PREMADE_HASH_PREFIX + premadeId, hex);
    } catch (_e) {}
  }

  function premadeDigestSourceFromPremade(premade) {
    return {
      text: (premade && premade.scriptText) || "",
      voiceID: String(resolvePremadeVoiceSelection(premade) || "").trim(),
      backgroundID: String(resolvePremadeBackgroundSelection(premade) || "").trim(),
    };
  }

  function shouldEnableGeneratePremadeFromHash(premade, contentHashHex) {
    var hasAudio = !!(premade.audioURL && String(premade.audioURL).trim());
    if (!hasAudio) return true;
    var stored = getStoredGeneratedHashPremade(premade.id);
    if (!stored) return true;
    return stored !== contentHashHex;
  }

  function controlsStorageKey(scriptId) {
    return CARD_AUDIO_EXPAND_STORAGE_PREFIX + scriptId;
  }

  function controlsExpandedForScript(scriptId) {
    if (expandedScriptAudioControlsById[scriptId] === true) return true;
    if (expandedScriptAudioControlsById[scriptId] === false) return false;
    try {
      var v = localStorage.getItem(controlsStorageKey(scriptId));
      if (v === "0") return false;
      if (v === "1") return true;
    } catch (_e) {}
    return true;
  }

  function setScriptControlsExpanded(scriptId, expanded) {
    expandedScriptAudioControlsById[scriptId] = expanded;
    try {
      localStorage.setItem(controlsStorageKey(scriptId), expanded ? "1" : "0");
    } catch (_e) {}
  }

  function toggleScriptControlsExpanded(scriptId) {
    setScriptControlsExpanded(scriptId, !controlsExpandedForScript(scriptId));
    renderScripts(currentScripts);
  }

  function allScriptsAudioControlsExpanded(ids) {
    if (!ids.length) return true;
    return ids.every(function (id) {
      return controlsExpandedForScript(id);
    });
  }

  function toggleExpandAllLibraryAudioControls() {
    var ids = currentScripts.map(function (s) {
      return s.id;
    });
    var next = !allScriptsAudioControlsExpanded(ids);
    ids.forEach(function (id) {
      setScriptControlsExpanded(id, next);
    });
    renderScripts(currentScripts);
  }

  function updateLibraryExpandAllToggleUi() {
    var btn = document.getElementById("library-expand-all-toggle");
    if (!btn) return;
    var ids = currentScripts.map(function (s) {
      return s.id;
    });
    if (!ids.length) {
      btn.disabled = true;
      btn.textContent = "▼";
      btn.setAttribute("aria-expanded", "true");
      return;
    }
    btn.disabled = false;
    var allExp = allScriptsAudioControlsExpanded(ids);
    btn.textContent = allExp ? "▲" : "▼";
    btn.setAttribute("aria-expanded", allExp ? "true" : "false");
  }

  function premadeCardAudioControlsStorageKey(premadeId) {
    return PREMADE_CARD_AUDIO_EXPAND_STORAGE_PREFIX + premadeId;
  }

  function controlsExpandedForPremade(premadeId) {
    if (expandedPremadeAudioControlsById[premadeId] === true) return true;
    if (expandedPremadeAudioControlsById[premadeId] === false) return false;
    try {
      var v = localStorage.getItem(premadeCardAudioControlsStorageKey(premadeId));
      if (v === "0") return false;
      if (v === "1") return true;
    } catch (_e) {}
    return true;
  }

  function setPremadeCardAudioControlsExpanded(premadeId, expanded) {
    expandedPremadeAudioControlsById[premadeId] = expanded;
    try {
      localStorage.setItem(premadeCardAudioControlsStorageKey(premadeId), expanded ? "1" : "0");
    } catch (_e) {}
  }

  function togglePremadeCardAudioControls(premadeId) {
    setPremadeCardAudioControlsExpanded(premadeId, !controlsExpandedForPremade(premadeId));
    renderPremade();
  }

  function allPremadeAudioControlsExpanded(ids) {
    if (!ids.length) return true;
    return ids.every(function (id) {
      return controlsExpandedForPremade(id);
    });
  }

  function toggleExpandAllPremadeAudioControls() {
    var ids = currentPremade.map(function (p) {
      return p.id;
    });
    var next = !allPremadeAudioControlsExpanded(ids);
    ids.forEach(function (id) {
      setPremadeCardAudioControlsExpanded(id, next);
    });
    renderPremade();
  }

  function updatePremadeExpandAllToggleUi() {
    var btn = document.getElementById("premade-expand-all-audio");
    if (!btn) return;
    if (!currentPremade.length) {
      btn.disabled = true;
      btn.textContent = "▼";
      btn.setAttribute("aria-expanded", "true");
      return;
    }
    btn.disabled = false;
    var ids = currentPremade.map(function (p) {
      return p.id;
    });
    var allExp = allPremadeAudioControlsExpanded(ids);
    btn.textContent = allExp ? "▲" : "▼";
    btn.setAttribute("aria-expanded", allExp ? "true" : "false");
  }

  function premadeSectionStorageKey(categoryId) {
    return PREMADE_SECTION_EXPAND_STORAGE_PREFIX + categoryId;
  }

  function premadeSectionExpandedFor(categoryId) {
    if (expandedPremadeSectionById[categoryId] === true) return true;
    if (expandedPremadeSectionById[categoryId] === false) return false;
    try {
      var v = localStorage.getItem(premadeSectionStorageKey(categoryId));
      if (v === "0") return false;
      if (v === "1") return true;
    } catch (_e) {}
    return true;
  }

  function setPremadeSectionExpanded(categoryId, expanded) {
    expandedPremadeSectionById[categoryId] = expanded;
    try {
      localStorage.setItem(premadeSectionStorageKey(categoryId), expanded ? "1" : "0");
    } catch (_e) {}
  }

  function groupPremadesByLibraryCategory(premades) {
    var byId = {};
    PREMADE_LIBRARY_CATEGORY_ORDER.forEach(function (c) {
      byId[c.id] = [];
    });
    var other = [];
    premades.forEach(function (p) {
      var cid = (p.categoryID || "").trim();
      if (byId[cid]) byId[cid].push(p);
      else other.push(p);
    });
    function sortByCreated(a, b) {
      var at = a.createdAt && typeof a.createdAt.toMillis === "function" ? a.createdAt.toMillis() : 0;
      var bt = b.createdAt && typeof b.createdAt.toMillis === "function" ? b.createdAt.toMillis() : 0;
      return bt - at;
    }
    PREMADE_LIBRARY_CATEGORY_ORDER.forEach(function (c) {
      byId[c.id].sort(sortByCreated);
    });
    other.sort(sortByCreated);
    return { byId: byId, other: other };
  }

  function flatPremadesForHashOrder(grouped) {
    var flat = [];
    PREMADE_LIBRARY_CATEGORY_ORDER.forEach(function (c) {
      (grouped.byId[c.id] || []).forEach(function (p) {
        flat.push(p);
      });
    });
    grouped.other.forEach(function (p) {
      flat.push(p);
    });
    return flat;
  }

  function premadeLibraryCategoryDisplayName(categoryID) {
    var row = PREMADE_LIBRARY_CATEGORY_ORDER.find(function (c) {
      return c.id === categoryID;
    });
    return (row && row.name) || categoryID || "Other";
  }

  function premadeCategorySectionHtml(categoryId, categoryName, items, hashMap) {
    var sectionOpen = premadeSectionExpandedFor(categoryId);
    var chevChar = sectionOpen ? "▲" : "▼";
    var cardsHtml = items
      .map(function (p) {
        return premadeCardHtml(p, hashMap[p.id] || "");
      })
      .join("");
    return (
      '<section class="premade-category-block" data-premade-category-block="' +
      escapeHtml(categoryId) +
      '">' +
      '  <div class="premade-category-header">' +
      '    <h3 class="premade-category-title">' +
      escapeHtml(categoryName) +
      "</h3>" +
      '    <span class="app-muted premade-category-count">' +
      String(items.length) +
      "</span>" +
      '    <button type="button" class="library-card-chevron premade-category-chevron" data-premade-category-toggle="' +
      escapeHtml(categoryId) +
      '" aria-expanded="' +
      (sectionOpen ? "true" : "false") +
      '" title="' +
      (sectionOpen ? "Collapse category" : "Expand category") +
      '">' +
      chevChar +
      "</button>" +
      "  </div>" +
      '  <div class="premade-category-body"' +
      (sectionOpen ? "" : " hidden") +
      ">" +
      (items.length
        ? cardsHtml
        : '<p class="app-muted premade-category-empty">No premade in this category yet.</p>') +
      "  </div>" +
      "</section>"
    );
  }

  function bindPremadeCategoryActions() {
    var list = document.getElementById("premade-list");
    if (!list) return;
    list.querySelectorAll("[data-premade-category-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var cid = btn.getAttribute("data-premade-category-toggle");
        if (!cid) return;
        setPremadeSectionExpanded(cid, !premadeSectionExpandedFor(cid));
        renderPremade();
      });
    });
  }

  function setScriptBusy(scriptId, busy) {
    generatingAudioByScriptId[scriptId] = busy;
    renderScripts(currentScripts);
  }

  function isScriptBusy(scriptId) {
    return generatingAudioByScriptId[scriptId] === true;
  }

  function premadeBusyKey(premadeId) {
    return "__premade_busy__" + premadeId;
  }

  function setPremadeBusy(premadeId, busy) {
    if (busy) generatingAudioByScriptId[premadeBusyKey(premadeId)] = true;
    else delete generatingAudioByScriptId[premadeBusyKey(premadeId)];
    renderPremade();
  }

  function isPremadeBusy(premadeId) {
    return generatingAudioByScriptId[premadeBusyKey(premadeId)] === true;
  }

  function scriptCardHtml(script, contentHashHex) {
    var plainText = script.text && script.text.trim() ? script.text : "(No text yet)";
    var isExpanded = expandedScriptTextById[script.id] === true;
    var isBusy = isScriptBusy(script.id);
    var hasAudio = !!(script.audioURL && String(script.audioURL).trim());
    var playingThis = activeAudioScriptId === script.id && activeAudio && !activeAudio.paused;
    var scriptVoiceID = effectiveVoiceIdForScript(script);
    var scriptBackgroundID = effectiveBackgroundIdForScript(script);
    var controlsExpanded = controlsExpandedForScript(script.id);
    var genEnabled = shouldEnableGenerateFromHash(script, contentHashHex);
    var genLabel = isBusy ? "Generating audio..." : hasAudio ? "Regenerate" : "Generate";
    var genClasses = "app-btn";
    if (isBusy) {
      genClasses += " app-btn-secondary";
    } else if (!genEnabled) {
      genClasses += " app-btn-secondary app-btn-generate-muted";
    } else if (hasAudio) {
      genClasses += " app-btn-generate-warn";
    } else {
      genClasses += " app-btn-generate-fresh";
    }
    var genDisabled = isBusy || !genEnabled;
    var chevChar = controlsExpanded ? "▲" : "▼";
    var audioSection = controlsExpanded
      ? '<div class="script-card-audio-section">' +
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
        '  <button type="button" class="' +
        genClasses +
        '" data-action="generate-audio" data-script-id="' +
        escapeHtml(script.id) +
        '"' +
        (genDisabled ? " disabled" : "") +
        ">" +
        genLabel +
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
        "</div>"
      : "";
    return (
      '<article class="app-card" data-script-id="' +
      escapeHtml(script.id) +
      '">' +
      '<div class="app-card-header-row">' +
      "<h3>" +
      escapeHtml(script.title || "Untitled Script") +
      "</h3>" +
      '  <button type="button" class="library-card-chevron" data-action="toggle-controls" data-script-id="' +
      escapeHtml(script.id) +
      '" aria-expanded="' +
      (controlsExpanded ? "true" : "false") +
      '" title="' +
      (controlsExpanded ? "Collapse audio controls" : "Expand audio controls") +
      '">' +
      chevChar +
      "</button>" +
      "</div>" +
      '<div class="app-card-meta-row">' +
      '<div class="app-card-meta">Created: ' +
      escapeHtml(formatDate(script.createdAt)) +
      "</div>" +
      '<span class="app-chip">My Library</span>' +
      "</div>" +
      (isExpanded ? '<p class="app-card-text">' + escapeHtml(plainText) + "</p>" : "") +
      audioSection +
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
        } else if (action === "toggle-controls") {
          toggleScriptControlsExpanded(script.id);
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

    function optionRowHtml(opt, selected, includeBgPreview) {
      var isBgPreview = includeBgPreview && isBackgroundPreviewing(opt.id);
      var mainBtn =
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
        "</button>";
      if (includeBgPreview && opt.file) {
        return (
          '<div class="app-picker-option-row">' +
          mainBtn +
          '<button type="button" class="app-btn app-btn-ghost app-picker-preview-btn" data-preview-background="' +
          escapeHtml(opt.id) +
          '" aria-label="Preview background">' +
          (isBgPreview ? "Stop" : "Preview") +
          "</button>" +
          "</div>"
        );
      }
      return mainBtn;
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
            return optionRowHtml(opt, opt.id === selectedID, !isVoice);
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
      list.querySelectorAll("[data-preview-background]").forEach(function (pv) {
        pv.addEventListener("click", function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          var bid = pv.getAttribute("data-preview-background");
          previewBackgroundById(bid, function (msg) {
            setMediaPickerMessage(msg, "error");
          }).then(function () {
            renderPickerOptions(searchInput.value || "");
          });
        });
      });
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
    stopBackgroundPreview();
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
        '<div class="app-empty-hint">No scripts yet. Use <strong>New</strong> or <strong>Import Audio</strong> in the toolbar, or use the <strong>Home</strong> tab flow to generate a personalized mental script and auto-save it here.</div>';
      updateLibraryExpandAllToggleUi();
      return;
    }
    var gen = ++scriptsRenderGeneration;
    var nextExpanded = {};
    scripts.forEach(function (s) {
      if (expandedScriptTextById[s.id] === true) nextExpanded[s.id] = true;
    });
    expandedScriptTextById = nextExpanded;
    Promise.all(
      scripts.map(function (s) {
        return scriptContentSha256Hex(scriptDigestSourceFromScript(s));
      })
    ).then(function (hashes) {
      if (gen !== scriptsRenderGeneration) return;
      list.innerHTML = scripts
        .map(function (s, i) {
          return scriptCardHtml(s, hashes[i]);
        })
        .join("");
      bindScriptCardActions(scripts);
      updateLibraryExpandAllToggleUi();
    });
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
      activePlaylistLoopForQueue = false;
      clearPlaylistTimer();
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
      if (activePlaylistLoopForQueue && activePlaylistQueue.length && index >= activePlaylistQueue.length) {
        playQueueAt(0);
        return;
      }
      stopActiveAudio();
      renderSelectedPlaylistDetail();
      renderScripts(currentScripts);
      return;
    }
    var script = activePlaylistQueue[index];
    var audioURL = script.audioURL && String(script.audioURL).trim();
    if (!audioURL) {
      var nextIx = index + 1;
      if (nextIx >= activePlaylistQueue.length && activePlaylistLoopForQueue) {
        nextIx = 0;
      }
      playQueueAt(nextIx);
      return;
    }
    stopActiveAudio(false);
    activePlaylistIndex = index;
    activeAudioScriptId = script.id;
    activeAudio = new Audio(audioURL);
    activeAudioTitle = script.title || "Playlist audio";
    bindAudioLifecycle(function () {
      var next = activePlaylistIndex + 1;
      if (next >= activePlaylistQueue.length) {
        if (activePlaylistLoopForQueue && activePlaylistQueue.length) {
          playQueueAt(0);
        } else {
          stopActiveAudio();
          renderSelectedPlaylistDetail();
          renderScripts(currentScripts);
        }
      } else {
        playQueueAt(next);
      }
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

  function startPlaylistPlayback(playlist, startScriptId) {
    var scripts = resolvePlaylistScripts(playlist).filter(function (s) {
      return !!(s.audioURL && String(s.audioURL).trim());
    });
    if (!scripts.length) {
      setPlaylistsMessage("No playable audio in this playlist yet.", "error");
      return;
    }
    var ordered = scripts.slice();
    if (!!playlist.shuffle) {
      shuffleInPlace(ordered);
    }
    var start = 0;
    if (startScriptId) {
      var ix = ordered.findIndex(function (s) {
        return s.id === startScriptId;
      });
      if (ix >= 0) start = ix;
    }
    activePlaylistLoopForQueue = !!playlist.loop;
    activePlaylistQueue = ordered;
    playQueueAt(start);
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
    scriptContentSha256Hex(scriptDigestSourceFromScript(script)).then(function (hex) {
      if (!shouldEnableGenerateFromHash(script, hex)) {
        setMessage("Audio already matches this script, voice, and background.", "");
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
            voiceID: effectiveVoiceIdForScript(script),
            backgroundID: effectiveBackgroundIdForScript(script),
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
          return waitForAudioJob(script, ctx.jobId, effectiveBackgroundIdForScript(script));
        })
        .then(function (result) {
          var vId = effectiveVoiceIdForScript(script);
          var bId = effectiveBackgroundIdForScript(script);
          var digestSource = {
            text: (script && script.text) || "",
            voiceID: vId,
            backgroundID: bId,
          };
          return scriptContentSha256Hex(digestSource).then(function (digest) {
            return scriptCollection(currentUser.uid)
              .doc(script.id)
              .set(
                {
                  audioURL: result.audioURL,
                  audioCreatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                  updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                  voiceID: vId,
                  backgroundID: bId,
                },
                { merge: true }
              )
              .then(function () {
                setStoredGeneratedHash(script.id, digest);
                setMessage('Audio generated for "' + script.title + '".', "success");
              });
          });
        })
        .catch(function (e) {
          setMessage(e.message || "Audio generation failed.", "error");
        })
        .finally(function () {
          setScriptBusy(script.id, false);
        });
    }).catch(function (e) {
      setMessage((e && e.message) || "Could not verify script state.", "error");
    });
  }

  function importScriptAudioFromFile(file) {
    if (!currentUser || !file) return;
    if (typeof firebase.storage !== "function") {
      setMessage("Firebase Storage is not loaded. Refresh the page and try again.", "error");
      return;
    }
    var uid = currentUser.uid;
    var baseTitle = (file.name || "").replace(/\.[^/.]+$/, "").trim() || "Imported audio";
    var safe = (file.name || "audio").replace(/[^\w.\-]+/g, "_").slice(0, 80);
    if (!safe) safe = "import";
    var path = "users/" + uid + "/audios/web-import-" + Date.now() + "-" + safe;
    setMessage("Uploading imported audio...", "");
    var ref = firebase.storage().ref(path);
    ref
      .put(file, { contentType: file.type || "audio/mpeg" })
      .then(function (snap) {
        return snap.ref.getDownloadURL();
      })
      .then(function (url) {
        var vId = (selectedVoiceId || "").trim();
        var bId = (selectedBackgroundId || "").trim() || "bg-none";
        var docRef = scriptCollection(uid).doc();
        var newScript = {
          title: baseTitle.slice(0, 120),
          text: "",
          createdAt: firebase.firestore.Timestamp.now(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          audioURL: url,
          voiceID: vId,
          backgroundID: bId,
          audioCreatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          categoryID: "",
        };
        return docRef.set(newScript).then(function () {
          return scriptContentSha256Hex({
            text: "",
            voiceID: vId,
            backgroundID: bId,
          }).then(function (digest) {
            setStoredGeneratedHash(docRef.id, digest);
            setMessage('Imported "' + newScript.title + '" to My Library.', "success");
            closeLibraryCreateMenu();
          });
        });
      })
      .catch(function (e) {
        setMessage(e.message || "Could not import audio file.", "error");
      });
  }

  function deleteTempPremadeJobScript(jobScriptId) {
    if (!currentUser || !jobScriptId) return Promise.resolve();
    return scriptCollection(currentUser.uid)
      .doc(jobScriptId)
      .delete()
      .catch(function () {});
  }

  function generateAudioForPremade(premade) {
    if (!currentUser || !premade) return;
    var text = (premade.scriptText || "").trim();
    if (!text) {
      setPremadeMessage("This premade has no script text to synthesize.", "error");
      return;
    }
    var jobScriptId = premadeJobScriptId(premade);
    scriptContentSha256Hex(premadeDigestSourceFromPremade(premade)).then(function (hex) {
      if (!shouldEnableGeneratePremadeFromHash(premade, hex)) {
        setPremadeMessage("Audio already matches this script text, voice, and background.", "");
        return;
      }
      setPremadeBusy(premade.id, true);
      setPremadeMessage('Submitting audio job for "' + (premade.title || "Premade") + '"...', "");

      currentUser
        .getIdToken(true)
        .then(function (token) {
          var payload = {
            scriptId: jobScriptId,
            text: text,
            scriptTitle: premade.title || "Premade",
            voiceID: resolvePremadeVoiceSelection(premade),
            backgroundID: resolvePremadeBackgroundSelection(premade) || "",
            createdAt:
              premade.createdAt && typeof premade.createdAt.toMillis === "function"
                ? premade.createdAt.toMillis() / 1000
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
          return waitForAudioJob(
            { id: jobScriptId, title: premade.title },
            ctx.jobId,
            String(resolvePremadeBackgroundSelection(premade) || "").trim()
          );
        })
        .then(function (result) {
          var vId = String(resolvePremadeVoiceSelection(premade) || "").trim();
          var bId = String(resolvePremadeBackgroundSelection(premade) || "").trim();
          var digestSource = {
            text: premade.scriptText || "",
            voiceID: vId,
            backgroundID: bId,
          };
          return scriptContentSha256Hex(digestSource).then(function (digest) {
            return premadeCollection()
              .doc(premade.id)
              .set(
                {
                  audioURL: result.audioURL,
                  updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
              )
              .then(function () {
                setStoredGeneratedHashPremade(premade.id, digest);
                return deleteTempPremadeJobScript(jobScriptId);
              })
              .then(function () {
                setPremadeMessage('Audio generated for "' + (premade.title || "Premade") + '".', "success");
              });
          });
        })
        .catch(function (e) {
          setPremadeMessage(e.message || "Audio generation failed.", "error");
        })
        .finally(function () {
          setPremadeBusy(premade.id, false);
        });
    }).catch(function (e) {
      setPremadeMessage((e && e.message) || "Could not verify premade state.", "error");
    });
  }

  function waitForAudioJob(script, jobId, backgroundIdForMix) {
    return new Promise(function (resolve, reject) {
      var mixStarted = false;
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
              if (mixStarted) return;
              mixStarted = true;
              var ttsUrl = data.ttsDownloadURL;
              if (!ttsUrl) {
                cleanup();
                reject(new Error("Missing TTS download URL for background mix."));
                return;
              }
              var bgMix = (backgroundIdForMix && String(backgroundIdForMix).trim()) || "";
              if (!bgMix || bgMix === "bg-none") {
                cleanup();
                reject(new Error("Background mix was requested but no background is selected."));
                return;
              }
              finalizeAwaitingClientMix(currentUser.uid, script.id, ttsUrl, bgMix)
                .then(function (url) {
                  return db
                    .collection("users")
                    .doc(currentUser.uid)
                    .collection("audioJobs")
                    .doc(jobId)
                    .set(
                      {
                        status: "completed",
                        finalDownloadURL: url,
                        persistentAudioURL: url,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                      },
                      { merge: true }
                    )
                    .then(function () {
                      return url;
                    });
                })
                .then(function (url) {
                  cleanup();
                  resolve({ audioURL: url });
                })
                .catch(function (e) {
                  cleanup();
                  reject(e instanceof Error ? e : new Error(String(e)));
                });
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

  function shuffleInPlace(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function clearPlaylistTimer() {
    if (playlistTimerIntervalId) {
      clearInterval(playlistTimerIntervalId);
      playlistTimerIntervalId = null;
    }
    playlistTimerDeadlineMs = 0;
    playlistTimerPlaylistId = null;
    updatePlaylistTimerBadge();
  }

  function formatTimerRemainingShort() {
    if (!playlistTimerDeadlineMs) return "";
    var ms = playlistTimerDeadlineMs - Date.now();
    if (ms <= 0) return "0:00";
    var sec = Math.floor(ms / 1000);
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    if (h > 0) {
      return h + ":" + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
    }
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function playlistNameForTimer() {
    if (!playlistTimerPlaylistId) return "Playlist";
    var p = currentPlaylists.find(function (x) {
      return x.id === playlistTimerPlaylistId;
    });
    return (p && p.name) || "Playlist";
  }

  function updatePlaylistTimerBadge() {
    var wrap = document.getElementById("app-playlist-timer-wrap");
    var lab = document.getElementById("app-playlist-timer-label");
    var active =
      !!playlistTimerDeadlineMs &&
      Date.now() < playlistTimerDeadlineMs &&
      !!playlistTimerPlaylistId;
    if (wrap && lab) {
      if (!active) {
        wrap.hidden = true;
        lab.textContent = "";
      } else {
        wrap.hidden = false;
        lab.textContent = playlistNameForTimer() + " · " + formatTimerRemainingShort();
      }
    }
  }

  function beginPlaylistTimer(playlistId, totalSeconds) {
    clearPlaylistTimer();
    if (!totalSeconds || totalSeconds <= 0) return;
    playlistTimerDeadlineMs = Date.now() + totalSeconds * 1000;
    playlistTimerPlaylistId = playlistId;
    playlistTimerIntervalId = setInterval(function () {
      updatePlaylistTimerBadge();
      if (Date.now() >= playlistTimerDeadlineMs) {
        clearPlaylistTimer();
        stopActiveAudio();
        setPlaylistsMessage("Playlist timer ended — playback stopped.", "success");
        renderSelectedPlaylistDetail();
        renderPlaylists(currentPlaylists);
      }
    }, 500);
    updatePlaylistTimerBadge();
  }

  function updatePlaylistSectionVisibility() {
    var listView = document.getElementById("playlists-list-view");
    var detailView = document.getElementById("playlists-detail-view");
    if (!listView || !detailView) return;
    var showDetail = !!playlistDetailVisible && !!selectedPlaylistId;
    listView.hidden = showDetail;
    detailView.hidden = !showDetail;
  }

  function openPlaylistDetailView(playlistId) {
    selectedPlaylistId = playlistId;
    playlistDetailVisible = true;
    updatePlaylistSectionVisibility();
    renderPlaylists(currentPlaylists);
    renderSelectedPlaylistDetail();
  }

  function closePlaylistDetailView() {
    playlistDetailVisible = false;
    updatePlaylistSectionVisibility();
    var h = document.getElementById("playlist-detail-heading");
    if (h) h.textContent = "Playlist";
    var el = document.getElementById("playlist-detail");
    if (el) el.innerHTML = "";
  }

  function persistPlaylistPlaybackField(playlistId, patch) {
    if (!currentUser || !playlistId || !patch) return Promise.resolve();
    return playlistCollection(currentUser.uid)
      .doc(playlistId)
      .set(patch, { merge: true })
      .catch(function (e) {
        setPlaylistsMessage(e.message || "Could not save playlist.", "error");
      });
  }

  function removeScriptFromPlaylist(playlist, scriptId) {
    if (!currentUser || !playlist || !scriptId) return Promise.resolve();
    var ids = (playlist.scriptIDs || []).filter(function (x) {
      return x !== scriptId;
    });
    var items = ids.map(function (id) {
      return { type: "script", id: id };
    });
    return playlistCollection(currentUser.uid)
      .doc(playlist.id)
      .set(
        {
          scriptIDs: ids,
          items: items,
        },
        { merge: true }
      )
      .catch(function (e) {
        setPlaylistsMessage(e.message || "Could not remove track.", "error");
      });
  }

  function closePlaylistAddAudioModal() {
    var backdrop = document.getElementById("playlist-add-audio-backdrop");
    if (backdrop) backdrop.hidden = true;
  }

  function openPlaylistAddAudioModal() {
    var p = currentPlaylists.find(function (x) {
      return x.id === selectedPlaylistId;
    });
    if (!p) return;
    var list = document.getElementById("playlist-add-audio-list");
    var backdrop = document.getElementById("playlist-add-audio-backdrop");
    if (!list || !backdrop) return;
    var inPlaylist = {};
    (p.scriptIDs || []).forEach(function (id) {
      inPlaylist[id] = true;
    });
    var candidates = currentScripts.filter(function (s) {
      return !!(s.audioURL && String(s.audioURL).trim()) && !inPlaylist[s.id];
    });
    if (!candidates.length) {
      list.innerHTML =
        '<p class="app-muted">No more scripts with audio to add. Generate audio in My Library first.</p>';
    } else {
      list.innerHTML = candidates
        .map(function (s) {
          return (
            '<div class="app-modal-row">' +
            '  <div class="app-modal-row-name">' +
            escapeHtml(s.title || "Untitled") +
            "</div>" +
            '  <button type="button" class="app-btn" data-playlist-add-script="' +
            escapeHtml(s.id) +
            '">Add</button>' +
            "</div>"
          );
        })
        .join("");
      list.querySelectorAll("[data-playlist-add-script]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var sid = btn.getAttribute("data-playlist-add-script");
          var script = currentScripts.find(function (x) {
            return x.id === sid;
          });
          var pl = currentPlaylists.find(function (x) {
            return x.id === selectedPlaylistId;
          });
          if (!script || !pl) return;
          addScriptToPlaylist(script, pl).then(function () {
            closePlaylistAddAudioModal();
            setPlaylistsMessage('Added "' + (script.title || "Track") + '" to the playlist.', "success");
          });
        });
      });
    }
    backdrop.hidden = false;
  }

  function populatePlaylistTimerSelectsInit() {
    var h = document.getElementById("playlist-timer-hours");
    var m = document.getElementById("playlist-timer-minutes");
    if (!h || !m || h.options.length) return;
    var i;
    for (i = 0; i <= 8; i++) {
      h.appendChild(new Option(i === 0 ? "0 hours" : i + " hr", String(i)));
    }
    for (i = 0; i < 60; i++) {
      m.appendChild(new Option(i + " min", String(i)));
    }
  }

  function setPlaylistTimerModalMessage(text, kind) {
    var el = document.getElementById("playlist-timer-modal-msg");
    if (!el) return;
    el.className = "app-inline-msg" + (kind ? " " + kind : "");
    el.textContent = text || "";
  }

  function openPlaylistTimerModal() {
    var backdrop = document.getElementById("playlist-timer-backdrop");
    if (!backdrop) return;
    populatePlaylistTimerSelectsInit();
    setPlaylistTimerModalMessage("", "");
    backdrop.hidden = false;
  }

  function closePlaylistTimerModal() {
    var backdrop = document.getElementById("playlist-timer-backdrop");
    if (backdrop) backdrop.hidden = true;
  }

  function renderPlaylists(playlists) {
    var list = document.getElementById("playlists-list");
    if (!list) return;
    if (!playlists.length) {
      list.innerHTML =
        '<div class="app-empty-hint">No playlists yet. Tap <strong>+ New Playlist</strong>, then open a playlist to add audio, or add from <strong>My Library</strong> with <em>Add to Playlist</em>.</div>';
      updatePlaylistSectionVisibility();
      renderSelectedPlaylistDetail();
      return;
    }
    list.innerHTML = playlists
      .map(function (p) {
        var selected = p.id === selectedPlaylistId && playlistDetailVisible;
        return (
          '<article class="app-card playlist-card-tappable" tabindex="0" role="button" aria-label="Open playlist" data-playlist-card="' +
          escapeHtml(p.id) +
          '" style="' +
          (selected ? "border-color:#2563eb;" : "") +
          (selected ? "" : "cursor:pointer;") +
          '">' +
          "<h3>" +
          escapeHtml(p.name || "Untitled Playlist") +
          "</h3>" +
          '<div class="app-card-meta">' +
          (p.scriptIDs ? p.scriptIDs.length : 0) +
          " item(s)</div>" +
          '<div class="app-card-actions">' +
          '  <button type="button" class="app-btn app-btn-secondary" data-playlist-action="rename" data-playlist-id="' +
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

    list.querySelectorAll(".app-card-actions").forEach(function (row) {
      row.addEventListener("click", function (ev) {
        ev.stopPropagation();
      });
    });
    list.querySelectorAll("[data-playlist-card]").forEach(function (card) {
      card.addEventListener("click", function () {
        openPlaylistDetailView(card.getAttribute("data-playlist-card"));
      });
      card.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          openPlaylistDetailView(card.getAttribute("data-playlist-card"));
        }
      });
    });
    list.querySelectorAll("[data-playlist-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var action = btn.getAttribute("data-playlist-action");
        var pid = btn.getAttribute("data-playlist-id");
        var playlist = currentPlaylists.find(function (p) {
          return p.id === pid;
        });
        if (!playlist) return;
        if (action === "rename") {
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
    var heading = document.getElementById("playlist-detail-heading");
    var p = currentPlaylists.find(function (x) {
      return x.id === selectedPlaylistId;
    });
    if (!p || !playlistDetailVisible) {
      el.innerHTML = "";
      if (heading) heading.textContent = "Playlist";
      return;
    }
    if (heading) heading.textContent = p.name || "Playlist";
    var scripts = resolvePlaylistScripts(p);
    var idSet = {};
    (p.scriptIDs || []).forEach(function (id) {
      idSet[id] = true;
    });
    var isPlayingThisQueue =
      activePlaylistQueue.length > 0 &&
      activePlaylistQueue.every(function (s) {
        return !!idSet[s.id];
      });
    var loopOn = !!p.loop;
    var shuffleOn = !!p.shuffle;
    var mixOn = !!p.mixMode;
    el.innerHTML =
      '<article class="app-card playlist-detail-card">' +
      '<div class="playlist-detail-toggles">' +
      '<label class="playlist-toggle-row"><input type="checkbox" id="toggle-playlist-loop"' +
      (loopOn ? " checked" : "") +
      '> Loop all</label>' +
      '<label class="playlist-toggle-row"><input type="checkbox" id="toggle-playlist-shuffle"' +
      (shuffleOn ? " checked" : "") +
      '> Shuffle</label>' +
      '<label class="playlist-toggle-row"><input type="checkbox" id="toggle-playlist-mix"' +
      (mixOn ? " checked" : "") +
      '> Mix mode <span class="app-muted">(saved; simple queue on web)</span></label>' +
      "</div>" +
      '<div class="app-card-actions" style="margin-top:0.65rem;flex-wrap:wrap;">' +
      '  <button type="button" class="app-btn" id="btn-play-playlist">' +
      (isPlayingThisQueue ? "Restart playlist" : "Play playlist") +
      "</button>" +
      '  <button type="button" class="app-btn" id="btn-stop-playlist">Stop</button>' +
      '  <button type="button" class="app-btn app-btn-secondary" id="btn-playlist-add-audio">Add audio…</button>' +
      '  <button type="button" class="app-btn app-btn-secondary" id="btn-playlist-rename">Rename</button>' +
      "</div>" +
      '<div class="playlist-timer-row">' +
      '  <button type="button" class="app-btn app-btn-secondary" id="btn-playlist-timer">Timer…</button>' +
      '  <span class="app-muted" style="font-size:0.82rem;">Countdown appears in the top bar so you can switch tabs while listening.</span>' +
      "</div>" +
      (scripts.length
        ? '<ul class="playlist-track-list">' +
          scripts
            .map(function (s) {
              var hasAudio = !!(s.audioURL && String(s.audioURL).trim());
              var marker =
                isPlayingThisQueue &&
                activePlaylistQueue[activePlaylistIndex] &&
                activePlaylistQueue[activePlaylistIndex].id === s.id
                  ? ' <span class="playlist-now-playing">▶</span>'
                  : "";
              var playBtn = hasAudio
                ? '<button type="button" class="app-btn app-btn-secondary" data-playlist-play-script="' +
                  escapeHtml(s.id) +
                  '">Play</button>'
                : "";
              return (
                "<li class=\"playlist-track-row\">" +
                '<span class="playlist-track-title">' +
                escapeHtml(s.title || "Untitled") +
                (hasAudio ? "" : ' <span class="app-muted">(no audio)</span>') +
                marker +
                "</span>" +
                '<span class="playlist-track-actions">' +
                playBtn +
                '<button type="button" class="app-btn app-btn-ghost" data-playlist-remove-script="' +
                escapeHtml(s.id) +
                '">Remove</button>' +
                "</span>" +
                "</li>"
              );
            })
            .join("") +
          "</ul>"
        : '<p class="app-muted">No scripts in this playlist yet. Use <strong>Add audio…</strong> or add from My Library.</p>') +
      "</article>";

    document.getElementById("toggle-playlist-loop").addEventListener("change", function () {
      persistPlaylistPlaybackField(p.id, { loop: !!this.checked });
    });
    document.getElementById("toggle-playlist-shuffle").addEventListener("change", function () {
      persistPlaylistPlaybackField(p.id, { shuffle: !!this.checked });
    });
    document.getElementById("toggle-playlist-mix").addEventListener("change", function () {
      persistPlaylistPlaybackField(p.id, { mixMode: !!this.checked });
    });
    document.getElementById("btn-play-playlist").addEventListener("click", function () {
      startPlaylistPlayback(p);
    });
    document.getElementById("btn-stop-playlist").addEventListener("click", function () {
      stopActiveAudio();
      renderSelectedPlaylistDetail();
      renderScripts(currentScripts);
    });
    document.getElementById("btn-playlist-add-audio").addEventListener("click", function () {
      openPlaylistAddAudioModal();
    });
    document.getElementById("btn-playlist-rename").addEventListener("click", function () {
      renamePlaylist(p);
    });
    document.getElementById("btn-playlist-timer").addEventListener("click", function () {
      openPlaylistTimerModal();
    });
    el.querySelectorAll("[data-playlist-play-script]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var sid = btn.getAttribute("data-playlist-play-script");
        startPlaylistPlayback(p, sid);
      });
    });
    el.querySelectorAll("[data-playlist-remove-script]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var sid = btn.getAttribute("data-playlist-remove-script");
        removeScriptFromPlaylist(p, sid).then(function () {
          setPlaylistsMessage("Removed from playlist.", "success");
        });
      });
    });
    updatePlaylistTimerBadge();
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
        shuffle: false,
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
          shuffle: false,
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
        if (selectedPlaylistId === playlist.id) {
          selectedPlaylistId = null;
          playlistDetailVisible = false;
          updatePlaylistSectionVisibility();
        }
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
              shuffle: !!data.shuffle,
              mixMode: !!data.mixMode,
            };
          });
          if (
            selectedPlaylistId &&
            !currentPlaylists.some(function (p) {
              return p.id === selectedPlaylistId;
            })
          ) {
            selectedPlaylistId = null;
            playlistDetailVisible = false;
          }
          updatePlaylistSectionVisibility();
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
          selectedPlaylistId = null;
          playlistDetailVisible = false;
          updatePlaylistSectionVisibility();
          renderPlaylists([]);
        }
      );
  }

  function premadeJobScriptId(premade) {
    var raw = (premade && premade.id) || "unknown";
    var safe = String(raw).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
    return "__fsPremadeJob_v1_" + safe;
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

  function premadeCardHtml(p, contentHashHex) {
    var isExpanded = expandedPremadeTextById[p.id] === true;
    var hasAudio = !!(p.audioURL && String(p.audioURL).trim());
    var playingThis = activeAudioScriptId === p.id && activeAudio && !activeAudio.paused;
    var premadeVoiceID = resolvePremadeVoiceSelection(p);
    var premadeBackgroundID = resolvePremadeBackgroundSelection(p);
    var isBusy = isPremadeBusy(p.id);
    var canGen = !!(p.scriptText && String(p.scriptText).trim());
    var genEnabled = canGen && shouldEnableGeneratePremadeFromHash(p, contentHashHex);
    var genLabel = isBusy ? "Generating audio..." : hasAudio ? "Regenerate" : "Generate";
    var genClasses = "app-btn";
    if (isBusy) {
      genClasses += " app-btn-secondary";
    } else if (!canGen || !genEnabled) {
      genClasses += " app-btn-secondary app-btn-generate-muted";
    } else if (hasAudio) {
      genClasses += " app-btn-generate-warn";
    } else {
      genClasses += " app-btn-generate-fresh";
    }
    var genDisabled = isBusy || !canGen || !genEnabled;
    var genTitle = !canGen
      ? "This premade has no script text to turn into audio."
      : !genEnabled && !isBusy
        ? "Audio already matches this text, voice, and background."
        : "";
    var audioControlsExpanded = controlsExpandedForPremade(p.id);
    var chevChar = audioControlsExpanded ? "▲" : "▼";
    var chipLabel = premadeLibraryCategoryDisplayName((p.categoryID || "").trim());
    var audioSection = audioControlsExpanded
      ? '<div class="premade-card-audio-section">' +
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
        '  <button type="button" class="' +
        genClasses +
        '" data-premade-action="generate-audio" data-premade-id="' +
        escapeHtml(p.id) +
        '"' +
        (genDisabled ? " disabled" : "") +
        (genTitle ? ' title="' + escapeHtml(genTitle) + '"' : "") +
        ">" +
        genLabel +
        "</button>" +
        '  <button type="button" class="app-btn app-btn-primary" data-premade-action="save" data-premade-id="' +
        escapeHtml(p.id) +
        '">Save to My Library</button>' +
        '  <button type="button" class="app-btn app-btn-secondary" data-premade-action="play" data-premade-id="' +
        escapeHtml(p.id) +
        '"' +
        (!hasAudio || isBusy ? " disabled" : "") +
        ">" +
        (playingThis ? "Pause" : "Play") +
        "</button>" +
        '  <button type="button" class="app-btn app-btn-ghost" data-premade-action="add-playlist" data-premade-id="' +
        escapeHtml(p.id) +
        '"' +
        (!currentPlaylists.length ? " disabled" : "") +
        ">Save + Add to Playlist</button>" +
        '  <button type="button" class="app-btn app-btn-secondary" data-premade-action="edit" data-premade-id="' +
        escapeHtml(p.id) +
        '">Edit</button>' +
        "</div>" +
        "</div>"
      : "";
    return (
      '<article class="app-card" data-premade-id="' +
      escapeHtml(p.id) +
      '">' +
      '<div class="app-card-header-row">' +
      "<h3>" +
      escapeHtml(p.title || "Untitled Premade") +
      "</h3>" +
      '  <button type="button" class="library-card-chevron" data-premade-action="toggle-controls" data-premade-id="' +
      escapeHtml(p.id) +
      '" aria-expanded="' +
      (audioControlsExpanded ? "true" : "false") +
      '" title="' +
      (audioControlsExpanded ? "Collapse audio controls" : "Expand audio controls") +
      '">' +
      chevChar +
      "</button>" +
      "</div>" +
      '<div class="app-card-meta-row">' +
      '<div class="app-card-meta">' +
      escapeHtml(p.description || "No description") +
      "</div>" +
      '<span class="app-chip">' +
      escapeHtml(chipLabel) +
      "</span>" +
      "</div>" +
      (isExpanded
        ? '<p class="app-card-text">' +
          escapeHtml((p.scriptText || "").trim() || "(No script text)") +
          "</p>"
        : "") +
      audioSection +
      "</article>"
    );
  }

  function bindPremadeCardActions() {
    var list = document.getElementById("premade-list");
    if (!list) return;
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
        } else if (action === "toggle-controls") {
          togglePremadeCardAudioControls(premade.id);
        } else if (action === "generate-audio") {
          generateAudioForPremade(premade);
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

  function renderPremade() {
    var list = document.getElementById("premade-list");
    if (!list) return;
    if (!currentPremade.length) {
      list.innerHTML =
        '<p class="app-muted" style="margin:0 0 0.85rem;">No premade items in Firestore yet. iOS can also read bundled premade audio; web lists published docs from <code>premadeAudio</code>. When you publish items, they appear in the categories below.</p>' +
        PREMADE_LIBRARY_CATEGORY_ORDER.map(function (c) {
          return premadeCategorySectionHtml(c.id, c.name, [], {});
        }).join("");
      bindPremadeCategoryActions();
      updatePremadeExpandAllToggleUi();
      return;
    }
    var gen = ++premadeRenderGeneration;
    var grouped = groupPremadesByLibraryCategory(currentPremade);
    var flatForHash = flatPremadesForHashOrder(grouped);
    Promise.all(
      flatForHash.map(function (p) {
        return scriptContentSha256Hex(premadeDigestSourceFromPremade(p));
      })
    ).then(function (hashes) {
      if (gen !== premadeRenderGeneration) return;
      var hashMap = {};
      flatForHash.forEach(function (p, i) {
        hashMap[p.id] = hashes[i];
      });
      var parts = [];
      PREMADE_LIBRARY_CATEGORY_ORDER.forEach(function (c) {
        parts.push(premadeCategorySectionHtml(c.id, c.name, grouped.byId[c.id] || [], hashMap));
      });
      if (grouped.other.length) {
        parts.push(premadeCategorySectionHtml("__other__", "Other", grouped.other, hashMap));
      }
      list.innerHTML = parts.join("");
      bindPremadeCardActions();
      bindPremadeCategoryActions();
      updatePremadeExpandAllToggleUi();
    });
  }

  function subscribePremade() {
    teardownPremadeListener();
    premadeUnsubscribe = premadeCollection().onSnapshot(
      function (snap) {
        var cloudPremade = snap.docs
          .map(function (doc) {
            var data = doc.data() || {};
            return {
              id: doc.id,
              title: data.title || "",
              categoryID: data.categoryID || "",
              description: data.description || "",
              scriptText: data.scriptText || "",
              audioURL: (data.audioURL && String(data.audioURL).trim()) || resolvePremadeStaticAudioURLFromData(data),
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
        currentPremade = mergeCloudAndStaticPremades(cloudPremade);
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
        // If Firestore premade feed is unavailable, still show built-in static premades.
        currentPremade = buildStaticPremadeFallbackList();
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
          var resumeOn = readPrefResumeAdmin();
          var savedTab = localStorage.getItem(ADMIN_TAB_STORAGE_KEY);
          if (!resumeOn) {
            activeAdminTab = "home";
          } else if (savedTab === "app-library") {
            activeAdminTab = "library";
            activeLibraryTab = "app-library";
          } else if (savedTab === "account") {
            activeAdminTab = "home";
          } else if (savedTab) {
            activeAdminTab = savedTab;
          }
          var libSub = localStorage.getItem(PREF_LIBRARY_SUB_KEY);
          if (libSub === "app-library" || libSub === "my-library") {
            activeLibraryTab = libSub;
          }
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
