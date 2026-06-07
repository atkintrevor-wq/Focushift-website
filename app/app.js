(function () {
  "use strict";

  var root = document.getElementById("root");
  var scriptsUnsubscribe = null;
  var incomingSharedUnsubscribe = null;
  var ownedScripts = [];
  var incomingSharedScripts = [];
  var playlistsUnsubscribe = null;
  var premadeUnsubscribe = null;
  var backgroundCatalogUnsubscribe = null;
  var clonedVoicesUnsubscribe = null;
  var listeningUnsubscribe = null;
  var userProfileUnsubscribe = null;
  var lastAppliedProfileDefaultsAt = 0;
  /** Latest `users/{uid}/meta/listening` (plays, streaks, last played); mirrors iOS UsageManager + Firestore. */
  var webListeningStats = null;
  var currentUser = null;
  var currentScripts = [];
  var currentPlaylists = [];
  /** Script IDs while the playlist edit modal is open (reorder draft). */
  var playlistEditOrderIds = [];
  var currentPremade = [];
  /** Cloud premades with `active: false` — admin-only, not shown in App Library. */
  var currentHiddenPremade = [];
  /** User-imported backgrounds synced via `users/{uid}/userBackgrounds`. */
  var currentCloudUserBackgrounds = [];
  var userBackgroundsUnsubscribe = null;
  /** Active rows from Firestore `backgroundCatalog` (stream URLs). */
  var currentBackgroundCatalog = [];
  var currentClonedVoices = [];
  var currentUserProfile = null;
  var isEditing = false;
  var editingScriptId = null;
  var generatingAudioByScriptId = {};
  /** My Library background audio queue (max 3: 1 active + up to 2 waiting). */
  var backgroundAudioQueue = [];
  var activeBackgroundAudioTask = null;
  var backgroundAudioBadgeTimerId = null;
  var MAX_BACKGROUND_AUDIO_TASKS = 3;
  /** Full-screen script workshop (iOS ScriptEditView parity). */
  var scriptWorkshopOpenId = null;
  var scriptWorkshopDraft = null;
  var scriptWorkshopSnapshot = null;
  var scriptWorkshopIsNewDraft = false;
  var scriptWorkshopIsPremadeEditor = false;
  var scriptWorkshopPremadeId = null;
  /** 1s timer for bottom generation overlay (App Library premade only). */
  var generationOverlayTimerId = null;
  var generationOverlayStartedAt = 0;
  var scriptWorkOverlayTimerId = null;
  var scriptWorkOverlayStartedAt = 0;
  var activeAudio = null;
  var activeAudioScriptId = null;
  var activeAudioTitle = "";
  var activeVoicePreviewId = "";
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
  /** null = category grid; otherwise category id (or __other__) for premade detail. */
  var activePremadeCategoryId = null;
  var ADMIN_TAB_STORAGE_KEY = "focusshiftWebAdminTab";
  var PREF_RESUME_ADMIN_KEY = "focusshiftWebPrefResumeAdmin";
  var PREF_LIBRARY_SUB_KEY = "focusshiftWebPrefLibrarySub";
  var PREF_AUTO_PLAY_KEY = "focusshiftWebPrefAutoPlay";
  var PREF_LISTEN_SHORTCUT_KEY = "focusshiftWebPrefListenTodayShortcut";
  /** Display name when shortcut raw is playlist:<id> (same idea as iOS ListenTodayShortcut). */
  var PREF_LISTEN_SHORTCUT_PLAYLIST_NAME_KEY = "focusshiftWebPrefListenTodayPlaylistName";
  var PREF_LISTEN_SHORTCUT_SCRIPT_TITLE_KEY = "focusshiftWebPrefListenTodayScriptTitle";
  /** Last Daily Spark sparkId we recorded a listen for (browser-local dedup). */
  var PREF_DAILY_SPARK_LISTEN_KEY = "focusshiftWebDailySparkListenRecorded";
  /** "1" = Account → Active share links expanded; "0" = collapsed. */
  var PREF_ACCOUNT_SHARE_LINKS_OPEN_KEY = "focusshiftWebAccountShareLinksOpen";
  var WEB_DEVICE_ID_KEY = "focusshiftWebDeviceId";
  /** Loaded from Firestore + Storage when Account opens (mirrors iOS usage / devices / sharing). */
  var accountInsightsSnapshot = {
    usage: null,
    devices: [],
    shareAudienceCount: null,
    storageBytes: null,
    loading: false,
    error: null,
    /** From POST /usage/refresh (Firestore config/app.freeStepUpEnabled). null = not loaded yet. */
    freeStepUpEnabled: null,
    stepUpStripeConfigured: false,
    stepUpStripePriceDisplay: null,
  };
  /** Pending share invite token from ?share= or /s/ redirect. */
  var pendingShareClaimToken = null;
  /** Creator share management rows loaded in Account. */
  var shareManagementSnapshot = {
    audience: [],
    outgoing: [],
    loading: false,
    error: null,
  };
  /** When true, open Account and scroll to usage add-on after insights load. */
  var accountOpenFocusUsageAddOn = false;
  var AUDIO_JOB_WAIT_MS = 300000;
  var STEP_UP_WORDS_BONUS = 2000;
  var STEP_UP_TTS_BONUS = 10000;
  /** Mirrors iOS @AppStorage("adminModeEnabled"); gates catalog publish/edit on web. */
  var PREF_ADMIN_MODE_KEY = "focusshiftWebAdminModeEnabled";
  var PREF_APP_THEME_KEY = "focusshiftWebAppTheme";
  var PREF_HOME_PLAYS_PERIOD_KEY = "focusshiftWebHomePlaysPeriod";
  /** 0–1, applies to script / playlist / voice-adjust preview playback in this browser. */
  var PREF_PLAYBACK_VOLUME_KEY = "focusshiftWebPlaybackVolume";
  var adminModeEnabled = false;
  /** Matches iOS `SubscriptionConfig.creatorOutgoingShareCap` (active outgoing share links). */
  var CREATOR_OUTGOING_SHARE_CAP = 50;
  /** Universal link base for share invites (`ShareLinkConstants` on iOS). */
  var SHARE_UNIVERSAL_LINK_ORIGIN = "https://focusshift.app/s/";

  function readAppTheme() {
    try {
      var v = (localStorage.getItem(PREF_APP_THEME_KEY) || "system").toLowerCase();
      if (v === "dark" || v === "light" || v === "system") return v;
    } catch (_e) {}
    return "system";
  }

  function applyAppThemeToDocument(theme) {
    var t = theme === "dark" || theme === "light" || theme === "system" ? theme : "system";
    document.documentElement.setAttribute("data-app-theme", t);
  }

  function writeAppTheme(theme) {
    try {
      localStorage.setItem(PREF_APP_THEME_KEY, theme);
    } catch (_e) {}
    applyAppThemeToDocument(theme);
  }

  applyAppThemeToDocument(readAppTheme());

  function readPlaybackVolume() {
    try {
      var raw = localStorage.getItem(PREF_PLAYBACK_VOLUME_KEY);
      if (raw == null || raw === "") return 1;
      var n = parseFloat(raw);
      if (!isFinite(n)) return 1;
      if (n < 0) return 0;
      if (n > 1) return 1;
      return n;
    } catch (_e) {
      return 1;
    }
  }

  function writePlaybackVolume(v) {
    var n = Number(v);
    if (!isFinite(n)) return;
    if (n < 0) n = 0;
    if (n > 1) n = 1;
    try {
      localStorage.setItem(PREF_PLAYBACK_VOLUME_KEY, String(n));
    } catch (_e) {}
  }

  function applyPlaybackVolumeToActiveAudio() {
    if (!activeAudio) return;
    try {
      activeAudio.volume = readPlaybackVolume();
    } catch (_e) {}
  }
  var accountEscapeBound = false;
  var playlistPickerScript = null;
  var playlistPickerSuccessHandler = null;
  var publishCategoryId = "confidence";
  var publishTextDirty = false;
  var publishTitleDirty = false;
  var editingPremadeId = null;
  var inlineScriptEditorOpenById = {};
  /** Unsaved title/text for open inline editors (survives list re-renders). */
  var inlineScriptDraftById = {};
  var sectionSearchOpen = { library: false, playlists: false, voices: false, audio: false };
  var sectionSearchQuery = { library: "", playlists: "", voices: "", audio: "" };
  var aiTextEditContext = null;
  var aiTextEditPreview = null;
  var aiTextEditProcessing = false;
  var appBodyScrollLockCount = 0;
  var appBodyScrollLockY = 0;
  var expandedScriptAudioControlsById = {};
  var scriptsRenderGeneration = 0;
  var CARD_AUDIO_EXPAND_STORAGE_PREFIX = "focusshiftWebCardAudioControls_";
  var GENERATED_HASH_STORAGE_PREFIX = "generatedHash_";
  /** In-memory voice/background at first load when Firestore has no audioVoiceID (iOS-generated audio). */
  var frozenAudioSettingsByScriptId = {};
  var expandedPremadeTextById = {};
  var expandedPremadeAudioControlsById = {};
  var premadeVoiceOverrideById = {};
  var premadeBackgroundOverrideById = {};
  var premadeRenderGeneration = 0;
  var GENERATED_PREMADE_HASH_PREFIX = "generatedHashPremade_";
  var PREMADE_CARD_AUDIO_EXPAND_STORAGE_PREFIX = "focusshiftWebPremadeCardAudio_";
  /** Same categories as iOS App Library (`quickScriptCategories` / PremadeAudioManager). */
  var PREMADE_LIBRARY_CATEGORY_ORDER = [
    { id: "confidence", name: "Confidence & Self-Worth" },
    { id: "relationships", name: "Relationships & Love" },
    { id: "success-prosperity", name: "Success & Prosperity" },
    { id: "mental-wellbeing", name: "Mental Well-Being" },
    { id: "health-fitness", name: "Health & Fitness" },
    { id: "sports-performance", name: "Sports Performance" },
    { id: "sleep-rest", name: "Sleep & Rest" },
  ];
  var PREMADE_CATEGORY_ICON_SVGS = {
    confidence:
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.39 4.84L20 8.27l-4 3.9.94 5.5L12 15.9l-4.94 2.77.94-5.5-4-3.9 5.61-.43L12 2z"/></svg>',
    relationships:
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-6.7-4.35-9.33-8.18C.87 9.36 2.16 6.4 5.07 5.5c1.95-.58 3.98.12 5.33 1.73 1.35-1.61 3.38-2.31 5.33-1.73 2.91.9 4.2 3.86 2.4 7.32C18.7 16.65 12 21 12 21z"/></svg>',
    "success-prosperity":
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>',
    "mental-wellbeing":
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>',
    "health-fitness":
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="14" cy="4" r="2"/><path d="M6 22l3-7 4 1 3-6 3 6 4-1 3 7"/></svg>',
    "sports-performance":
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M12 4v16M2 12h20"/></svg>',
    "sleep-rest":
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    __other__:
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 10h4M10 8h4M18 12h4"/></svg>',
  };
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
  var activeVoicesTab = "app-voices";
  /** App Voices tab: `all` | `male` | `female` (iOS VoiceGenderFilter parity). */
  var activeVoiceGenderFilter = "all";
  var selectedVoiceId = "lnieQLGTodpbhjpZtg1k"; // Bill
  var selectedBackgroundId = "bg-none";
  /** `file` must match the filename in `website/audio/voices/` (same catalog as iOS `VoiceSamples`). */
  var availableVoices = [
    { id: "YZHSTqsq1isdXNsFLzBw", name: "Isa", description: "smooth, charming female", file: "Isa.mp3" },
    { id: "rJ9XoWu8gbUhVKZnKY8X", name: "Lori", description: "Warm, Engaging and Caring", file: "Lori.mp3" },
    { id: "l32B8XDoylOsZKiSdfhE", name: "Carla", description: "Sweet, Soft and Meditative", file: "Carla.mp3" },
    { id: "1wGbFxmAM3Fgw63G1zZJ", name: "Allison", description: "Calm, Soothing and Meditative", file: "Allison.mp3" },
    { id: "tOEwa4nCo7gciO1FbUBK", name: "Stephen", description: "Raspy Senior Narrator", file: "Stephen.mp3" },
    { id: "87tjwokZlpNU7QL3HaLP", name: "Zane", description: "Raspy and Convincing", file: "Zane.mp3" },
    { id: "7dEuJHhweR5AFXA4INkB", name: "Carol", description: "Warm, Smooth & Luxurious", file: "Carol.mp3" },
    { id: "xctasy8XvGp2cVO9HL9k", name: "Samantha", description: "Energetic, Clear and Bubbly", file: "Samantha.mp3" },
    { id: "6F5Zhi321D3Oq7v1oNT4", name: "Hank", description: "Deep and Engaging Narrator", file: "Hank.mp3" },
    { id: "FVQMzxJGPUBtfz1Azdoy", name: "Danielle", description: "Gentle and Engaging Narrator", file: "Danielle.mp3" },
    { id: "NNl6r8mD7vthiJatiJt1", name: "Bradford", description: "Expressive and Articulate", file: "Bradford.mp3" },
    { id: "gUABw7pXQjhjt0kNFBTF", name: "Andrew", description: "Smooth, Smart and Clear", file: "Andrew.mp3" },
    { id: "kqVT88a5QfII1HNAEPTJ", name: "Sage", description: "Wise and Captivating", file: "Sage.mp3" },
    { id: "EkK5I93UQWFDigLMpZcX", name: "James", description: "Husky, Engaging and Bold", file: "James.mp3" },
    { id: "NtS6nEHDYMQC9QczMQuq", name: "Katherine", description: "Calm Luxury Narrator", file: "Katherine.mp3" },
    { id: "BpjGufoPiobT79j2vtj4", name: "Priyanka", description: "Calm, Neutral and Relaxed", file: "Priyanka.mp3" },
    { id: "wAGzRVkxKEs8La0lmdrE", name: "Sully", description: "Mature, Deep and Intriguing", file: "Sully.mp3" },
    { id: "dPah2VEoifKnZT37774q", name: "Knox", description: "Serious, Deep, and Steady", file: "Knox.mp3" },
    { id: "MFZUKuGQUsGJPQjTS4wC", name: "Jon", description: "Warm & Grounded Storyteller", file: "Jon.mp3" },
    { id: "uju3wxzG5OhpWcoi3SMy", name: "Michael", description: "Confident, Expressive", file: "Michael.mp3" },
    { id: "lnieQLGTodpbhjpZtg1k", name: "Bill", description: "Clear and Articulate", file: "Bill.mp3" },
    { id: "ZthjuvLPty3kTMaNKVKb", name: "Jackson", description: "Confident and Reliable", file: "Jackson.mp3" },
    { id: "lxYfHSkYm1EzQzGhdbfc", name: "Jessica", description: "Confident. Conversational", file: "Jessica.mp3" },
    { id: "8LVfoRdkh4zgjr8v5ObE", name: "Clara", description: "Soothing, Warm and Friendly", file: "Clara.mp3" },
    { id: "EiNlNiXeDU1pqqOPrYMO", name: "Paul", description: "Deep Voice", file: "Paul.mp3" },
    { id: "YgzytRZyVmEux6PCtJYB", name: "Ivanna", description: "Sultry & Captivating", file: "Ivanna.mp3" },
    { id: "A7LE95x99tn9HChsblA6", name: "Rebecca", description: "Hypnotic Female voice", file: "Rebecca.mp3" },
    { id: "iZURAYccQtQd12U8kEcq", name: "Roland", description: "Middle-aged male voice", file: "Roland.mp3" },
    { id: "5F6a8n4ijdCrImoXgxM9", name: "Mark", description: "Very Deep, Confident, Professional", file: "Mark.mp3" },
  ];
  (function assignBuiltInVoiceGenders() {
    var genderById = {
      YZHSTqsq1isdXNsFLzBw: "female",
      rJ9XoWu8gbUhVKZnKY8X: "female",
      l32B8XDoylOsZKiSdfhE: "female",
      "1wGbFxmAM3Fgw63G1zZJ": "female",
      tOEwa4nCo7gciO1FbUBK: "male",
      "87tjwokZlpNU7QL3HaLP": "male",
      "7dEuJHhweR5AFXA4INkB": "female",
      xctasy8XvGp2cVO9HL9k: "female",
      "6F5Zhi321D3Oq7v1oNT4": "male",
      FVQMzxJGPUBtfz1Azdoy: "female",
      NNl6r8mD7vthiJatiJt1: "male",
      gUABw7pXQjhjt0kNFBTF: "male",
      kqVT88a5QfII1HNAEPTJ: "male",
      EkK5I93UQWFDigLMpZcX: "male",
      NtS6nEHDYMQC9QczMQuq: "female",
      BpjGufoPiobT79j2vtj4: "female",
      wAGzRVkxKEs8La0lmdrE: "male",
      dPah2VEoifKnZT37774q: "male",
      MFZUKuGQUsGJPQjTS4wC: "male",
      uju3wxzG5OhpWcoi3SMy: "male",
      lnieQLGTodpbhjpZtg1k: "male",
      ZthjuvLPty3kTMaNKVKb: "male",
      lxYfHSkYm1EzQzGhdbfc: "female",
      "8LVfoRdkh4zgjr8v5ObE": "female",
      EiNlNiXeDU1pqqOPrYMO: "male",
      YgzytRZyVmEux6PCtJYB: "female",
      A7LE95x99tn9HChsblA6: "female",
      iZURAYccQtQd12U8kEcq: "male",
      "5F6a8n4ijdCrImoXgxM9": "male",
    };
    availableVoices.forEach(function (v) {
      if (genderById[v.id]) v.gender = genderById[v.id];
    });
  })();
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
    { id: "bg-recovery-glow", name: "Recovery Glow", categoryID: "health-fitness", file: "Recovery Glow.mp3" },
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
  var backgroundCategoryOpenById = {};
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

  /** User-imported background audio (this browser). iOS uses Documents/BackgroundSamples + UserDefaults. */
  var USER_BG_IDB_NAME = "focusshiftWebUserBackgroundBlobs";
  var USER_BG_IDB_STORE = "blobs";
  var USER_BG_META_KEY = "focusshiftWebUserBgMeta_v1";
  var SAVED_APP_BG_IDS_KEY = "focusshiftWebSavedAppBgIds_v1";
  var USER_BG_IMPORT_MAX_BYTES = 40 * 1024 * 1024;
  var userBgObjectUrlCache = {};
  /** Optional offline copies of cloud premade audio (stream-first). */
  var PREMADE_OFFLINE_IDB_NAME = "focusshiftWebPremadeOfflineBlobs";
  var PREMADE_OFFLINE_IDB_STORE = "blobs";
  var premadeOfflineObjectUrlCache = {};
  var activeAudioPageTab = "my-audio";
  var PREF_AUDIO_PAGE_SUB_KEY = "focusshiftWebPrefAudioPageSub";

  try {
    var __apSaved = localStorage.getItem(PREF_AUDIO_PAGE_SUB_KEY);
    if (__apSaved === "app-audio" || __apSaved === "my-audio") activeAudioPageTab = __apSaved;
  } catch (_eAudioPref) {}

  function isUserBackgroundId(backgroundID) {
    var s = (backgroundID && String(backgroundID).trim()) || "";
    return s.indexOf("user-bg-") === 0;
  }

  function isKnownUserBackgroundId(backgroundID) {
    var bid = (backgroundID && String(backgroundID).trim()) || "";
    if (!bid) return false;
    if (isUserBackgroundId(bid)) return true;
    return currentCloudUserBackgrounds.some(function (b) {
      return b && b.id === bid;
    });
  }

  function mergedUserBackgroundMetas() {
    var byId = {};
    loadUserBackgroundMetaList().forEach(function (m) {
      if (m && m.id) byId[m.id] = m;
    });
    currentCloudUserBackgrounds.forEach(function (b) {
      if (!b || !b.id || byId[b.id]) return;
      byId[b.id] = {
        id: b.id,
        name: b.name || "Imported audio",
        audioURL: b.audioURL || "",
        cloudSynced: true,
      };
    });
    return Object.keys(byId).map(function (k) {
      return byId[k];
    });
  }

  function userBackgroundsCollection(uid) {
    return db.collection("users").doc(uid).collection("userBackgrounds");
  }

  function uploadUserBackgroundToCloud(id, name, blob) {
    if (!currentUser || !id || !blob) return Promise.resolve();
    var uid = currentUser.uid;
    var ext = "mp3";
    var type = (blob.type && String(blob.type).toLowerCase()) || "";
    if (type.indexOf("wav") >= 0) ext = "wav";
    else if (type.indexOf("mp4") >= 0 || type.indexOf("m4a") >= 0) ext = "m4a";
    else if (type.indexOf("aac") >= 0) ext = "aac";
    else if (type.indexOf("ogg") >= 0) ext = "ogg";
    var storagePath = "users/" + uid + "/backgroundSamples/" + id + "." + ext;
    var ref = firebase.storage().ref(storagePath);
    return ref
      .put(blob)
      .then(function () {
        return ref.getDownloadURL();
      })
      .then(function (url) {
        return userBackgroundsCollection(uid).doc(id).set(
          {
            name: name || "Imported audio",
            audioURL: url,
            storagePath: storagePath,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });
  }

  function deleteCloudUserBackground(backgroundId) {
    if (!currentUser) return Promise.resolve();
    var bid = (backgroundId && String(backgroundId).trim()) || "";
    if (!bid) return Promise.resolve();
    var uid = currentUser.uid;
    return userBackgroundsCollection(uid)
      .doc(bid)
      .get()
      .then(function (snap) {
        var storagePath = snap.exists && snap.data() && snap.data().storagePath ? String(snap.data().storagePath).trim() : "";
        var tasks = [userBackgroundsCollection(uid).doc(bid).delete()];
        if (storagePath) {
          tasks.push(
            firebase.storage()
              .ref(storagePath)
              .delete()
              .catch(function () {})
          );
        }
        return Promise.all(tasks);
      })
      .catch(function () {
        return userBackgroundsCollection(uid).doc(bid).delete().catch(function () {});
      });
  }

  function subscribeUserBackgrounds(uid) {
    if (typeof userBackgroundsUnsubscribe === "function") {
      userBackgroundsUnsubscribe();
      userBackgroundsUnsubscribe = null;
    }
    userBackgroundsUnsubscribe = userBackgroundsCollection(uid).onSnapshot(
      function (snap) {
        currentCloudUserBackgrounds = snap.docs
          .map(function (doc) {
            var data = doc.data() || {};
            return {
              id: doc.id,
              name: data.name || "Imported audio",
              audioURL: (data.audioURL && String(data.audioURL).trim()) || "",
              storagePath: (data.storagePath && String(data.storagePath).trim()) || "",
              categoryID: "my-upload",
              file: "",
              userUpload: true,
            };
          })
          .sort(function (a, b) {
            return String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
          });
        applyUserProfileDefaults({ onlyIfNewer: true });
        backfillLocalUserBackgroundUploads().finally(function () {
          if (activeAdminTab === "audio") renderAudioPage();
          if (activeAdminTab === "library") renderPremade();
          rerenderMyLibraryCardsIfNeeded();
        });
      },
      function () {
        currentCloudUserBackgrounds = [];
        if (activeAdminTab === "audio") renderAudioPage();
      }
    );
  }

  function backfillLocalUserBackgroundUploads() {
    if (!currentUser) return Promise.resolve();
    var cloudIds = {};
    currentCloudUserBackgrounds.forEach(function (b) {
      if (b && b.id) cloudIds[b.id] = true;
    });
    var pending = loadUserBackgroundMetaList().filter(function (m) {
      return m && m.id && !cloudIds[m.id];
    });
    if (!pending.length) return Promise.resolve();
    return Promise.all(
      pending.map(function (m) {
        return getUserBackgroundBlob(m.id)
          .then(function (blob) {
            if (!blob) return;
            return uploadUserBackgroundToCloud(m.id, m.name || "Imported audio", blob);
          })
          .catch(function () {});
      })
    );
  }

  function newUserBackgroundId() {
    if (window.crypto && typeof crypto.randomUUID === "function") return "user-bg-" + crypto.randomUUID();
    return "user-bg-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function revokeCachedUserBgObjectUrl(backgroundId) {
    var id = (backgroundId && String(backgroundId).trim()) || "";
    if (!id || !userBgObjectUrlCache[id]) return;
    try {
      URL.revokeObjectURL(userBgObjectUrlCache[id]);
    } catch (_r) {}
    delete userBgObjectUrlCache[id];
  }

  function loadUserBackgroundMetaList() {
    try {
      var raw = localStorage.getItem(USER_BG_META_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (_e) {
      return [];
    }
  }

  function saveUserBackgroundMetaList(list) {
    try {
      localStorage.setItem(USER_BG_META_KEY, JSON.stringify(list || []));
    } catch (_e2) {}
  }

  function loadSavedAppBackgroundIdSet() {
    try {
      var raw = localStorage.getItem(SAVED_APP_BG_IDS_KEY);
      if (!raw) return {};
      var arr = JSON.parse(raw);
      var m = {};
      if (Array.isArray(arr)) {
        arr.forEach(function (id) {
          if (id) m[String(id)] = true;
        });
      }
      return m;
    } catch (_e) {
      return {};
    }
  }

  function saveSavedAppBackgroundIdSet(map) {
    var ids = [];
    Object.keys(map || {}).forEach(function (k) {
      if (map[k]) ids.push(k);
    });
    try {
      localStorage.setItem(SAVED_APP_BG_IDS_KEY, JSON.stringify(ids));
    } catch (_e2) {}
  }

  function addSavedAppBackgroundId(backgroundId) {
    var bid = (backgroundId && String(backgroundId).trim()) || "";
    if (!bid || bid === "bg-none") return;
    var m = loadSavedAppBackgroundIdSet();
    m[bid] = true;
    saveSavedAppBackgroundIdSet(m);
  }

  function removeSavedAppBackgroundId(backgroundId) {
    var bid = (backgroundId && String(backgroundId).trim()) || "";
    if (!bid) return;
    var m = loadSavedAppBackgroundIdSet();
    delete m[bid];
    saveSavedAppBackgroundIdSet(m);
  }

  function openUserBgIdb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(USER_BG_IDB_NAME, 1);
      req.onerror = function () {
        reject(req.error || new Error("IndexedDB failed"));
      };
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(USER_BG_IDB_STORE)) {
          db.createObjectStore(USER_BG_IDB_STORE);
        }
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
    });
  }

  function getUserBackgroundBlob(id) {
    return openUserBgIdb()
      .then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(USER_BG_IDB_STORE, "readonly");
          var rq = tx.objectStore(USER_BG_IDB_STORE).get(id);
          rq.onsuccess = function () {
            resolve(rq.result != null ? rq.result : null);
          };
          rq.onerror = function () {
            reject(rq.error);
          };
        });
      })
      .then(function (blob) {
        if (blob) return blob;
        var cloud = currentCloudUserBackgrounds.find(function (b) {
          return b && b.id === id;
        });
        var remote = cloud && cloud.audioURL ? String(cloud.audioURL).trim() : "";
        if (!remote) {
          var meta = mergedUserBackgroundMetas().find(function (m) {
            return m && m.id === id;
          });
          remote = meta && meta.audioURL ? String(meta.audioURL).trim() : "";
        }
        if (!remote) return null;
        return fetch(remote)
          .then(function (r) {
            if (!r.ok) throw new Error("Could not download imported background audio.");
            return r.blob();
          })
          .then(function (fetched) {
            return putUserBackgroundBlob(id, fetched).then(function () {
              return fetched;
            });
          });
      });
  }

  function putUserBackgroundBlob(id, blob) {
    return openUserBgIdb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(USER_BG_IDB_STORE, "readwrite");
        tx.objectStore(USER_BG_IDB_STORE).put(blob, id);
        tx.oncomplete = function () {
          resolve();
        };
        tx.onerror = function () {
          reject(tx.error);
        };
      });
    });
  }

  function deleteUserBackgroundBlob(id) {
    return openUserBgIdb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(USER_BG_IDB_STORE, "readwrite");
        tx.objectStore(USER_BG_IDB_STORE).delete(id);
        tx.oncomplete = function () {
          resolve();
        };
        tx.onerror = function () {
          reject(tx.error);
        };
      });
    });
  }

  function openPremadeOfflineIdb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(PREMADE_OFFLINE_IDB_NAME, 1);
      req.onerror = function () {
        reject(req.error || new Error("IndexedDB failed"));
      };
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(PREMADE_OFFLINE_IDB_STORE)) {
          db.createObjectStore(PREMADE_OFFLINE_IDB_STORE);
        }
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
    });
  }

  function getPremadeOfflineBlob(id) {
    return openPremadeOfflineIdb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(PREMADE_OFFLINE_IDB_STORE, "readonly");
        var rq = tx.objectStore(PREMADE_OFFLINE_IDB_STORE).get(id);
        rq.onsuccess = function () {
          resolve(rq.result != null ? rq.result : null);
        };
        rq.onerror = function () {
          reject(rq.error);
        };
      });
    });
  }

  function putPremadeOfflineBlob(id, blob) {
    return openPremadeOfflineIdb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(PREMADE_OFFLINE_IDB_STORE, "readwrite");
        tx.objectStore(PREMADE_OFFLINE_IDB_STORE).put(blob, id);
        tx.oncomplete = function () {
          resolve();
        };
        tx.onerror = function () {
          reject(tx.error);
        };
      });
    });
  }

  function deletePremadeOfflineBlob(id) {
    return openPremadeOfflineIdb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(PREMADE_OFFLINE_IDB_STORE, "readwrite");
        tx.objectStore(PREMADE_OFFLINE_IDB_STORE).delete(id);
        tx.oncomplete = function () {
          resolve();
        };
        tx.onerror = function () {
          reject(tx.error);
        };
      });
    });
  }

  function revokePremadeOfflineObjectUrl(premadeId) {
    var id = (premadeId && String(premadeId).trim()) || "";
    if (!id || !premadeOfflineObjectUrlCache[id]) return;
    try {
      URL.revokeObjectURL(premadeOfflineObjectUrlCache[id]);
    } catch (_r) {}
    delete premadeOfflineObjectUrlCache[id];
  }

  function premadeOfflinePlaybackURL(premadeId, remoteUrl) {
    var id = (premadeId && String(premadeId).trim()) || "";
    if (id && premadeOfflineObjectUrlCache[id]) return premadeOfflineObjectUrlCache[id];
    return (remoteUrl && String(remoteUrl).trim()) || "";
  }

  function isStreamableCloudPremade(premade) {
    if (!premade || !premade.isCloudCatalog) return false;
    var url = (premade.audioURL && String(premade.audioURL).trim()) || "";
    return /^https?:/i.test(url);
  }

  function downloadPremadeForOffline(premade) {
    if (!premade || !isStreamableCloudPremade(premade)) {
      return Promise.reject(new Error("This premade is not available for offline download."));
    }
    var remote = String(premade.audioURL).trim();
    return fetch(remote)
      .then(function (r) {
        if (!r.ok) throw new Error("Could not download premade audio.");
        return r.blob();
      })
      .then(function (blob) {
        reportCatalogStorageCost(remote, blob.size || 0, "premade_download");
        return putPremadeOfflineBlob(premade.id, blob).then(function () {
          revokePremadeOfflineObjectUrl(premade.id);
          var objUrl = URL.createObjectURL(blob);
          premadeOfflineObjectUrlCache[premade.id] = objUrl;
          return objUrl;
        });
      });
  }

  function removePremadeOfflineDownload(premadeId) {
    var id = (premadeId && String(premadeId).trim()) || "";
    if (!id) return Promise.resolve();
    revokePremadeOfflineObjectUrl(id);
    return deletePremadeOfflineBlob(id);
  }

  function hydratePremadeOfflineCacheFromIdb(premadeIds) {
    if (!premadeIds || !premadeIds.length || !window.indexedDB) return Promise.resolve();
    return Promise.all(
      premadeIds.map(function (id) {
        if (!id || premadeOfflineObjectUrlCache[id]) return Promise.resolve();
        return getPremadeOfflineBlob(id).then(function (blob) {
          if (!blob) return;
          premadeOfflineObjectUrlCache[id] = URL.createObjectURL(blob);
        });
      })
    );
  }

  function allBackgroundTracksForPicker() {
    var out = allAppBackgroundTracksIncludingCloud().slice();
    var none = availableBackgrounds.find(function (b) {
      return b.id === "bg-none";
    });
    if (none) out.unshift(none);
    mergedUserBackgroundMetas().forEach(function (m) {
      if (!m || !m.id) return;
      out.push({
        id: m.id,
        name: m.name || "Imported audio",
        categoryID: "my-upload",
        file: "",
        audioURL: m.audioURL || "",
        userUpload: true,
      });
    });
    return out;
  }

  function handleUserBackgroundImportSelected(ev) {
    if (!requireWebPaidTier(WEB_PAID_FEATURE_COPY.bgImport)) return;
    var input = ev && ev.target;
    var file = input && input.files && input.files[0] ? input.files[0] : null;
    if (input)
      try {
        input.value = "";
      } catch (_eClr) {}
    if (!file) return;
    if (typeof file.size === "number" && file.size > USER_BG_IMPORT_MAX_BYTES) {
      setBackgroundsMessage(
        "That file is too large. Maximum size is about " +
          Math.floor(USER_BG_IMPORT_MAX_BYTES / (1024 * 1024)) +
          " MB.",
        "error"
      );
      return;
    }
    var displayName = (file.name || "").trim() || "Imported audio";
    var id = newUserBackgroundId();
    setBackgroundsMessage('Importing "' + displayName + '"...', "");
    putUserBackgroundBlob(id, file)
      .then(function () {
        var next = loadUserBackgroundMetaList().filter(function (m) {
          return !(m && m.id === id);
        });
        next.unshift({ id: id, name: displayName });
        saveUserBackgroundMetaList(next);
        return uploadUserBackgroundToCloud(id, displayName, file);
      })
      .then(function () {
        setBackgroundsMessage('Imported "' + displayName + '". It appears under My Audio.', "success");
        renderAudioPage();
      })
      .catch(function (_eImp) {
        setBackgroundsMessage("Could not import that file.", "error");
      });
  }

  function backgroundRowCanPreview(b) {
    if (!b) return false;
    if (b.id === "bg-none") return false;
    return (
      !!(b.file && String(b.file).trim()) ||
      !!(b.audioURL && String(b.audioURL).trim()) ||
      !!b.userUpload ||
      !!isKnownUserBackgroundId(b.id) ||
      !!(b.audioURL && String(b.audioURL).trim())
    );
  }

  var activeCategoryId = "confidence";
  var homeFlowStep = "landing";
  var homeDashboardBadgesExpanded = false;
  /** Set while asking Stripe-style follow-ups before final script (see iOS SurveyViewModel). */
  var homeClarifyFlow = null;
  /** Cached Daily Spark payload + playback blob URL (Starter/Creator). */
  var dailySparkState = {
    spark: null,
    loading: false,
    playing: false,
    error: null,
    objectUrl: null,
    lastFetchMs: 0,
  };

  /** Per-tab help copy (matches iOS `ScreenHelpSheet` on Home, Library, Playlists, Voices, Audio). */
  var SCREEN_HELP = {
    home: {
      title: "Home",
      content:
        "Create Personalized Mental Script — Tap to start the questionnaire and generate a personalized mental script (Starter and Creator). On Free, you'll be prompted to upgrade.\n\n" +
        "Daily Spark — Tap to play today's short curated affirmation (Starter and Creator).\n\n" +
        "Listen today — Tap to run your saved playlist or library shortcut. Set the target in Account → Preferences.\n\n" +
        "Dashboard — Streak, plays (tap plays to cycle week / month / year / total), plan, last played, milestones, and reminders status. Same Firestore fields as the iOS app.\n\n" +
        "Account — Open the person icon (top right) for settings, plans, library counts, preferences, and usage.",
    },
    library: {
      title: "Library",
      content:
        "This screen shows your affirmation scripts and the App Library catalog.\n\n" +
        "My Library / App Library — Use the segmented tabs at the top to switch views.\n\n" +
        "My Library — Expand a card to see voice and background. Tap Edit to change title, script, voice, and background in the workshop. Save when only the title changed; Save and Generate when text or listen settings changed.\n\n" +
        "• + New — Create a blank script, or use the menu for Import Audio (Starter/Creator).\n" +
        "• Chevron (▼) on the toolbar expands or collapses details on all cards at once.\n" +
        "• While audio generates, a spinner and timer appear in the top bar (number = jobs queued, up to 3).\n" +
        "• Scripts sync from Firebase across devices on the same account.\n" +
        "• A * after a title means it's a custom version of a premade script.\n\n" +
        "App Library — Pick a category to browse premade scripts. Paid: expand a card, tap Edit to customize in the workshop, then Save to My Library or Save and Generate. Free: play, save to My Library, or add to a playlist.",
    },
    playlists: {
      title: "Playlists",
      content:
        "Playlists let you group affirmation audio and play them in order (or on shuffle).\n\n" +
        "• Tap + New Playlist to create one.\n" +
        "• Tap a playlist card to open it: add or remove tracks, reorder them, or tap a track to play.\n" +
        "• Loop and Shuffle icons on the playlist detail screen control playback modes.\n" +
        "• Use the timer icon for a sleep timer (stops playback after the chosen time).\n" +
        "• Remove a track with the trash icon on that row.\n" +
        "• Playlist limits depend on your plan (Free: 2, Starter: 4, Creator: unlimited).",
    },
    "playlist-detail": {
      title: "Playlist & Player",
      content:
        "Here you can manage this playlist and control playback.\n\n" +
        "On this screen\n" +
        "• Add audio — Pick tracks from My Library or App Library.\n" +
        "• Edit — Change the playlist name and drag track order (up/down arrows).\n" +
        "• Loop / Shuffle — Toolbar icons toggle repeat and random order.\n" +
        "• Timer — Set a sleep timer from the clock icon.\n" +
        "• Tap a track row to play from that point (or pause if it's already playing).\n\n" +
        "Mini player\n" +
        "• The bar at the bottom shows what's playing. Use play/pause, skip, seek, and volume.\n" +
        "• Open expanded controls from the mini player when available on your device.",
    },
    voices: {
      title: "Voices",
      content:
        "Choose the voice that speaks your affirmations when you generate audio.\n\n" +
        "My Voices\n" +
        "• Your saved voices: cloned voices (Creator), added app voices, and uploaded custom voices (Starter/Creator).\n" +
        "• Clone (Starter/Creator) records or uploads your voice to create a personalized clone.\n\n" +
        "App Voices\n" +
        "• Built-in voices included with the app. Tap Preview to hear any voice.\n" +
        "• Adding voices to My Voices and setting a default voice require Starter or Creator.\n" +
        "• Applying voices when generating audio may require Starter or Creator for some voices.",
    },
    audio: {
      title: "Background Audio",
      content:
        "Choose background audio that plays behind your affirmations when you generate audio.\n\n" +
        "My Audio\n" +
        "• Your saved tracks: uploaded files and app audio you've pinned (Starter/Creator for uploads).\n" +
        "• Import adds files in this browser; they stay on this device until you use them in a script.\n\n" +
        "App Audio\n" +
        "• Built-in background tracks. Free accounts can preview any track here.\n" +
        "• Setting a default background, pinning to My Audio, or using backgrounds when generating requires Starter or Creator.\n" +
        "• Expand/collapse categories with the chevron on each section.",
    },
  };

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

  var surveyIntakeObstacleQuestion =
    "What's the main obstacle, inner critic, or habit that gets in the way? (e.g., self-doubt before meetings, racing thoughts at night)";
  var surveyIntakeContextQuestion =
    "When or where does this matter most? (e.g., morning routine, before a game, bedtime, at work)";

  var CLARIFY_TURN_GOALS = [
    "First we'll explore what gets in the way — your inner critic, habit, or fear.",
    "Next: when or where this matters most (morning, work, bedtime, before a game…).",
    "Finally: one moment this was already true, or how it feels in your body at your best.",
  ];

  function clarifyingTurnGoal(step) {
    var idx = Math.max(0, Math.min(step, CLARIFY_TURN_GOALS.length - 1));
    return CLARIFY_TURN_GOALS[idx];
  }

  var DEFAULT_TONE_BY_CATEGORY = {
    confidence: "Motivational",
    "health-fitness": "Motivational",
    "i-am": "Motivational",
    "sports-performance": "Motivational",
    "success-prosperity": "Assertive",
    "mental-wellbeing": "Compassionate",
    relationships: "Compassionate",
    "sleep-rest": "Calming",
    other: "Calming",
  };

  var TONE_VOICE_POOLS = {
    confidence: {
      Calming: ["rJ9XoWu8gbUhVKZnKY8X", "l32B8XDoylOsZKiSdfhE"],
      Motivational: ["xctasy8XvGp2cVO9HL9k", "rJ9XoWu8gbUhVKZnKY8X"],
      Compassionate: ["l32B8XDoylOsZKiSdfhE", "BpjGufoPiobT79j2vtj4"],
      Assertive: ["lnieQLGTodpbhjpZtg1k", "87tjwokZlpNU7QL3HaLP"],
    },
    "sports-performance": {
      Calming: ["dPah2VEoifKnZT37774q", "lnieQLGTodpbhjpZtg1k"],
      Motivational: ["87tjwokZlpNU7QL3HaLP", "EkK5I93UQWFDigLMpZcX"],
      Compassionate: ["MFZUKuGQUsGJPQjTS4wC", "l32B8XDoylOsZKiSdfhE"],
      Assertive: ["87tjwokZlpNU7QL3HaLP", "5F6a8n4ijdCrImoXgxM9"],
    },
    "sleep-rest": {
      Calming: ["8LVfoRdkh4zgjr8v5ObE", "l32B8XDoylOsZKiSdfhE"],
      Motivational: ["8LVfoRdkh4zgjr8v5ObE", "BpjGufoPiobT79j2vtj4"],
      Compassionate: ["8LVfoRdkh4zgjr8v5ObE", "l32B8XDoylOsZKiSdfhE"],
      Assertive: ["dPah2VEoifKnZT37774q", "lnieQLGTodpbhjpZtg1k"],
    },
    "i-am": {
      Calming: ["rJ9XoWu8gbUhVKZnKY8X", "l32B8XDoylOsZKiSdfhE"],
      Motivational: ["xctasy8XvGp2cVO9HL9k", "rJ9XoWu8gbUhVKZnKY8X"],
      Compassionate: ["rJ9XoWu8gbUhVKZnKY8X", "l32B8XDoylOsZKiSdfhE"],
      Assertive: ["lnieQLGTodpbhjpZtg1k", "87tjwokZlpNU7QL3HaLP"],
    },
  };

  var TONE_BACKGROUND_OVERRIDES = {
    confidence: {
      Calming: "bg-calm-groove",
      Motivational: "bg-momentum-desire",
      Compassionate: "bg-warm-melody",
      Assertive: "bg-relentless-edge-surge",
    },
    "sports-performance": {
      Calming: "bg-meditation",
      Motivational: "bg-relentless-edge-surge",
      Compassionate: "bg-recovery-glow",
      Assertive: "bg-relentless-edge-surge",
    },
    "sleep-rest": {
      Calming: "bg-theta-peace-drift",
      Motivational: "bg-inner-calm",
      Compassionate: "bg-theta-peace-drift",
      Assertive: "bg-inner-calm",
    },
    "i-am": {
      Calming: "bg-kindness-melody",
      Motivational: "bg-momentum-desire",
      Compassionate: "bg-kindness-melody",
      Assertive: "bg-momentum-desire",
    },
  };

  var CATEGORY_MEDIA_RECOMMENDATIONS = {
    confidence: { voiceID: "rJ9XoWu8gbUhVKZnKY8X", backgroundID: "bg-calm-groove", voiceName: "Lori", backgroundName: "Calm Groove" },
    relationships: { voiceID: "l32B8XDoylOsZKiSdfhE", backgroundID: "bg-warm-melody", voiceName: "Carla", backgroundName: "Warm Melody" },
    "success-prosperity": { voiceID: "xctasy8XvGp2cVO9HL9k", backgroundID: "bg-momentum-desire", voiceName: "Samantha", backgroundName: "Momentum Desire" },
    "mental-wellbeing": { voiceID: "BpjGufoPiobT79j2vtj4", backgroundID: "bg-inner-calm", voiceName: "Priyanka", backgroundName: "Inner Calm" },
    "health-fitness": { voiceID: "l32B8XDoylOsZKiSdfhE", backgroundID: "bg-recovery-glow", voiceName: "Carla", backgroundName: "Recovery Glow" },
    "sports-performance": { voiceID: "87tjwokZlpNU7QL3HaLP", backgroundID: "bg-relentless-edge-surge", voiceName: "Zane", backgroundName: "Relentless Edge Surge" },
    "sleep-rest": { voiceID: "8LVfoRdkh4zgjr8v5ObE", backgroundID: "bg-theta-peace-drift", voiceName: "Clara", backgroundName: "Theta Peace Drift" },
    "i-am": { voiceID: "rJ9XoWu8gbUhVKZnKY8X", backgroundID: "bg-kindness-melody", voiceName: "Lori", backgroundName: "Kindness Melody" },
    other: { voiceID: "lnieQLGTodpbhjpZtg1k", backgroundID: "bg-meditation", voiceName: "Bill", backgroundName: "Meditation Background" },
  };

  function defaultToneForCategory(categoryId) {
    var id = String(categoryId || "").trim();
    return DEFAULT_TONE_BY_CATEGORY[id] || "Calming";
  }

  function recommendedMediaForCategory(categoryId, tone) {
    var id = String(categoryId || "").trim();
    if (!id) return null;
    var toneKey = tone || defaultToneForCategory(id);
    var legacy = CATEGORY_MEDIA_RECOMMENDATIONS[id];
    var pool =
      TONE_VOICE_POOLS[id] && TONE_VOICE_POOLS[id][toneKey]
        ? TONE_VOICE_POOLS[id][toneKey]
        : legacy
          ? [legacy.voiceID]
          : [];
    var voiceID = pool.length ? pool[0] : null;
    if (!voiceID && legacy) voiceID = legacy.voiceID;
    var backgroundID =
      TONE_BACKGROUND_OVERRIDES[id] && TONE_BACKGROUND_OVERRIDES[id][toneKey]
        ? TONE_BACKGROUND_OVERRIDES[id][toneKey]
        : legacy
          ? legacy.backgroundID
          : "";
    if (!voiceID || !backgroundID) return legacy || null;
    return {
      voiceID: voiceID,
      backgroundID: backgroundID,
      voiceName: voiceNameById(voiceID) || (legacy && legacy.voiceName) || "Voice",
      backgroundName: backgroundNameById(backgroundID) || (legacy && legacy.backgroundName) || "Background",
    };
  }

  function applyCategoryMediaRecommendations(categoryId, tone) {
    var rec = recommendedMediaForCategory(categoryId, tone);
    if (!rec) return null;
    if (!accountDefaultVoiceId() && rec.voiceID) selectedVoiceId = rec.voiceID;
    if (!accountDefaultBackgroundId() && rec.backgroundID) selectedBackgroundId = rec.backgroundID;
    return rec;
  }

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

  var appBannerDismissTimer = null;
  var BANNER_AUTO_DISMISS_MS = 2800;
  var BANNER_HIDE_ANIM_MS = 320;

  function ensureAppBannerHost() {
    var host = document.getElementById("app-banner-host");
    if (host) return host;
    host = document.createElement("div");
    host.id = "app-banner-host";
    host.className = "app-banner-host";
    host.hidden = true;
    host.setAttribute("aria-live", "polite");
    document.body.insertBefore(host, document.body.firstChild);
    return host;
  }

  function hideAppBanner() {
    if (appBannerDismissTimer) {
      clearTimeout(appBannerDismissTimer);
      appBannerDismissTimer = null;
    }
    var host = document.getElementById("app-banner-host");
    if (!host) return;
    var banner = host.querySelector(".app-banner");
    if (!banner) {
      host.innerHTML = "";
      host.hidden = true;
      return;
    }
    banner.classList.remove("is-visible");
    banner.classList.add("is-hiding");
    setTimeout(function () {
      var hiding = host.querySelector(".app-banner.is-hiding");
      if (hiding) {
        host.innerHTML = "";
        host.hidden = true;
      }
    }, BANNER_HIDE_ANIM_MS);
  }

  function bannerTypeFromKind(kind) {
    var k = String(kind || "").toLowerCase();
    if (k === "error") return "error";
    if (k === "success") return "success";
    return "info";
  }

  function bannerTitleFromKind(kind) {
    var k = String(kind || "").toLowerCase();
    if (k === "error") return "Error";
    if (k === "success") return "Success";
    return "Notice";
  }

  function showAppBanner(title, detail, type, options) {
    options = options || {};
    var textDetail = String(detail || "").trim();
    var textTitle = String(title || "").trim();
    if (!textDetail && !textTitle) {
      hideAppBanner();
      return;
    }
    if (!textDetail) textDetail = textTitle;
    if (!textTitle) textTitle = bannerTitleFromKind(type);

    type = type || "info";
    if (appBannerDismissTimer) {
      clearTimeout(appBannerDismissTimer);
      appBannerDismissTimer = null;
    }

    var host = ensureAppBannerHost();
    var autoDismiss = options.autoDismiss !== false;
    var duration =
      typeof options.duration === "number" ? options.duration : BANNER_AUTO_DISMISS_MS;

    var iconSvg =
      type === "success"
        ? '<svg class="app-banner-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 13.8-3.5-3.4 1.4-1.4 2.1 2.1 5-5.1 1.4 1.4-6.4 6.5z"/></svg>'
        : type === "error"
          ? '<svg class="app-banner-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>'
          : '<svg class="app-banner-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>';

    var tappable = typeof options.onTap === "function";
    host.hidden = false;
    host.innerHTML =
      '<div class="app-banner app-banner--' +
      escapeHtml(type) +
      (tappable ? " app-banner--tappable" : "") +
      '" role="status">' +
      '<div class="app-banner-inner">' +
      (tappable
        ? '<button type="button" class="app-banner-body" aria-label="Open account settings">' +
            iconSvg +
            '<div class="app-banner-text">' +
            '<div class="app-banner-title">' +
            escapeHtml(textTitle) +
            "</div>" +
            '<div class="app-banner-detail">' +
            escapeHtml(textDetail) +
            "</div>" +
            "</div>" +
            '<span class="app-banner-chevron" aria-hidden="true">›</span>' +
            "</button>"
        : iconSvg +
            '<div class="app-banner-text">' +
            '<div class="app-banner-title">' +
            escapeHtml(textTitle) +
            "</div>" +
            '<div class="app-banner-detail">' +
            escapeHtml(textDetail) +
            "</div>" +
            "</div>") +
      '<button type="button" class="app-banner-dismiss" aria-label="Dismiss">&times;</button>' +
      "</div>" +
      "</div>";

    var banner = host.querySelector(".app-banner");
    var dismissBtn = host.querySelector(".app-banner-dismiss");
    if (dismissBtn) {
      dismissBtn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        hideAppBanner();
      });
    }
    if (tappable) {
      var bodyBtn = host.querySelector(".app-banner-body");
      if (bodyBtn) {
        bodyBtn.addEventListener("click", function () {
          options.onTap();
        });
      }
    }

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (banner) banner.classList.add("is-visible");
      });
    });

    if (autoDismiss) {
      appBannerDismissTimer = setTimeout(hideAppBanner, duration);
    }
  }

  function showLegacyAppBanner(text, kind, options) {
    var msg = String(text || "").trim();
    if (!msg) {
      hideAppBanner();
      return;
    }
    showAppBanner(bannerTitleFromKind(kind), msg, bannerTypeFromKind(kind), options);
  }

  /** Route transient feedback to the global banner; clear legacy inline slot. */
  function postScreenMessage(elementId, text, kind, options) {
    options = options || {};
    var el = elementId ? document.getElementById(elementId) : null;
    if (options.inlineOnly) {
      if (!el) return;
      el.className = "app-inline-msg" + (kind ? " " + kind : "");
      el.textContent = text || "";
      return;
    }
    if (el) {
      el.className = "app-inline-msg";
      el.textContent = "";
    }
    showLegacyAppBanner(text, kind, options);
  }

  function teardownScriptsListener() {
    if (typeof scriptsUnsubscribe === "function") {
      scriptsUnsubscribe();
      scriptsUnsubscribe = null;
    }
    if (typeof incomingSharedUnsubscribe === "function") {
      incomingSharedUnsubscribe();
      incomingSharedUnsubscribe = null;
    }
    ownedScripts = [];
    incomingSharedScripts = [];
    inlineScriptEditorOpenById = {};
    inlineScriptDraftById = {};
  }

  function firestoreMillis(val) {
    if (!val) return 0;
    try {
      if (typeof val.toMillis === "function") return val.toMillis();
      if (val instanceof Date) return val.getTime();
    } catch (_e) {}
    return 0;
  }

  function scriptIsSharedListenOnly(script) {
    return !!(script && script.sharedFrom);
  }

  function scriptFromIncomingDocument(doc) {
    var d = doc.data() || {};
    var creatorUid = d.creatorUid;
    var title = d.title;
    if (!creatorUid || !title) return null;
    var token =
      d.shareToken && String(d.shareToken).trim() ? String(d.shareToken).trim() : doc.id;
    return {
      id: "incoming_" + token,
      title: title,
      text: d.text || "",
      audioURL: d.audioURL || "",
      voiceID: d.voiceID || "",
      backgroundID: d.backgroundID || "",
      categoryID: "",
      createdAt: d.claimedAt || null,
      updatedAt: null,
      audioCreatedAt: null,
      audioContentHash: "",
      audioVoiceID: "",
      audioBackgroundID: "",
      sharedFrom: {
        senderUid: creatorUid,
        senderDisplayName: d.creatorDisplayName || "Someone",
        shareToken: token,
        sourceScriptId: d.sourceScriptId || "",
        claimedAt: d.claimedAt || null,
      },
    };
  }

  function mergeOwnedAndIncomingScripts(owned, incoming) {
    var combined = (owned || []).concat(incoming || []);
    combined.sort(function (a, b) {
      return firestoreMillis(b.createdAt) - firestoreMillis(a.createdAt);
    });
    return combined;
  }

  function rebuildCurrentScriptsFromSources() {
    currentScripts = mergeOwnedAndIncomingScripts(ownedScripts, incomingSharedScripts);
    updateTabCounts();
    renderScripts(currentScripts);
    renderSelectedPlaylistDetail();
    if (activeAdminTab === "home") renderHomeFlow((currentUser && currentUser.displayName) || "");
  }

  /** Merge a script into currentScripts (Firestore snapshot may arrive before local text is applied). */
  function upsertCurrentScript(entry) {
    if (!entry || !entry.id) return;
    var ix = currentScripts.findIndex(function (s) {
      return s.id === entry.id;
    });
    if (ix >= 0) {
      currentScripts[ix] = Object.assign({}, currentScripts[ix], entry);
    } else {
      currentScripts = [entry].concat(currentScripts);
    }
    updateTabCounts();
  }

  function seedInlineScriptDraft(scriptId, title, text) {
    if (!scriptId) return;
    inlineScriptDraftById[scriptId] = {
      title: title != null ? String(title) : "",
      text: text != null ? String(text) : "",
    };
  }

  function filterEntitledIncomingScripts(uid, incomingScripts) {
    if (!incomingScripts.length) return Promise.resolve([]);
    return Promise.all(
      incomingScripts.map(function (s) {
        if (!s.sharedFrom || !s.sharedFrom.senderUid) return Promise.resolve(s);
        return db
          .collection("users")
          .doc(s.sharedFrom.senderUid)
          .collection("shareAudience")
          .doc(uid)
          .get()
          .then(function (snap) {
            return snap.exists ? s : null;
          })
          .catch(function () {
            return s;
          });
      })
    ).then(function (results) {
      return results.filter(function (x) {
        return !!x;
      });
    });
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

  function teardownBackgroundCatalogListener() {
    if (typeof backgroundCatalogUnsubscribe === "function") {
      backgroundCatalogUnsubscribe();
      backgroundCatalogUnsubscribe = null;
    }
    currentBackgroundCatalog = [];
  }

  function teardownClonedVoicesListener() {
    if (typeof clonedVoicesUnsubscribe === "function") {
      clonedVoicesUnsubscribe();
      clonedVoicesUnsubscribe = null;
    }
  }

  function teardownListeningListener() {
    if (typeof listeningUnsubscribe === "function") {
      listeningUnsubscribe();
      listeningUnsubscribe = null;
    }
    webListeningStats = null;
  }

  function teardownUserProfileListener() {
    if (typeof userProfileUnsubscribe === "function") {
      userProfileUnsubscribe();
      userProfileUnsubscribe = null;
    }
    lastAppliedProfileDefaultsAt = 0;
  }

  function profileDefaultsVersion(profile) {
    if (!profile) return 0;
    var wd = profile.webDefaultsUpdatedAt;
    if (wd && typeof wd.toMillis === "function") return wd.toMillis();
    var updated = profile.updatedAt;
    if (updated && typeof updated.toMillis === "function") return updated.toMillis();
    return 0;
  }

  function isVoiceIdAvailableForDefault(voiceID) {
    var id = (voiceID && String(voiceID).trim()) || "";
    if (!id) return false;
    if (
      availableVoices.some(function (v) {
        return v.id === id;
      })
    ) {
      return true;
    }
    if (
      currentClonedVoices.some(function (v) {
        return v.id === id;
      })
    ) {
      return true;
    }
    return false;
  }

  function isBackgroundIdAvailableForDefault(backgroundID) {
    var id = (backgroundID && String(backgroundID).trim()) || "";
    if (!id) return false;
    if (
      availableBackgrounds.some(function (b) {
        return b.id === id;
      })
    ) {
      return true;
    }
    if (
      currentBackgroundCatalog.some(function (b) {
        return b.id === id;
      })
    ) {
      return true;
    }
    if (isKnownUserBackgroundId(id)) return true;
    return false;
  }

  function rerenderDefaultsDependents() {
    syncAccountDefaultMediaLabels();
    if (activeAdminTab === "library") renderPremade();
    if (activeAdminTab === "voices") renderVoices();
    if (activeAdminTab === "audio") renderAudioPage();
    if (activeAdminTab === "home") renderHomeFlow((currentUser && currentUser.displayName) || "");
  }

  function applyUserProfileDefaults(options) {
    options = options || {};
    if (!currentUserProfile) return false;
    var version = profileDefaultsVersion(currentUserProfile);
    var profileVoiceID = (currentUserProfile.defaultVoiceID || "").trim();
    var profileBackgroundID = (currentUserProfile.defaultBackgroundID || "").trim();
    var pendingVoice =
      profileVoiceID && isVoiceIdAvailableForDefault(profileVoiceID) && selectedVoiceId !== profileVoiceID;
    var pendingBackground =
      profileBackgroundID &&
      isBackgroundIdAvailableForDefault(profileBackgroundID) &&
      selectedBackgroundId !== profileBackgroundID;
    if (options.onlyIfNewer && version <= lastAppliedProfileDefaultsAt && !pendingVoice && !pendingBackground) {
      return false;
    }

    var changed = false;
    if (pendingVoice) {
      selectedVoiceId = profileVoiceID;
      changed = true;
    }
    if (pendingBackground) {
      selectedBackgroundId = profileBackgroundID;
      changed = true;
    }

    if (changed || options.forceVersion) {
      lastAppliedProfileDefaultsAt = version;
    }
    if (changed && options.rerender !== false) {
      rerenderDefaultsDependents();
    }
    return changed;
  }

  function subscribeUserProfile(uid) {
    teardownUserProfileListener();
    userProfileUnsubscribe = db
      .collection("users")
      .doc(uid)
      .onSnapshot(
        function (snap) {
          currentUserProfile = snap.exists ? snap.data() || {} : {};
          hasVoiceCloneConsent = !!(currentUserProfile && currentUserProfile.voiceCloneConsentAcceptedAt);
          applyUserProfileDefaults({ onlyIfNewer: true });
          renderAccountInsights();
          syncAccountSubscriptionHeadline();
        },
        function () {}
      );
  }

  function listeningMetaDocRef(uid) {
    return db.collection("users").doc(uid).collection("meta").doc("listening");
  }

  function intFromFirestoreListening(val) {
    if (val == null) return 0;
    var n = Number(val);
    return isFinite(n) ? Math.floor(n) : 0;
  }

  function parsePlayDateStampsFromDoc(val) {
    if (!val) return [];
    if (Array.isArray(val)) {
      return val
        .map(function (x) {
          if (typeof x === "number" && isFinite(x)) return x;
          if (x && typeof x === "object" && typeof x.toMillis === "function") return x.toMillis() / 1000;
          return NaN;
        })
        .filter(function (x) {
          return isFinite(x);
        });
    }
    return [];
  }

  function normalizeListeningDoc(data) {
    var d = data || {};
    return {
      playCount: intFromFirestoreListening(d.playCount),
      streakCount: intFromFirestoreListening(d.streakCount),
      bestStreakCount: intFromFirestoreListening(d.bestStreakCount),
      lastPlayedTitle: (d.lastPlayedTitle && String(d.lastPlayedTitle)) || "",
      lastPlayedTime: (d.lastPlayedTime && String(d.lastPlayedTime)) || "",
      lastPlayedAudioURL: (d.lastPlayedAudioURL && String(d.lastPlayedAudioURL).trim()) || "",
      lastPlayDate: d.lastPlayDate || null,
      playDateStamps: parsePlayDateStampsFromDoc(d.playDateStamps),
    };
  }

  function subscribeListeningStats(uid) {
    teardownListeningListener();
    if (!uid) return;
    listeningUnsubscribe = listeningMetaDocRef(uid).onSnapshot(
      function (snap) {
        webListeningStats = snap.exists ? normalizeListeningDoc(snap.data()) : normalizeListeningDoc({});
        if (activeAdminTab === "home") renderHomeFlow((currentUser && currentUser.displayName) || "");
      },
      function () {
        webListeningStats = null;
        if (activeAdminTab === "home") renderHomeFlow((currentUser && currentUser.displayName) || "");
      }
    );
  }

  function startOfLocalDayMs(d) {
    var x = new Date(d.getTime());
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  }

  function isTodayLocal(d) {
    if (!d || isNaN(d.getTime())) return false;
    var now = new Date();
    return startOfLocalDayMs(d) === startOfLocalDayMs(now);
  }

  function isYesterdayLocal(d) {
    if (!d || isNaN(d.getTime())) return false;
    var y = new Date();
    y.setDate(y.getDate() - 1);
    return startOfLocalDayMs(d) === startOfLocalDayMs(y);
  }

  function effectiveStreakDisplayed(stats) {
    if (!stats) return 0;
    var lp = stats.lastPlayDate;
    if (!lp || typeof lp.toDate !== "function") return 0;
    try {
      var d = lp.toDate();
      if (!isTodayLocal(d) && !isYesterdayLocal(d)) return 0;
    } catch (_e) {
      return 0;
    }
    return stats.streakCount || 0;
  }

  function startOfWeekMondayMs(d) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var day = x.getDay();
    var diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  }

  function countPlaysInRangeSec(stamps, startSec, endExclusiveSec) {
    if (!stamps || !stamps.length) return 0;
    var n = 0;
    stamps.forEach(function (t) {
      var ts = Number(t);
      if (isFinite(ts) && ts >= startSec && ts < endExclusiveSec) n++;
    });
    return n;
  }

  function playsCountForHomePeriod(stats, period) {
    if (!stats) return 0;
    var total = stats.playCount || 0;
    if (period === "total") return total;
    var stamps = stats.playDateStamps || [];
    var now = new Date();
    if (period === "week") {
      var w0 = startOfWeekMondayMs(now) / 1000;
      var w1 = w0 + 7 * 86400;
      return countPlaysInRangeSec(stamps, w0, w1);
    }
    if (period === "month") {
      var m0 = new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000;
      var m1 = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() / 1000;
      return countPlaysInRangeSec(stamps, m0, m1);
    }
    if (period === "year") {
      var y0 = new Date(now.getFullYear(), 0, 1).getTime() / 1000;
      var y1 = new Date(now.getFullYear() + 1, 0, 1).getTime() / 1000;
      return countPlaysInRangeSec(stamps, y0, y1);
    }
    return total;
  }

  function readHomePlaysPeriod() {
    try {
      var v = localStorage.getItem(PREF_HOME_PLAYS_PERIOD_KEY);
      if (v === "week" || v === "month" || v === "year" || v === "total") return v;
    } catch (_e) {}
    return "total";
  }

  function cycleHomePlaysPeriod() {
    var order = ["week", "month", "year", "total"];
    var cur = readHomePlaysPeriod();
    var i = order.indexOf(cur);
    var next = order[(i + 1) % order.length];
    try {
      localStorage.setItem(PREF_HOME_PLAYS_PERIOD_KEY, next);
    } catch (_e) {}
    return next;
  }

  function homePlaysPeriodParen(period) {
    if (period === "week") return "(W)";
    if (period === "month") return "(M)";
    if (period === "year") return "(Y)";
    return "(T)";
  }

  function readListenShortcutRaw() {
    try {
      var raw = (localStorage.getItem(PREF_LISTEN_SHORTCUT_KEY) || "playlists").trim();
      if (raw === "library" || raw === "playlists") return raw;
      if (raw.indexOf("playlist:") === 0) return raw;
      if (raw.indexOf("script:") === 0) return raw;
      return "playlists";
    } catch (_e) {
      return "playlists";
    }
  }

  function readListenShortcutPlaylistName() {
    try {
      return (localStorage.getItem(PREF_LISTEN_SHORTCUT_PLAYLIST_NAME_KEY) || "").trim();
    } catch (_eNm) {
      return "";
    }
  }

  function readListenShortcutScriptTitle() {
    try {
      return (localStorage.getItem(PREF_LISTEN_SHORTCUT_SCRIPT_TITLE_KEY) || "").trim();
    } catch (_e2) {
      return "";
    }
  }

  function writeListenShortcutPlaylist(id, name) {
    if (!id) return;
    try {
      localStorage.setItem(PREF_LISTEN_SHORTCUT_KEY, "playlist:" + String(id));
      localStorage.setItem(PREF_LISTEN_SHORTCUT_PLAYLIST_NAME_KEY, (name && String(name)) || "Playlist");
      localStorage.removeItem(PREF_LISTEN_SHORTCUT_SCRIPT_TITLE_KEY);
    } catch (_e) {}
  }

  function writeListenShortcutScript(scriptId, title) {
    var sid = (scriptId && String(scriptId).trim()) || "";
    if (!sid) return;
    try {
      localStorage.setItem(PREF_LISTEN_SHORTCUT_KEY, "script:" + sid);
      localStorage.setItem(PREF_LISTEN_SHORTCUT_SCRIPT_TITLE_KEY, (title && String(title).trim()) || "Library track");
      localStorage.removeItem(PREF_LISTEN_SHORTCUT_PLAYLIST_NAME_KEY);
    } catch (_e) {}
  }

  function writeListenShortcutTab(tab) {
    var t = tab === "library" ? "library" : "playlists";
    try {
      localStorage.setItem(PREF_LISTEN_SHORTCUT_KEY, t);
      localStorage.removeItem(PREF_LISTEN_SHORTCUT_PLAYLIST_NAME_KEY);
      localStorage.removeItem(PREF_LISTEN_SHORTCUT_SCRIPT_TITLE_KEY);
    } catch (_e) {}
  }

  function populatePrefListenPlaylistSelect(sel) {
    if (!sel) return;
    var raw = readListenShortcutRaw();
    var curPid = raw.indexOf("playlist:") === 0 ? raw.slice("playlist:".length) : "";
    sel.innerHTML =
      '<option value="">Select a playlist\u2026</option>' +
      currentPlaylists
        .map(function (p) {
          return (
            '<option value="' +
            escapeHtml(p.id) +
            '">' +
            escapeHtml(p.name || "Playlist") +
            "</option>"
          );
        })
        .join("");
    if (
      curPid &&
      currentPlaylists.some(function (p) {
        return p.id === curPid;
      })
    ) {
      sel.value = curPid;
    } else {
      sel.value = "";
    }
  }

  function populatePrefListenScriptSelect(sel) {
    if (!sel) return;
    var raw = readListenShortcutRaw();
    var curSid = raw.indexOf("script:") === 0 ? raw.slice("script:".length) : "";
    var playable = currentScripts.filter(function (s) {
      return !!(s.audioURL && String(s.audioURL).trim());
    });
    sel.innerHTML =
      '<option value="">Select a library track\u2026</option>' +
      playable
        .map(function (s) {
          return (
            '<option value="' +
            escapeHtml(s.id) +
            '">' +
            escapeHtml(s.title || "Script") +
            "</option>"
          );
        })
        .join("");
    if (
      curSid &&
      playable.some(function (s) {
        return s.id === curSid;
      })
    ) {
      sel.value = curSid;
    } else {
      sel.value = "";
    }
  }

  function syncListenShortcutPreferenceUi() {
    var modeEl = document.getElementById("pref-listen-shortcut-mode");
    var plWrap = document.getElementById("pref-listen-shortcut-playlist-wrap");
    var scWrap = document.getElementById("pref-listen-shortcut-script-wrap");
    var plSel = document.getElementById("pref-listen-shortcut-playlist-id");
    var scSel = document.getElementById("pref-listen-shortcut-script-id");
    if (!modeEl) return;
    var raw = readListenShortcutRaw();
    var mode = "playlists";
    if (raw === "library") mode = "library";
    else if (raw.indexOf("playlist:") === 0) mode = "playlist-target";
    else if (raw.indexOf("script:") === 0) mode = "script-target";
    else if (raw === "playlists") mode = "playlists";
    modeEl.value = mode;
    populatePrefListenPlaylistSelect(plSel);
    populatePrefListenScriptSelect(scSel);
    if (plWrap) plWrap.hidden = mode !== "playlist-target";
    if (scWrap) scWrap.hidden = mode !== "script-target";
  }

  function onPrefListenShortcutModeChange(mode) {
    if (mode === "playlists" || mode === "library") {
      writeListenShortcutTab(mode);
      syncListenShortcutPreferenceUi();
      setAccountMessage("Listen today shortcut updated.", "success");
      if (activeAdminTab === "home") renderHomeFlow((currentUser && currentUser.displayName) || "");
      return;
    }
    if (mode === "playlist-target") {
      if (!currentPlaylists.length) {
        setAccountMessage("Create a playlist in the Playlists tab first.", "error");
        writeListenShortcutTab("playlists");
        syncListenShortcutPreferenceUi();
        return;
      }
      var pick = currentPlaylists[0];
      writeListenShortcutPlaylist(pick.id, pick.name || "Playlist");
      syncListenShortcutPreferenceUi();
      setAccountMessage(
        'Shortcut will play "' +
          (pick.name || "Playlist") +
          '". Pick another playlist below if you prefer.',
        "success"
      );
      if (activeAdminTab === "home") renderHomeFlow((currentUser && currentUser.displayName) || "");
      return;
    }
    if (mode === "script-target") {
      var playable = currentScripts.filter(function (s) {
        return !!(s.audioURL && String(s.audioURL).trim());
      });
      if (!playable.length) {
        setAccountMessage("Generate audio for a script in Library first.", "error");
        writeListenShortcutTab("library");
        syncListenShortcutPreferenceUi();
        return;
      }
      var spick = playable[0];
      writeListenShortcutScript(spick.id, spick.title || "Script");
      syncListenShortcutPreferenceUi();
      setAccountMessage(
        'Shortcut will play "' +
          (spick.title || "Script") +
          '". Pick another track below if you prefer.',
        "success"
      );
      if (activeAdminTab === "home") renderHomeFlow((currentUser && currentUser.displayName) || "");
    }
  }

  function readAccountShareLinksSectionOpen() {
    try {
      return localStorage.getItem(PREF_ACCOUNT_SHARE_LINKS_OPEN_KEY) === "1";
    } catch (_e) {
      return false;
    }
  }

  function writeAccountShareLinksSectionOpen(open) {
    try {
      localStorage.setItem(PREF_ACCOUNT_SHARE_LINKS_OPEN_KEY, open ? "1" : "0");
    } catch (_e) {}
  }

  function hasPlayedTodayWeb(stats) {
    var stamps = stats && stats.playDateStamps ? stats.playDateStamps : [];
    if (!stamps.length) return false;
    var day0 = startOfLocalDayMs(new Date()) / 1000;
    var tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    var day1 = startOfLocalDayMs(tmr) / 1000;
    return stamps.some(function (x) {
      var ts = Number(x);
      return isFinite(ts) && ts >= day0 && ts < day1;
    });
  }

  function listenTodaySubtitleWeb(stats) {
    var raw = readListenShortcutRaw();
    var plName = readListenShortcutPlaylistName();
    if (raw.indexOf("playlist:") === 0 && plName) {
      return 'Tap to play "' + plName + '"';
    }
    if (raw.indexOf("script:") === 0) {
      var st = readListenShortcutScriptTitle();
      if (st) return 'Tap to play "' + st + '"';
      return "Tap to play your library track";
    }
    var eff = stats ? effectiveStreakDisplayed(stats) : 0;
    if (eff > 0) {
      return "Keep your " + eff + "-day streak going.";
    }
    return "A few minutes can shift your focus.";
  }

  function performListenTodayPrimaryAction() {
    var raw = readListenShortcutRaw();
    if (raw.indexOf("playlist:") === 0) {
      var pid = raw.slice("playlist:".length);
      var pl = currentPlaylists.find(function (p) {
        return p.id === pid;
      });
      if (pl) {
        setAdminTab("playlists");
        openPlaylistDetailView(pl.id);
        startPlaylistPlayback(pl, null);
        return;
      }
      setAdminTab("playlists");
      generationMessage(
        "That playlist is no longer in your account. Pick another in Account → Preferences or Listen today.",
        "error"
      );
      return;
    }
    if (raw.indexOf("script:") === 0) {
      var sid = raw.slice("script:".length);
      var scr = currentScripts.find(function (s) {
        return s.id === sid;
      });
      if (scr && scr.audioURL && String(scr.audioURL).trim()) {
        setAdminTab("library");
        activeLibraryTab = "my-library";
        renderLibrarySubtab();
        togglePlayScriptAudio(scr);
        return;
      }
      setAdminTab("library");
      activeLibraryTab = "my-library";
      renderLibrarySubtab();
      generationMessage(
        "That library track is unavailable. Pick another in Account → Preferences or Listen today.",
        "error"
      );
      return;
    }
    if (raw === "library") {
      setAdminTab("library");
      activeLibraryTab = "my-library";
      renderLibrarySubtab();
      return;
    }
    setAdminTab("playlists");
  }

  function revokeDailySparkObjectUrl() {
    if (dailySparkState.objectUrl) {
      try {
        URL.revokeObjectURL(dailySparkState.objectUrl);
      } catch (_rev) {}
      dailySparkState.objectUrl = null;
    }
  }

  function readDailySparkListenRecorded() {
    try {
      return localStorage.getItem(PREF_DAILY_SPARK_LISTEN_KEY) || "";
    } catch (_e) {
      return "";
    }
  }

  function writeDailySparkListenRecorded(sparkId) {
    try {
      localStorage.setItem(PREF_DAILY_SPARK_LISTEN_KEY, sparkId);
    } catch (_e2) {}
  }

  function isDailySparkActiveAudio() {
    var id = (activeAudioScriptId && String(activeAudioScriptId)) || "";
    return !!activeAudio && id.indexOf("daily_spark_") === 0;
  }

  function isDailySparkTransportPlaying() {
    return isDailySparkActiveAudio() && !activeAudio.paused;
  }

  function refreshHomeDailySparkTransportIfVisible() {
    if (activeAdminTab === "home" && homeFlowStep === "landing" && currentUser) {
      renderHomeFlow((currentUser && currentUser.displayName) || "");
    }
  }

  function homeDailySparkTransportIconHtml(isPlaying) {
    if (isPlaying) {
      return (
        '<span class="home-daily-spark-play" aria-hidden="true">' +
        '<svg width="28" height="28" viewBox="0 0 24 24" fill="#60a5fa">' +
        '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>' +
        "</svg></span>"
      );
    }
    return (
      '<span class="home-daily-spark-play" aria-hidden="true">' +
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="#60a5fa">' +
      '<path d="M8 5v14l11-7z"/>' +
      "</svg></span>"
    );
  }

  function dailySparkSubtitleWeb() {
    var spark = dailySparkState.spark;
    if (spark) {
      var media = [];
      if (spark.voiceName) media.push(spark.voiceName);
      if (spark.backgroundName) media.push(spark.backgroundName);
      if (media.length) return media.join(" · ");
      if (spark.scriptText) {
        var line = String(spark.scriptText).trim().split("\n")[0];
        if (line) return line.length > 80 ? line.slice(0, 77) + "\u2026" : line;
      }
    }
    if (dailySparkState.loading) return "Loading today's spark\u2026";
    if (dailySparkState.error) return dailySparkState.error;
    var ls = webListeningStats || normalizeListeningDoc({});
    var eff = effectiveStreakDisplayed(ls);
    if (eff > 0) return "Keep your " + eff + "-day streak going.";
    return "A short affirmation to start your day.";
  }

  function dailySparkFromFirestoreDoc(data) {
    if (!data || data.status !== "ready" || !data.sparkId) return null;
    return {
      sparkId: data.sparkId,
      title: data.title || "Daily Spark",
      scriptText: data.scriptText || "",
      wordCount: data.wordCount || 0,
      voiceID: data.voiceID || null,
      voiceName: data.voiceName || null,
      backgroundID: data.backgroundID || null,
      backgroundName: data.backgroundName || null,
      ttsDownloadURL: data.ttsDownloadURL || null,
      listenCount: data.listenCount || 0,
    };
  }

  function dailySparkStatusMessageFromDoc(data) {
    if (!data) return "Daily Spark is being prepared. Check back in a moment.";
    if (data.status === "generating") return "Today's Daily Spark is being prepared.";
    if (data.status === "failed") {
      return (data.error && String(data.error).trim()) || "Daily Spark generation failed.";
    }
    if (data.status === "ready") return null;
    return "Daily Spark is being prepared. Check back in a moment.";
  }

  function bootstrapDailySparkViaApi() {
    if (!currentUser) return;
    currentUser
      .getIdToken(false)
      .then(function (token) {
        return backendGet("/daily-spark/current", token);
      })
      .catch(function () {});
  }

  function fetchDailySparkCurrentViaApi() {
    return currentUser
      .getIdToken(false)
      .then(function (token) {
        return backendGet("/daily-spark/current", token);
      })
      .then(function (json) {
        dailySparkState.spark = (json && json.spark) || null;
        dailySparkState.lastFetchMs = Date.now();
        if (!dailySparkState.spark && json && json.message) {
          dailySparkState.error = json.message;
        }
        return dailySparkState.spark;
      });
  }

  function fetchDailySparkTtsBufferFromUrl(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("Could not download Daily Spark audio.");
      return r.arrayBuffer();
    });
  }

  function fetchDailySparkTtsBuffer(spark) {
    if (!currentUser || !spark || !spark.sparkId) {
      return Promise.reject(new Error("Sign in to play Daily Spark."));
    }
    var directUrl = (spark.ttsDownloadURL && String(spark.ttsDownloadURL).trim()) || "";
    return currentUser.getIdToken(false).then(function (token) {
      var proxyUrl =
        backendBaseURL() +
        "/daily-spark/audio?sparkId=" +
        encodeURIComponent(spark.sparkId);
      return fetch(proxyUrl, {
        method: "GET",
        headers: { Authorization: "Bearer " + token },
      })
        .then(function (r) {
          if (r.ok) return r.arrayBuffer();
          if (r.status === 404 && directUrl) {
            return fetchDailySparkTtsBufferFromUrl(directUrl);
          }
          return r.text().then(function (text) {
            var json = null;
            try {
              json = JSON.parse(text);
            } catch (_e) {}
            throw new Error(
              (json && json.error) || text || "Could not download Daily Spark audio."
            );
          });
        })
        .catch(function (e) {
          if (directUrl && isNetworkFetchFailure(e)) {
            return fetchDailySparkTtsBufferFromUrl(directUrl);
          }
          if (isNetworkFetchFailure(e)) {
            throw new Error(
              "Could not download Daily Spark audio. Check your connection and try disabling ad blockers for focushift.app."
            );
          }
          throw e;
        });
    });
  }

  function prepareDailySparkPlayback(spark) {
    revokeDailySparkObjectUrl();
    if (!spark || !spark.sparkId) {
      return Promise.reject(new Error("Daily Spark audio is not ready yet."));
    }
    return fetchDailySparkTtsBuffer(spark).then(function (ttsAb) {
      var bg = (spark.backgroundID && String(spark.backgroundID).trim()) || "";
      if (!bg || bg === "bg-none") {
        dailySparkState.objectUrl = URL.createObjectURL(new Blob([ttsAb], { type: "audio/mpeg" }));
        return dailySparkState.objectUrl;
      }
      return mixTtsWithBackgroundToWavBlob(ttsAb, bg)
        .then(function (wavBlob) {
          dailySparkState.objectUrl = URL.createObjectURL(wavBlob);
          return dailySparkState.objectUrl;
        })
        .catch(function () {
          dailySparkState.objectUrl = URL.createObjectURL(new Blob([ttsAb], { type: "audio/mpeg" }));
          return dailySparkState.objectUrl;
        });
    });
  }

  function fetchDailySparkCurrent(force) {
    if (!currentUser || !isWebPaidTierForAI()) {
      dailySparkState.spark = null;
      return Promise.resolve(null);
    }
    if (dailySparkState.loading) return Promise.resolve(dailySparkState.spark);
    if (
      !force &&
      dailySparkState.lastFetchMs &&
      Date.now() - dailySparkState.lastFetchMs < 120000 &&
      dailySparkState.spark
    ) {
      return Promise.resolve(dailySparkState.spark);
    }
    dailySparkState.loading = true;
    dailySparkState.error = null;
    return db
      .collection("config")
      .doc("dailySpark")
      .get()
      .then(function (snap) {
        var data = snap.exists ? snap.data() : null;
        var spark = dailySparkFromFirestoreDoc(data);
        dailySparkState.lastFetchMs = Date.now();
        if (spark) {
          dailySparkState.spark = spark;
          dailySparkState.error = null;
          return spark;
        }
        dailySparkState.spark = null;
        var statusMsg = dailySparkStatusMessageFromDoc(data);
        if (statusMsg) dailySparkState.error = statusMsg;
        bootstrapDailySparkViaApi();
        return null;
      })
      .catch(function () {
        return fetchDailySparkCurrentViaApi().catch(function (e) {
          dailySparkState.error = e.message || "Could not load Daily Spark.";
          dailySparkState.spark = null;
          return null;
        });
      })
      .finally(function () {
        dailySparkState.loading = false;
        if (activeAdminTab === "home" && homeFlowStep === "landing") {
          renderHomeFlow((currentUser && currentUser.displayName) || "");
        }
      });
  }

  function recordDailySparkListen(sparkId) {
    if (!currentUser || !sparkId || readDailySparkListenRecorded() === sparkId) {
      return Promise.resolve();
    }
    return currentUser
      .getIdToken(false)
      .then(function (token) {
        return backendRequest("/daily-spark/listen", token, { sparkId: sparkId });
      })
      .then(function () {
        writeDailySparkListenRecorded(sparkId);
      })
      .catch(function () {});
  }

  function playDailySparkWeb() {
    if (!isWebPaidTierForAI()) {
      setMessage("Daily Spark requires Starter or Creator.", "info");
      openAccountModal();
      return;
    }
    if (isDailySparkActiveAudio()) {
      if (activeAudio.paused) {
        activeAudio.play().catch(function () {
          setMessage("Could not play Daily Spark.", "error");
        });
      } else {
        activeAudio.pause();
      }
      updateMiniPlayer();
      refreshHomeDailySparkTransportIfVisible();
      return;
    }
    if (dailySparkState.loading || dailySparkState.playing) return;
    dailySparkState.playing = true;
    refreshHomeDailySparkTransportIfVisible();
    fetchDailySparkCurrent(true)
      .then(function (spark) {
        if (!spark) {
          throw new Error(dailySparkState.error || "Daily Spark is not ready yet.");
        }
        return prepareDailySparkPlayback(spark).then(function (url) {
          var script = {
            id: "daily_spark_" + spark.sparkId,
            title: spark.title || "Daily Spark",
            text: spark.scriptText || "",
            audioURL: url,
            voiceID: spark.voiceID,
            backgroundID: spark.backgroundID,
          };
          togglePlayScriptAudio(script);
          recordDailySparkListen(spark.sparkId);
        });
      })
      .catch(function (e) {
        setMessage(e.message || "Could not play Daily Spark.", "error");
      })
      .finally(function () {
        dailySparkState.playing = false;
        if (activeAdminTab === "home" && homeFlowStep === "landing") {
          renderHomeFlow((currentUser && currentUser.displayName) || "");
        }
      });
  }

  function closeListenTodayModal() {
    var bd = document.getElementById("listen-today-backdrop");
    if (bd) bd.hidden = true;
  }

  function openListenTodayModal() {
    var bd = document.getElementById("listen-today-backdrop");
    var host = document.getElementById("listen-today-modal-body");
    if (!bd || !host) return;
    var ls = webListeningStats || normalizeListeningDoc({});
    var hasLast = !!(ls.lastPlayedAudioURL && String(ls.lastPlayedAudioURL).trim());
    var scriptsPlayable = currentScripts.filter(function (s) {
      return !!(s.audioURL && String(s.audioURL).trim());
    });
    var parts = [];
    parts.push(
      '<p class="app-muted" style="margin:0 0 0.65rem;font-size:0.86rem;">Manage your Listen Today shortcut (Account → Preferences). On iOS, this shortcut is used when a daily reminder fires; on web you can run it from here.</p>'
    );
    parts.push(
      '<button type="button" class="app-btn app-btn-primary listen-today-block-btn" id="listen-today-run-shortcut">Run Listen Today shortcut now</button>'
    );
    parts.push('<div class="listen-today-modal-section"><strong>Replay</strong>');
    parts.push(
      '<button type="button" class="app-btn app-btn-secondary listen-today-block-btn" id="listen-today-replay-last"' +
        (hasLast ? "" : " disabled") +
        ">Last played session</button></div>"
    );
    parts.push('<div class="listen-today-modal-section"><strong>Play a library track now</strong>');
    if (!scriptsPlayable.length) {
      parts.push('<p class="app-muted" style="margin:0.35rem 0 0;font-size:0.82rem;">No scripts with audio yet — generate audio in Library.</p>');
    } else {
      parts.push(
        '<div class="listen-today-script-actions">' +
          scriptsPlayable
            .map(function (s) {
              return (
                '<div class="listen-today-script-actions-row">' +
                '<span class="listen-today-script-actions-title">' +
                escapeHtml(s.title || "Script") +
                "</span>" +
                '<span class="listen-today-script-actions-btns">' +
                '<button type="button" class="app-btn app-btn-secondary listen-today-script-pick" data-listen-script-id="' +
                escapeHtml(s.id) +
                '">Play</button>' +
                '<button type="button" class="app-btn app-btn-ghost listen-today-script-shortcut" data-listen-script-id="' +
                escapeHtml(s.id) +
                '">Set shortcut</button>' +
                "</span></div>"
              );
            })
            .join("") +
          "</div>"
      );
    }
    parts.push("</div>");
    parts.push('<div class="listen-today-modal-section"><strong>Listen Today shortcut target</strong>');
    parts.push(
      '<p class="app-muted" style="margin:0.25rem 0 0.45rem;font-size:0.8rem;">Saved in this browser. Fine-tune in <strong>Account → Preferences</strong> (playlist or library track).</p>'
    );
    parts.push(
      '<div style="display:flex;flex-direction:column;gap:0.35rem;">' +
        '<button type="button" class="app-btn app-btn-secondary listen-today-block-btn" id="listen-today-shortcut-library">Open <strong>Library</strong> tab</button>' +
        '<button type="button" class="app-btn app-btn-secondary listen-today-block-btn" id="listen-today-shortcut-playlists">Open <strong>Playlists</strong> tab</button>' +
        "</div>"
    );
    if (currentPlaylists.length) {
      parts.push('<p class="app-muted" style="margin:0.55rem 0 0.35rem;font-size:0.8rem;">Or quick-start a playlist:</p>');
      parts.push(
        '<div class="app-modal-list listen-today-playlist-scroll">' +
          currentPlaylists
            .map(function (p) {
              return (
                '<button type="button" class="app-modal-list-item listen-today-set-playlist" data-playlist-id="' +
                escapeHtml(p.id) +
                '" data-playlist-name="' +
                escapeHtml(p.name || "Playlist") +
                '">' +
                escapeHtml(p.name || "Playlist") +
                "</button>"
              );
            })
            .join("") +
          "</div>"
      );
    } else {
      parts.push('<p class="app-muted" style="margin:0.55rem 0 0;font-size:0.8rem;">Create a playlist first to use a playlist shortcut.</p>');
    }
    parts.push("</div>");
    host.innerHTML = parts.join("");
    var runShortcut = document.getElementById("listen-today-run-shortcut");
    if (runShortcut) {
      runShortcut.addEventListener("click", function () {
        closeListenTodayModal();
        performListenTodayPrimaryAction();
      });
    }
    var replay = document.getElementById("listen-today-replay-last");
    if (replay) {
      replay.addEventListener("click", function () {
        closeListenTodayModal();
        playLastListenedAgain();
      });
    }
    host.querySelectorAll(".listen-today-script-pick").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var sid = btn.getAttribute("data-listen-script-id");
        var script = currentScripts.find(function (s) {
          return s.id === sid;
        });
        closeListenTodayModal();
        if (script) {
          setAdminTab("library");
          activeLibraryTab = "my-library";
          renderLibrarySubtab();
          togglePlayScriptAudio(script);
        }
      });
    });
    host.querySelectorAll(".listen-today-script-shortcut").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var sid = btn.getAttribute("data-listen-script-id");
        var script = currentScripts.find(function (s) {
          return s.id === sid;
        });
        if (!script) return;
        writeListenShortcutScript(sid, script.title || "Script");
        closeListenTodayModal();
        syncListenShortcutPreferenceUi();
        if (activeAdminTab === "home") renderHomeFlow((currentUser && currentUser.displayName) || "");
        generationMessage(
          'Shortcut will play "' + (script.title || "Script") + '". Use Preferences to switch targets.',
          "success"
        );
      });
    });
    document.getElementById("listen-today-shortcut-library").addEventListener("click", function () {
      writeListenShortcutTab("library");
      syncListenShortcutPreferenceUi();
      closeListenTodayModal();
      if (activeAdminTab === "home") renderHomeFlow((currentUser && currentUser.displayName) || "");
      generationMessage("Shortcut will open your Library tab.", "success");
    });
    document.getElementById("listen-today-shortcut-playlists").addEventListener("click", function () {
      writeListenShortcutTab("playlists");
      syncListenShortcutPreferenceUi();
      closeListenTodayModal();
      if (activeAdminTab === "home") renderHomeFlow((currentUser && currentUser.displayName) || "");
      generationMessage("Shortcut will open your Playlists tab.", "success");
    });
    host.querySelectorAll(".listen-today-set-playlist").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-playlist-id");
        var nm = btn.getAttribute("data-playlist-name") || "Playlist";
        writeListenShortcutPlaylist(id, nm);
        closeListenTodayModal();
        syncListenShortcutPreferenceUi();
        if (activeAdminTab === "home") renderHomeFlow((currentUser && currentUser.displayName) || "");
        generationMessage('Shortcut set — use Manage Listen Today shortcut to play "' + nm + '".', "success");
      });
    });
    bd.hidden = false;
  }

  function recomputeStreakFromStamps(stamps) {
    if (!stamps || !stamps.length) {
      return { streak: 0, lastPlayDateMs: null };
    }
    var daysWithPlay = {};
    stamps.forEach(function (t) {
      var sec = Number(t);
      if (!isFinite(sec)) return;
      var key = startOfLocalDayMs(new Date(sec * 1000));
      daysWithPlay[key] = true;
    });
    var lastTs = Math.max.apply(
      null,
      stamps.map(function (x) {
        return Number(x);
      })
    );
    var lastPlayDateMs = Math.floor(lastTs * 1000);
    var today = new Date();
    var todayStart = startOfLocalDayMs(today);
    var yest = new Date(today);
    yest.setDate(yest.getDate() - 1);
    var yesterdayStart = startOfLocalDayMs(yest);
    var anchorStart = null;
    if (daysWithPlay[todayStart]) anchorStart = todayStart;
    else if (daysWithPlay[yesterdayStart]) anchorStart = yesterdayStart;
    else return { streak: 0, lastPlayDateMs: lastPlayDateMs };
    var streak = 0;
    var d = anchorStart;
    while (true) {
      if (!daysWithPlay[d]) break;
      streak++;
      var prev = new Date(d);
      prev.setDate(prev.getDate() - 1);
      d = startOfLocalDayMs(prev);
    }
    return { streak: streak, lastPlayDateMs: lastPlayDateMs };
  }

  function highestPlayMilestone(playCount) {
    var n = Math.max(0, intFromFirestoreListening(playCount));
    if (n >= 100) {
      return { title: "Centurion", subtitle: "100 plays", category: "Total listens", tone: "gold", icon: "star" };
    }
    if (n >= 25) {
      return { title: "Devotee", subtitle: "25 plays", category: "Total listens", tone: "pink", icon: "heart" };
    }
    if (n >= 10) {
      return { title: "Listener", subtitle: "10 plays", category: "Total listens", tone: "purple", icon: "headphones" };
    }
    if (n >= 3) {
      return {
        title: "Getting Started",
        subtitle: "3 plays",
        category: "Total listens",
        tone: "green",
        icon: "sparkles",
      };
    }
    if (n >= 1) {
      return { title: "First Step", subtitle: "1 play", category: "Total listens", tone: "blue", icon: "play" };
    }
    return null;
  }

  function highestStreakMilestone(streak) {
    var s = Math.max(0, intFromFirestoreListening(streak));
    if (s >= 30) {
      return {
        title: "30-Day Streak",
        subtitle: "30 days in a row",
        category: "Consecutive days",
        tone: "red",
        icon: "flame",
      };
    }
    if (s >= 14) {
      return {
        title: "2-Week Streak",
        subtitle: "14 days in a row",
        category: "Consecutive days",
        tone: "red",
        icon: "flame",
      };
    }
    if (s >= 7) {
      return {
        title: "7-Day Streak",
        subtitle: "7 days in a row",
        category: "Consecutive days",
        tone: "orange",
        icon: "flame",
      };
    }
    if (s >= 3) {
      return {
        title: "3-Day Streak",
        subtitle: "3 days in a row",
        category: "Consecutive days",
        tone: "orange",
        icon: "flame",
      };
    }
    return null;
  }

  function homeDashboardIconSvg(kind) {
    var common =
      ' xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"';
    switch (kind) {
      case "flame":
        return (
          "<svg" + common + ' fill="currentColor"><path d="M12 2c1 4 4 6.5 4 10a4 4 0 1 1-8 0c0-3.5 3-6 4-10z"/></svg>'
        );
      case "headphones":
        return (
          "<svg" +
          common +
          ' fill="none" stroke="currentColor" stroke-width="2"><path d="M3 14v3a2 2 0 0 0 2 2h1"/><path d="M21 14v3a2 2 0 0 1-2 2h-1"/><path d="M3 14a8 8 0 0 1 16 0"/></svg>'
        );
      case "crown":
        return (
          "<svg" +
          common +
          ' fill="currentColor"><path d="M3 8l3 4 3-6 3 6 3-4 3 6v4H3V8z"/></svg>'
        );
      case "play":
        return (
          "<svg" + common + ' fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'
        );
      case "star":
        return (
          "<svg" +
          common +
          ' fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
        );
      case "heart":
        return (
          "<svg" +
          common +
          ' fill="currentColor"><path d="M12 21s-7-4.5-9.5-9C1 8 3 5 6.5 5 9 5 12 8 12 8s3-3 5.5-3C21 5 23 8 21.5 12 19 16.5 12 21 12 21z"/></svg>'
        );
      case "sparkles":
        return (
          "<svg" +
          common +
          ' fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.2 3.6L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3z"/><path d="M5 16l.6 1.8L7.4 19l-1.8.6L5 21.4l-.6-1.8L2.6 19l1.8-.6L5 16z"/></svg>'
        );
      case "bell-off":
        return (
          "<svg" +
          common +
          ' fill="none" stroke="currentColor" stroke-width="2"><path d="M13 17H5"/><path d="M18 17h-1"/><path d="M6 10a6 6 0 0 1 11.3-2.8"/><path d="M3 3l18 18"/></svg>'
        );
      case "chev-right":
        return (
          "<svg" +
          common +
          ' fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>'
        );
      case "chev-down":
        return (
          "<svg" +
          common +
          ' fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>'
        );
      case "chev-up":
        return (
          "<svg" +
          common +
          ' fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>'
        );
      case "dashed":
        return (
          "<svg" +
          common +
          ' fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3"><circle cx="12" cy="12" r="8"/></svg>'
        );
      default:
        return (
          "<svg" + common + ' fill="currentColor"><circle cx="12" cy="12" r="4"/></svg>'
        );
    }
  }

  function homeDashboardMilestoneRowHtml(badge, placeholderHint) {
    if (!badge) {
      return (
        '<div class="home-dashboard-milestone-row is-placeholder">' +
        '<span class="home-dashboard-milestone-icon">' +
        homeDashboardIconSvg("dashed") +
        "</span>" +
        '<div class="home-dashboard-milestone-copy">' +
        '<span class="home-dashboard-milestone-cat">' +
        escapeHtml(placeholderHint.category) +
        "</span>" +
        '<span class="home-dashboard-milestone-title">No milestone yet</span>' +
        '<span class="home-dashboard-milestone-sub">' +
        escapeHtml(placeholderHint.hint) +
        "</span>" +
        "</div></div>"
      );
    }
    return (
      '<div class="home-dashboard-milestone-row tone-' +
      escapeHtml(badge.tone) +
      '">' +
      '<span class="home-dashboard-milestone-icon">' +
      homeDashboardIconSvg(badge.icon) +
      "</span>" +
      '<div class="home-dashboard-milestone-copy">' +
      '<span class="home-dashboard-milestone-cat">' +
      escapeHtml(badge.category) +
      "</span>" +
      '<span class="home-dashboard-milestone-title">' +
      escapeHtml(badge.title) +
      "</span>" +
      '<span class="home-dashboard-milestone-sub">' +
      escapeHtml(badge.subtitle) +
      "</span>" +
      "</div></div>"
    );
  }

  function buildHomeDashboardCardHtml(ls) {
    var period = readHomePlaysPeriod();
    var effStreak = effectiveStreakDisplayed(ls);
    var playsShown = playsCountForHomePeriod(ls, period);
    var periodParen = escapeHtml(homePlaysPeriodParen(period));
    var bestStreak = intFromFirestoreListening(ls.bestStreakCount);
    var bestStreakInline =
      bestStreak > 0
        ? ' <span class="home-dashboard-best">(best: ' + escapeHtml(String(bestStreak)) + ")</span>"
        : "";
    var tier = resolvedSubscriptionTier();
    var tierClass =
      tier === "creator" ? "is-creator" : tier === "starter" ? "is-starter" : "is-free";
    var upgradeHtml =
      tier !== "creator"
        ? ' <button type="button" class="home-dashboard-upgrade-btn" id="home-dashboard-upgrade">Upgrade</button>'
        : "";
    var lastTitle = (ls.lastPlayedTitle && String(ls.lastPlayedTitle).trim()) || "";
    var lastTime = (ls.lastPlayedTime && String(ls.lastPlayedTime).trim()) || "";
    var hasLastPlayUrl = !!(ls.lastPlayedAudioURL && String(ls.lastPlayedAudioURL).trim());
    var lastPlayedHtml = "";
    if (lastTitle || lastTime) {
      lastPlayedHtml =
        '<div class="home-dashboard-divider"></div>' +
        '<button type="button" class="home-dashboard-row-btn" id="home-last-played"' +
        (hasLastPlayUrl ? "" : " disabled") +
        ' title="' +
        (hasLastPlayUrl ? "Play last listened track" : "Last played track unavailable in this browser") +
        '">' +
        '<span class="home-dashboard-row-icon is-play">' +
        homeDashboardIconSvg("play") +
        "</span>" +
        '<span class="home-dashboard-row-main">Last: ' +
        escapeHtml(lastTitle || "Untitled") +
        "</span>" +
        '<span class="home-dashboard-row-meta">' +
        escapeHtml(lastTime) +
        "</span>" +
        "</button>";
    }
    var pm = highestPlayMilestone(ls.playCount);
    var sm = highestStreakMilestone(effStreak);
    var milestonesHtml = "";
    if (pm || sm) {
      var badgeIcons = "";
      if (pm) {
        badgeIcons +=
          '<span class="home-dashboard-badge-chip tone-' +
          escapeHtml(pm.tone) +
          '">' +
          homeDashboardIconSvg(pm.icon) +
          "</span>";
      }
      if (sm) {
        badgeIcons +=
          '<span class="home-dashboard-badge-chip tone-' +
          escapeHtml(sm.tone) +
          '">' +
          homeDashboardIconSvg(sm.icon) +
          "</span>";
      }
      milestonesHtml =
        '<div class="home-dashboard-divider"></div>' +
        '<div class="home-dashboard-milestones-wrap">' +
        '<button type="button" class="home-dashboard-milestones-toggle" id="home-milestones-toggle" aria-expanded="' +
        (homeDashboardBadgesExpanded ? "true" : "false") +
        '">' +
        '<span class="home-dashboard-milestones-label">Listening milestones</span>' +
        '<span class="home-dashboard-badge-chips">' +
        badgeIcons +
        "</span>" +
        '<span class="home-dashboard-milestones-chev">' +
        homeDashboardIconSvg(homeDashboardBadgesExpanded ? "chev-up" : "chev-down") +
        "</span>" +
        "</button>" +
        (homeDashboardBadgesExpanded
          ? '<div class="home-dashboard-milestones-panel">' +
            '<p class="home-dashboard-milestones-hint">Your highest milestone in each category.</p>' +
            homeDashboardMilestoneRowHtml(pm, {
              category: "Total listens",
              hint: "1 play to earn First Step",
            }) +
            homeDashboardMilestoneRowHtml(sm, {
              category: "Consecutive days",
              hint: "3 days in a row to earn first streak badge",
            }) +
            "</div>"
          : "") +
        "</div>";
    }
    return (
      '<div class="app-glass-card home-dashboard-card">' +
      '<div class="home-dashboard-body">' +
      '<div class="home-dashboard-stats-row">' +
      '<span class="home-dashboard-inline-stat tone-orange">' +
      '<span class="home-dashboard-stat-icon">' +
      homeDashboardIconSvg("flame") +
      "</span>" +
      "<span>" +
      escapeHtml(String(effStreak)) +
      "-day streak" +
      bestStreakInline +
      "</span></span>" +
      '<button type="button" class="home-dashboard-inline-stat home-dashboard-plays-btn tone-purple" id="home-plays-period" title="Tap to cycle: week → month → year → all time">' +
      '<span class="home-dashboard-stat-icon">' +
      homeDashboardIconSvg("headphones") +
      "</span>" +
      "<span>" +
      escapeHtml(String(playsShown)) +
      " plays " +
      periodParen +
      "</span></button>" +
      "</div>" +
      '<div class="home-dashboard-plan-row">' +
      '<span class="home-dashboard-plan-pill ' +
      tierClass +
      '">' +
      '<span class="home-dashboard-stat-icon">' +
      homeDashboardIconSvg("crown") +
      "</span>" +
      escapeHtml(subscriptionTierDisplayName()) +
      "</span>" +
      upgradeHtml +
      "</div>" +
      lastPlayedHtml +
      milestonesHtml +
      '<div class="home-dashboard-divider"></div>' +
      '<button type="button" class="home-dashboard-row-btn" id="home-reminders-row" title="Daily reminders are set up in the iOS app">' +
      '<span class="home-dashboard-row-icon">' +
      homeDashboardIconSvg("bell-off") +
      "</span>" +
      '<span class="home-dashboard-row-main">Daily reminders off</span>' +
      '<span class="home-dashboard-row-chev">' +
      homeDashboardIconSvg("chev-right") +
      "</span>" +
      "</button>" +
      "</div></div>"
    );
  }

  function formatLastPlayedNow() {
    try {
      return new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    } catch (_e) {
      return String(new Date());
    }
  }

  function recordWebListen(title, audioUrl) {
    if (!currentUser || !currentUser.uid) return Promise.resolve();
    var uid = currentUser.uid;
    var ref = listeningMetaDocRef(uid);
    var titleStr = (title && String(title).trim()) || "Listening";
    var urlStr = (audioUrl && String(audioUrl).trim()) || "";
    var timeStr = formatLastPlayedNow();
    return db
      .runTransaction(function (tx) {
        return tx.get(ref).then(function (snap) {
          var data = snap.exists ? snap.data() || {} : {};
          var stamps = parsePlayDateStampsFromDoc(data.playDateStamps);
          stamps.push(Date.now() / 1000);
          if (stamps.length > 500) stamps = stamps.slice(-500);
          var rec = recomputeStreakFromStamps(stamps);
          var bestPrev = intFromFirestoreListening(data.bestStreakCount);
          var best = Math.max(bestPrev, rec.streak);
          var upd = {
            playCount: firebase.firestore.FieldValue.increment(1),
            playDateStamps: stamps,
            streakCount: rec.streak,
            bestStreakCount: best,
            lastPlayedTitle: titleStr,
            lastPlayedTime: timeStr,
            lastPlayedAudioURL: urlStr,
          };
          if (rec.lastPlayDateMs != null) {
            upd.lastPlayDate = firebase.firestore.Timestamp.fromMillis(rec.lastPlayDateMs);
          }
          tx.set(ref, upd, { merge: true });
        });
      })
      .catch(function (_e) {});
  }

  function playLastListenedAgain() {
    var s = webListeningStats;
    var url = s && s.lastPlayedAudioURL ? String(s.lastPlayedAudioURL).trim() : "";
    if (!url) return;
    stopActiveAudio();
    activeAudio = new Audio(url);
    applyPlaybackVolumeToActiveAudio();
    activeAudioScriptId = null;
    activeAudioTitle = (s.lastPlayedTitle && String(s.lastPlayedTitle).trim()) || "Listen again";
    bindAudioLifecycle();
    activeAudio
      .play()
      .then(function () {
        updateMiniPlayer();
        renderScripts(currentScripts);
        renderSelectedPlaylistDetail();
        refreshHomeDailySparkTransportIfVisible();
        var t = (s.lastPlayedTitle && String(s.lastPlayedTitle).trim()) || "Listen again";
        recordWebListen(t, url);
      })
      .catch(function () {
        stopActiveAudio();
        generationMessage("Could not play last listened track in browser.", "error");
      });
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

  function backgroundCatalogCollection() {
    return db.collection("backgroundCatalog");
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

  var clientErrorReportingInstalled = false;
  function reportClientError(message, feature, extra) {
    if (!currentUser) return;
    var text = message ? String(message).slice(0, 500) : "client error";
    currentUser
      .getIdToken(false)
      .then(function (token) {
        return fetch(backendBaseURL() + "/telemetry/client-error", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({
            message: text,
            platform: "web",
            feature: feature || "general",
            page: window.location.pathname + window.location.search,
            extra: extra || null,
          }),
        });
      })
      .catch(function () {});
  }

  var catalogCostDebounceByKey = {};
  var CATALOG_COST_DEBOUNCE_MS = 120000;

  function isFirebaseStorageUrl(urlString) {
    if (!urlString) return false;
    try {
      var host = new URL(String(urlString)).hostname.toLowerCase();
      return host.indexOf("firebasestorage") >= 0 || host.indexOf("storage.googleapis.com") >= 0;
    } catch (_e) {
      return false;
    }
  }

  function inferCatalogCostKind(urlString, fallbackKind) {
    var raw = String(urlString || "").toLowerCase();
    if (raw.indexOf("premadeaudio") >= 0) {
      return fallbackKind === "premade_download" ? "premade_download" : "premade_play";
    }
    if (raw.indexOf("backgroundcatalog") >= 0) {
      return fallbackKind === "background_mix" ? "background_mix" : "background_preview";
    }
    if (raw.indexOf("/audios/") >= 0) {
      return fallbackKind === "user_audio_download" ? "user_audio_download" : "user_audio_play";
    }
    return fallbackKind;
  }

  function estimateFirebaseStorageBytes(urlString) {
    if (!isFirebaseStorageUrl(urlString)) return Promise.resolve(0);
    return fetch(String(urlString).trim(), { method: "HEAD" })
      .then(function (r) {
        var cl = r.headers.get("content-length");
        var n = cl ? parseInt(cl, 10) : 0;
        return Number.isFinite(n) && n > 0 ? n : 0;
      })
      .catch(function () {
        return 0;
      });
  }

  function reportCatalogStorageCost(urlString, bytes, kind) {
    if (!currentUser || !urlString || !bytes || bytes <= 0) return;
    if (!isFirebaseStorageUrl(urlString)) return;
    var resolvedKind = inferCatalogCostKind(urlString, kind || "user_audio_play");
    var key = resolvedKind + "|" + String(urlString);
    var now = Date.now();
    if (catalogCostDebounceByKey[key] && now - catalogCostDebounceByKey[key] < CATALOG_COST_DEBOUNCE_MS) {
      return;
    }
    catalogCostDebounceByKey[key] = now;
    currentUser
      .getIdToken(false)
      .then(function (token) {
        return fetch(backendBaseURL() + "/usage/catalog-cost", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({
            events: [{ kind: resolvedKind, bytes: Math.min(Math.floor(bytes), 80 * 1024 * 1024), url: urlString }],
          }),
        });
      })
      .catch(function () {});
  }

  function reportCatalogStorageCostFromUrl(urlString, kind) {
    return estimateFirebaseStorageBytes(urlString).then(function (bytes) {
      if (bytes > 0) reportCatalogStorageCost(urlString, bytes, kind);
    });
  }

  function installClientErrorReporting() {
    if (clientErrorReportingInstalled) return;
    clientErrorReportingInstalled = true;
    window.addEventListener("error", function (ev) {
      reportClientError(ev.message || "window error", "general", {
        source: ev.filename || "",
      });
    });
    window.addEventListener("unhandledrejection", function (ev) {
      var msg =
        ev.reason && ev.reason.message
          ? ev.reason.message
          : String(ev.reason || "unhandled rejection");
      reportClientError(msg, "general");
    });
  }
  installClientErrorReporting();

  function readAdminModeEnabled() {
    try {
      return localStorage.getItem(PREF_ADMIN_MODE_KEY) === "1";
    } catch (_e) {
      return false;
    }
  }

  function writeAdminModeEnabled(on) {
    adminModeEnabled = !!on;
    try {
      if (adminModeEnabled) {
        localStorage.setItem(PREF_ADMIN_MODE_KEY, "1");
      } else {
        localStorage.removeItem(PREF_ADMIN_MODE_KEY);
      }
    } catch (_e) {}
    applyAdminModeUi();
  }

  function applyAdminModeUi() {
    var banner = document.getElementById("admin-mode-banner");
    if (banner) {
      banner.hidden = !adminModeEnabled;
    }
    var pub = document.getElementById("btn-open-publish-premade");
    if (pub) {
      pub.style.display = adminModeEnabled ? "" : "none";
    }
    var chk = document.getElementById("pref-admin-mode");
    if (chk) {
      chk.checked = adminModeEnabled;
    }
    if (!adminModeEnabled) {
      closePublishPremadeModal();
      closeEditPremadeModal();
      closeBackgroundPublishModal();
    }
    if (document.getElementById("premade-list")) {
      renderPremade();
    }
    if (document.getElementById("audio-app-list")) {
      renderAudioPage();
    }
    if (document.getElementById("voices-list")) {
      renderVoices();
    }
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
    teardownBackgroundCatalogListener();
    teardownClonedVoicesListener();
    teardownListeningListener();
    teardownUserProfileListener();
    if (typeof userBackgroundsUnsubscribe === "function") {
      userBackgroundsUnsubscribe();
      userBackgroundsUnsubscribe = null;
    }
    currentCloudUserBackgrounds = [];
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
    teardownBackgroundCatalogListener();
    teardownClonedVoicesListener();
    teardownListeningListener();
    teardownUserProfileListener();
    if (typeof userBackgroundsUnsubscribe === "function") {
      userBackgroundsUnsubscribe();
      userBackgroundsUnsubscribe = null;
    }
    currentCloudUserBackgrounds = [];
    root.innerHTML =
      "<h1>You're signed in</h1>" +
      "<p class=\"app-muted\">Hi " +
      escapeHtml(displayName || email || "there") +
      ". Full Focus Shift tools on the web are <strong>coming soon</strong>. For now, use the iOS app for playlists, audio generation, and your full library.</p>" +
      (email && email.indexOf("@privaterelay.appleid.com") !== -1
        ? '<p class="app-muted">This looks like a <strong>new</strong> Apple sign-in (Hide My Email). If you already have an account with email on iOS or web, sign out and sign in with that email instead.</p>'
        : "") +
      "<p class=\"app-muted\">Signed in as <strong>" +
      escapeHtml(email || "") +
      "</strong></p>" +
      '<p style="margin-top:2rem"><button type="button" class="auth-btn auth-btn-primary" id="btn-out">Sign out</button></p>';
    document.getElementById("btn-out").addEventListener("click", function () {
      auth.signOut().then(redirectLogin);
    });
  }

  function screenHelpIconSvg() {
    return (
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>' +
      "</svg>"
    );
  }

  function accountGearIconSvg() {
    return (
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.52-.4-1.08-.73-1.69-.98l-.36-2.54a.484.484 0 0 0-.48-.41h-3.8c-.24 0-.43.17-.47.41l-.36 2.54c-.61.25-1.17.59-1.69.98l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.52.4 1.08.73 1.69.98l.36 2.54c.05.24.24.41.48.41h3.8c.24 0 .44-.17.48-.41l.36-2.54c.61-.25 1.17-.59 1.69-.98l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 15.6 12 3.6 3.6 0 0 1 12 15.6z"/>' +
      "</svg>"
    );
  }

  function sectionSearchMagnifierSvg() {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>' +
      "</svg>"
    );
  }

  function sectionSearchCloseSvg() {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>' +
      "</svg>"
    );
  }

  function sectionSearchWrapHtml(section, placeholder) {
    return (
      '<div id="section-search-wrap-' +
      section +
      '" class="section-search-wrap" hidden>' +
      '  <div class="section-search-field">' +
      '    <span class="section-search-field-icon" aria-hidden="true">' +
      sectionSearchMagnifierSvg() +
      "</span>" +
      '    <input type="search" id="section-search-input-' +
      section +
      '" class="section-search-input" placeholder="' +
      escapeHtml(placeholder) +
      '" autocomplete="off" />' +
      '    <button type="button" class="section-search-clear" id="section-search-clear-' +
      section +
      '" aria-label="Clear search" hidden>×</button>' +
      "  </div>" +
      "</div>"
    );
  }

  function normalizeSectionSearchQuery(q) {
    return String(q || "").trim().toLowerCase();
  }

  function textMatchesSectionSearch(text, query) {
    if (!query) return true;
    return String(text || "").toLowerCase().indexOf(query) >= 0;
  }

  function filteredScriptsForDisplay(scripts) {
    var q = normalizeSectionSearchQuery(sectionSearchQuery.library);
    if (!q || activeLibraryTab !== "my-library") return scripts;
    return scripts.filter(function (s) {
      return textMatchesSectionSearch(s.title, q) || textMatchesSectionSearch(s.text, q);
    });
  }

  function filteredPremadesForDisplay(premades) {
    var tierFiltered = filterPremadesByCatalogAccess(premades);
    var q = normalizeSectionSearchQuery(sectionSearchQuery.library);
    if (!q || activeLibraryTab !== "app-library") return tierFiltered;
    return tierFiltered.filter(function (p) {
      return (
        textMatchesSectionSearch(p.title, q) ||
        textMatchesSectionSearch(p.scriptText, q) ||
        textMatchesSectionSearch(p.description, q)
      );
    });
  }

  function filteredPlaylistsForDisplay(playlists) {
    var q = normalizeSectionSearchQuery(sectionSearchQuery.playlists);
    if (!q) return playlists;
    return playlists.filter(function (p) {
      return textMatchesSectionSearch(p.name, q);
    });
  }

  function voiceMatchesGenderFilter(voice, filter) {
    if (!filter || filter === "all") return true;
    return voice && voice.gender === filter;
  }

  function voiceMatchesSearchQuery(voice, rawQuery) {
    var query = normalizeSectionSearchQuery(rawQuery);
    if (!query) return true;
    if (query === "male" || query === "man" || query === "men" || query === "masculine" || query === "m") {
      return voice.gender === "male";
    }
    if (query === "female" || query === "woman" || query === "women" || query === "feminine" || query === "f") {
      return voice.gender === "female";
    }
    return textMatchesSectionSearch(voice.name, query) || textMatchesSectionSearch(voice.description, query);
  }

  function filteredVoicesForDisplay(voices) {
    return voices.filter(function (v) {
      if (!voiceMatchesGenderFilter(v, activeVoiceGenderFilter)) return false;
      return voiceMatchesSearchQuery(v, sectionSearchQuery.voices);
    });
  }

  function voiceGenderFilterBarHtml() {
    return (
      '<div class="app-tabs voice-segmented-tabs voice-gender-filter-tabs" id="voice-gender-filter-tabs" role="group" aria-label="Voice gender filter">' +
      ["all", "male", "female"]
        .map(function (filter) {
          var label = filter === "all" ? "All" : filter === "male" ? "Male" : "Female";
          return (
            '<button type="button" class="app-tab-btn' +
            (activeVoiceGenderFilter === filter ? " is-active" : "") +
            '" data-voice-gender-filter="' +
            filter +
            '">' +
            label +
            "</button>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function filteredBackgroundsForDisplay(backgrounds) {
    var q = normalizeSectionSearchQuery(sectionSearchQuery.audio);
    if (!q) return backgrounds;
    return backgrounds.filter(function (b) {
      return textMatchesSectionSearch(b.name, q);
    });
  }

  function syncSectionSearchUi(section) {
    var wrap = document.getElementById("section-search-wrap-" + section);
    var btn = document.getElementById("section-search-toggle-" + section);
    var input = document.getElementById("section-search-input-" + section);
    var clearBtn = document.getElementById("section-search-clear-" + section);
    var open = sectionSearchOpen[section] === true;
    if (wrap) {
      wrap.hidden = !open;
      wrap.classList.toggle("is-open", open);
    }
    if (btn) {
      btn.classList.toggle("is-active", open);
      btn.innerHTML = open ? sectionSearchCloseSvg() : sectionSearchMagnifierSvg();
      btn.setAttribute("aria-label", open ? "Hide search" : "Show search");
      btn.setAttribute("title", open ? "Hide search" : "Search");
    }
    if (clearBtn && input) {
      clearBtn.hidden = !String(input.value || "").length;
    }
    if (input && open) {
      requestAnimationFrame(function () {
        try {
          input.focus();
        } catch (_e) {}
      });
    }
  }

  function rerenderForSectionSearch(section) {
    if (section === "library") {
      if (activeLibraryTab === "my-library") renderScripts(currentScripts);
      else renderPremade();
    } else if (section === "playlists") {
      renderPlaylists(currentPlaylists);
    } else if (section === "voices") {
      renderVoices();
    } else if (section === "audio") {
      renderAudioPage();
    }
  }

  function toggleSectionSearch(section) {
    sectionSearchOpen[section] = !sectionSearchOpen[section];
    if (!sectionSearchOpen[section]) sectionSearchQuery[section] = "";
    var input = document.getElementById("section-search-input-" + section);
    if (input) input.value = "";
    syncSectionSearchUi(section);
    rerenderForSectionSearch(section);
  }

  function bindSectionSearchControls() {
    ["library", "playlists", "voices", "audio"].forEach(function (section) {
      var btn = document.getElementById("section-search-toggle-" + section);
      var input = document.getElementById("section-search-input-" + section);
      var clearBtn = document.getElementById("section-search-clear-" + section);
      if (btn) {
        btn.addEventListener("click", function () {
          toggleSectionSearch(section);
        });
      }
      if (input) {
        input.addEventListener("input", function () {
          sectionSearchQuery[section] = input.value || "";
          if (clearBtn) clearBtn.hidden = !String(input.value || "").length;
          rerenderForSectionSearch(section);
        });
      }
      if (clearBtn) {
        clearBtn.addEventListener("click", function () {
          sectionSearchQuery[section] = "";
          if (input) input.value = "";
          clearBtn.hidden = true;
          rerenderForSectionSearch(section);
          if (input) {
            try {
              input.focus();
            } catch (_e) {}
          }
        });
      }
      syncSectionSearchUi(section);
    });
  }

  function helpIconForSectionTitle(title) {
    var t = (title || "").toLowerCase();
    if (t.indexOf("script") >= 0 || t.indexOf("affirmation") >= 0 || t.indexOf("library") >= 0) return "📝";
    if (t.indexOf("listen") >= 0 || t.indexOf("play") >= 0 || t.indexOf("mini") >= 0) return "▶️";
    if (t.indexOf("dashboard") >= 0 || t.indexOf("listening") >= 0 || t.indexOf("activity") >= 0) return "📊";
    if (t.indexOf("account") >= 0) return "⚙️";
    if (t.indexOf("playlist") >= 0) return "📚";
    if (t.indexOf("voice") >= 0) return "🎙";
    if (t.indexOf("audio") >= 0 || t.indexOf("background") >= 0) return "🔊";
    if (t.indexOf("my ") === 0 || t.indexOf("app ") === 0) return "•";
    if (t.indexOf("on this") >= 0) return "📋";
    return "ℹ️";
  }

  function parseScreenHelpSections(content) {
    return String(content || "")
      .split(/\n\n+/)
      .map(function (block) {
        block = block.trim();
        if (!block) return null;
        var firstLine = block.split("\n")[0] || "";
        var title = firstLine.trim();
        var dash = title.indexOf(" — ");
        if (dash < 0) dash = title.indexOf(" - ");
        if (dash >= 0) title = title.slice(0, dash).trim();
        return {
          title: title,
          body: block,
          icon: helpIconForSectionTitle(title),
        };
      })
      .filter(Boolean);
  }

  function resolveScreenHelpKey() {
    if (activeAdminTab === "playlists" && playlistDetailVisible && selectedPlaylistId) {
      return "playlist-detail";
    }
    if (SCREEN_HELP[activeAdminTab]) return activeAdminTab;
    return "home";
  }

  function renderScreenHelpBody(title, content) {
    var titleEl = document.getElementById("screen-help-title");
    var sectionsEl = document.getElementById("screen-help-sections");
    if (titleEl) titleEl.textContent = title || "Help";
    if (!sectionsEl) return;
    var sections = parseScreenHelpSections(content);
    sectionsEl.innerHTML = sections
      .map(function (sec) {
        return (
          '<section class="screen-help-section">' +
          '<div class="screen-help-section-head">' +
          '<span class="screen-help-section-icon" aria-hidden="true">' +
          escapeHtml(sec.icon) +
          "</span>" +
          "<h4>" +
          escapeHtml(sec.title) +
          "</h4>" +
          "</div>" +
          '<div class="screen-help-section-body">' +
          escapeHtml(sec.body) +
          "</div>" +
          "</section>"
        );
      })
      .join("");
  }

  function openScreenHelp() {
    var key = resolveScreenHelpKey();
    var entry = SCREEN_HELP[key] || SCREEN_HELP.home;
    var backdrop = document.getElementById("screen-help-backdrop");
    if (!backdrop) return;
    renderScreenHelpBody(entry.title, entry.content);
    backdrop.hidden = false;
    var doneBtn = document.getElementById("screen-help-done");
    if (doneBtn) doneBtn.focus();
  }

  function closeScreenHelp() {
    var backdrop = document.getElementById("screen-help-backdrop");
    if (backdrop) backdrop.hidden = true;
  }

  function accountInfoIconSvg() {
    return (
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="12" cy="12" r="9"/>' +
      '<path d="M12 10v6M12 7h.01" stroke-linecap="round"/>' +
      "</svg>"
    );
  }

  function accountInfoButtonHtml(id, ariaLabel) {
    return (
      '<button type="button" class="account-info-btn" id="' +
      id +
      '" aria-label="' +
      escapeHtml(ariaLabel) +
      '">' +
      accountInfoIconSvg() +
      "</button>"
    );
  }

  function showAccountInfoModal(title, body) {
    var backdrop = document.getElementById("account-info-backdrop");
    var titleEl = document.getElementById("account-info-title");
    var bodyEl = document.getElementById("account-info-body");
    if (!backdrop || !titleEl || !bodyEl) return;
    titleEl.textContent = title || "Info";
    bodyEl.textContent = body || "";
    backdrop.hidden = false;
    var doneBtn = document.getElementById("account-info-done");
    if (doneBtn) doneBtn.focus();
  }

  function closeAccountInfoModal() {
    var backdrop = document.getElementById("account-info-backdrop");
    if (backdrop) backdrop.hidden = true;
  }

  function subscriptionManageInfoBodyWeb() {
    var tier = resolvedSubscriptionTier();
    if (tier === "free") {
      return "On Free, paid features like creating new AI scripts, cloud sync, and voice cloning are not available. If you came from a paid plan, your library was removed from our servers; copies already on this device can stay until you remove them.";
    }
    if (profileUsesStripeBilling()) {
      return "Your plan is billed on the web (Stripe). Use Manage billing to cancel, update your card, or view invoices. Use View plans & upgrade to change tier. Changes sync to the iOS app when you sign in with the same account.";
    }
    return "App Store billing is managed on iPhone or iPad: open the app → Account → Manage Subscriptions. When your plan becomes Free, your scripts, playlists, cloned voices, and cloud audio are removed from our servers. Content already on this device can remain. That is different from Delete account, which removes your sign-in and data from our services entirely.";
  }

  function subscriptionPlansInfoBodyWeb() {
    return "iOS uses the App Store for mobile subscriptions. Web upgrades here use Stripe Checkout with the same Firebase account. In Stripe test mode you can use card 4242 4242 4242 4242. Live checkout needs the four STRIPE_PRICE_* env vars on your API function.";
  }

  function devicesSharingInfoBodyWeb() {
    var tier = resolvedSubscriptionTier();
    var limit = webTierDeviceLimit(tier);
    var extra =
      tier === "creator"
        ? " Creator: open Shared listeners to remove listeners or deactivate share links."
        : "";
    return (
      "Your plan allows up to " +
      String(limit) +
      " registered devices. Remove extra devices in the iOS app if you are over your limit. Counts sync from your Firebase account across iPhone, iPad, and web." +
      extra
    );
  }

  function aiScriptUsageInfoBodyWeb() {
    return "Monthly AI words, scripts, and voice (TTS) usage. For paid plans, usage resets each billing period. When you need more, use the usage add-on above (complimentary during beta when enabled, or via in-app purchase).";
  }

  function accountIosGroupHeader(title, infoBtnId, infoAriaLabel) {
    var info =
      infoBtnId && infoAriaLabel
        ? '<span class="account-ios-group__info">' + accountInfoButtonHtml(infoBtnId, infoAriaLabel) + "</span>"
        : "";
    return (
      '<div class="account-ios-group__header">' +
      '<span class="account-ios-group__title">' +
      escapeHtml(title) +
      "</span>" +
      info +
      "</div>"
    );
  }

  function usageProgressTint(progress) {
    if (progress >= 0.9) return "#ef4444";
    if (progress >= 0.75) return "#f59e0b";
    return "#3b82f6";
  }

  function accountUsageMeterHtml(label, used, limit, remainSuffix) {
    remainSuffix = remainSuffix || "remaining";
    var head =
      '<div class="account-ios-meter__head"><span class="account-ios-meter__label">' +
      escapeHtml(label) +
      "</span>";
    if (limit === null || typeof limit === "undefined") {
      return (
        '<div class="account-ios-meter">' +
        head +
        '<span class="account-ios-meter__ratio">' +
        escapeHtml(formatInsightsInt(used) + " (unlimited)") +
        "</span></div></div>"
      );
    }
    var lim = Number(limit);
    if (!isFinite(lim) || lim <= 0) {
      return (
        '<div class="account-ios-meter">' +
        head +
        '<span class="account-ios-meter__ratio">' +
        escapeHtml(formatInsightsInt(used)) +
        "</span></div></div>"
      );
    }
    var progress = Math.min(1, used / lim);
    var remaining = Math.max(0, lim - used);
    var tint = usageProgressTint(progress);
    return (
      '<div class="account-ios-meter">' +
      head +
      '<span class="account-ios-meter__ratio">' +
      escapeHtml(formatUsageRatio(used, lim)) +
      "</span></div>" +
      '<div class="account-ios-meter__track" role="progressbar" aria-valuenow="' +
      String(Math.round(progress * 100)) +
      '" aria-valuemin="0" aria-valuemax="100">' +
      '<div class="account-ios-meter__fill" style="width:' +
      String(Math.round(progress * 1000) / 10) +
      "%;background:" +
      tint +
      ';"></div></div>' +
      '<div class="account-ios-meter__remain">' +
      escapeHtml(formatInsightsInt(remaining) + " " + remainSuffix) +
      "</div></div>"
    );
  }

  function accountIosKvRow(label, value) {
    return (
      '<div class="account-ios-row account-ios-row--kv">' +
      '<span class="account-ios-row__label">' +
      escapeHtml(label) +
      "</span>" +
      '<span class="account-ios-row__value">' +
      escapeHtml(value) +
      "</span></div>"
    );
  }

  function accountIosStatRow(label, value) {
    return (
      '<div class="account-ios-row account-ios-row--stat">' +
      '<span class="account-ios-row__label">' +
      escapeHtml(label) +
      "</span>" +
      '<span class="account-ios-row__value">' +
      escapeHtml(value) +
      "</span></div>"
    );
  }

  function wireAccountInfoButtons() {
    var host = document.getElementById("account-tab-settings");
    if (!host || host._accountInfoDelegated) return;
    host._accountInfoDelegated = true;
    host.addEventListener("click", function (ev) {
      var btn = ev.target && ev.target.closest ? ev.target.closest(".account-info-btn") : null;
      if (!btn || !btn.id) return;
      ev.preventDefault();
      ev.stopPropagation();
      if (btn.id === "account-subscription-info") {
        showAccountInfoModal("Subscriptions & billing", subscriptionPlansInfoBodyWeb());
      } else if (btn.id === "account-manage-billing-info") {
        showAccountInfoModal("Manage billing", subscriptionManageInfoBodyWeb());
      } else if (
        btn.id === "account-devices-section-info" ||
        btn.id === "account-manage-subscriptions-info"
      ) {
        showAccountInfoModal(
          btn.id === "account-manage-subscriptions-info" ? "Manage subscriptions" : "Devices & sharing",
          btn.id === "account-manage-subscriptions-info"
            ? subscriptionManageInfoBodyWeb()
            : devicesSharingInfoBodyWeb()
        );
      } else if (btn.id === "account-ai-usage-info") {
        showAccountInfoModal("AI Script Usage", aiScriptUsageInfoBodyWeb());
      }
    });
  }

  function syncScreenHelpButtonLabel() {
    var btn = document.getElementById("btn-screen-help");
    if (!btn) return;
    var key = resolveScreenHelpKey();
    var entry = SCREEN_HELP[key] || SCREEN_HELP.home;
    btn.setAttribute("aria-label", "Show help for " + (entry.title || "this screen"));
  }

  function renderAdminShell(email, displayName) {
    var welcomeName = resolvedWelcomeNickname(email);
    root.innerHTML =
      '<div class="app-admin-sticky-head">' +
      '<div id="admin-mode-banner" class="admin-mode-banner" role="status" hidden>' +
      "<strong>Admin mode is on.</strong> You can publish to the App Library catalog and edit premade entries in Firestore. Turn this off in Account → Admin mode when you are done." +
      "</div>" +
      '<nav class="site-top app-site-top-in-shell" aria-label="Focus Shift site">' +
      '  <a class="site-top-skip" href="#admin-main-tabs">Skip to content</a>' +
      '  <div class="site-top-inner app-site-top-inner-split">' +
      '    <div class="app-admin-header-leading">' +
      '      <button type="button" class="app-header-account-btn" id="btn-account-menu" aria-label="Account &amp; Settings" aria-haspopup="dialog" aria-expanded="false">' +
      accountGearIconSvg() +
      "</button>" +
      "    </div>" +
      '    <a class="site-top-home app-site-top-brand-center" href="/" aria-label="Focus Shift — marketing site home">' +
      '      <img class="site-top-app-brand site-top-app-brand-shell" src="../images/focus-shift-app-brand.png?v=7" alt="Focus Shift" width="1174" height="417" decoding="async" />' +
      "    </a>" +
      '    <div class="app-admin-header-actions">' +
      '      <div id="app-playlist-timer-wrap" class="app-playlist-timer-wrap" hidden title="Playlist sleep timer">' +
      '        <span class="app-playlist-timer-icon" aria-hidden="true">⏱</span>' +
      '        <span id="app-playlist-timer-label" class="app-playlist-timer-label"></span>' +
      '        <button type="button" class="app-playlist-timer-clear" id="btn-app-playlist-timer-clear" aria-label="Clear playlist timer">×</button>' +
      "      </div>" +
      '      <div id="app-generation-badge-wrap" class="app-generation-badge-wrap" hidden title="Background audio work">' +
      '        <span class="app-generation-badge-spinner" aria-hidden="true"></span>' +
      '        <span id="app-generation-badge-label" class="app-generation-badge-label">Generating</span>' +
      '        <span id="app-generation-badge-elapsed" class="app-generation-badge-elapsed">0:00</span>' +
      '        <span id="app-generation-badge-queue" class="app-generation-badge-queue" hidden></span>' +
      "      </div>" +
      '      <button type="button" class="app-header-help-btn" id="btn-screen-help" aria-label="Show help for this screen">' +
      screenHelpIconSvg() +
      "</button>" +
      "    </div>" +
      "  </div>" +
      "</nav>" +
      '<header class="app-admin-header app-admin-header-welcome-only">' +
      '  <div class="app-admin-header-main">' +
      '    <p class="app-welcome-line">Welcome, <strong>' +
      escapeHtml(welcomeName) +
      "</strong></p>" +
      '    <p class="app-welcome-tagline">Where Focus Becomes Power</p>' +
      "  </div>" +
      "</header>" +
      '<div class="app-admin-tab-box">' +
      '  <nav id="admin-main-tabs" class="app-tabs app-admin-tab-box-nav" aria-label="Admin sections">' +
      '    <div class="app-admin-tab-lead">' +
      '      <button type="button" class="playlist-back-arrow-btn" id="btn-playlist-back" hidden aria-label="Back to playlists">←</button>' +
      '      <button type="button" class="app-tab-btn" data-admin-tab="home">Home</button>' +
      "    </div>" +
      '    <button type="button" class="app-tab-btn" data-admin-tab="library">Library <span class="app-tab-count" id="count-library">0</span></button>' +
      '    <button type="button" class="app-tab-btn" data-admin-tab="playlists">Playlists <span class="app-tab-count" id="count-playlists">0</span></button>' +
      '    <button type="button" class="app-tab-btn" data-admin-tab="voices">Voices</button>' +
      '    <button type="button" class="app-tab-btn" data-admin-tab="audio">Sounds</button>' +
      "  </nav>" +
      "</div>" +
      "</div>" +
      '<section id="section-home" class="app-section" aria-label="Home">' +
      '<section class="app-card" aria-label="Focus Shift home">' +
      '  <div id="home-section-header" class="home-section-header">' +
      '    <h2 id="home-section-title" class="home-section-title">Home</h2>' +
      "  </div>" +
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
      '    <div class="library-toolbar-actions" id="library-app-only-toolbar" style="display:none">' +
      '      <button type="button" class="library-chevron-btn" id="premade-expand-all-audio" aria-label="Expand or collapse audio controls on all premade cards">▼</button>' +
      "    </div>" +
      '    <div class="library-toolbar-actions library-search-toolbar">' +
      '      <button type="button" class="library-chevron-btn section-search-toggle" id="section-search-toggle-library" aria-label="Show search" title="Search">' +
      sectionSearchMagnifierSvg() +
      "</button>" +
      "    </div>" +
      "  </div>" +
      sectionSearchWrapHtml("library", "Search my library…") +
      '  <input id="script-import-audio-input" type="file" accept="audio/*" style="display:none" />' +
      '  <div id="library-sub-my">' +
      '<div id="scripts-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      '<div id="audio-generation-overlay" class="audio-generation-overlay" hidden aria-hidden="true">' +
      '  <div class="audio-generation-overlay-card" role="status">' +
      '    <div class="audio-generation-overlay-header">' +
      '      <span class="audio-generation-overlay-title">Generating audio</span>' +
      '      <button type="button" class="audio-generation-overlay-dismiss" id="audio-generation-overlay-dismiss" aria-label="Hide panel (generation continues)">\u00d7</button>' +
      "    </div>" +
      '    <p class="audio-generation-overlay-detail">Long scripts can take up to 5 minutes. You can keep using the app while we work.</p>' +
      '    <p id="audio-generation-overlay-script" class="audio-generation-overlay-script"></p>' +
      '    <p id="audio-generation-overlay-elapsed" class="audio-generation-overlay-elapsed">Elapsed: 0:00</p>' +
      "  </div>" +
      "</div>" +
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
      '      <button type="button" class="app-btn" id="btn-open-publish-premade">Publish from My Library</button>' +
      "    </div>" +
      "  </div>" +
      '  <div id="premade-list"><p class="app-muted">Loading premade scripts...</p></div>' +
      "</section>" +
      "  </div>" +
      '<div id="script-workshop-backdrop" class="script-workshop-backdrop" hidden aria-hidden="true">' +
      '  <div class="script-workshop-panel app-card" role="dialog" aria-labelledby="script-workshop-heading">' +
      '    <div class="script-workshop-header">' +
      '      <button type="button" class="app-btn app-btn-secondary script-workshop-back" id="script-workshop-close">← Back</button>' +
      '      <h2 id="script-workshop-heading" class="script-workshop-heading">Edit Script</h2>' +
      "    </div>" +
      '    <div id="script-workshop-body" class="script-workshop-body"></div>' +
      '    <div id="script-workshop-footer" class="script-workshop-footer"></div>' +
      "  </div>" +
      "</div>" +
      '<div id="script-save-as-backdrop" class="app-modal-backdrop" hidden aria-hidden="true">' +
      '  <div class="app-modal" role="dialog" aria-modal="true" aria-labelledby="script-save-as-title">' +
      "    <h3 id=\"script-save-as-title\">Save as…</h3>" +
      '    <label for="script-save-as-title-input">Script title</label>' +
      '    <input id="script-save-as-title-input" type="text" maxlength="120" class="script-workshop-title-input" style="margin-bottom:0.75rem;" />' +
      '    <div class="app-modal-actions">' +
      '      <button type="button" class="app-btn" id="script-save-as-cancel">Cancel</button>' +
      '      <button type="button" class="app-btn app-btn-primary" id="script-save-as-confirm">Save</button>' +
      "    </div>" +
      "  </div>" +
      "</div>" +
      "</section>" +
      '<section id="section-playlists" class="app-section">' +
      '  <div id="playlists-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      '  <section aria-label="Playlists" style="margin-top:0.5rem;">' +
      '  <div id="playlists-list-view">' +
      '    <div class="app-section-title-row playlist-list-title-row">' +
      "      <h2>Playlists</h2>" +
      '      <div class="library-toolbar-actions playlist-list-toolbar-actions">' +
      '        <button type="button" class="library-chevron-btn section-search-toggle" id="section-search-toggle-playlists" aria-label="Show search" title="Search">' +
      sectionSearchMagnifierSvg() +
      "</button>" +
      '      <div class="library-dual-btn playlist-add-dual playlist-list-new-dual" role="group" aria-label="Create playlist">' +
      '        <button type="button" class="library-dual-btn-main" id="btn-create-playlist">+ New Playlist</button>' +
      "      </div>" +
      "      </div>" +
      "    </div>" +
      sectionSearchWrapHtml("playlists", "Search playlists…") +
      '    <div id="playlists-list"><p class="app-muted">Loading playlists...</p></div>' +
      "  </div>" +
      '  <div id="playlists-detail-view" hidden>' +
      '    <div class="playlist-detail-nav">' +
      '      <div class="playlist-detail-head-row">' +
      '        <h2 id="playlist-detail-heading" class="playlist-detail-heading">Playlist</h2>' +
      '        <div id="playlist-detail-head-toolbar" class="playlist-detail-head-toolbar"></div>' +
      '        <div id="playlist-detail-head-actions" class="playlist-detail-head-actions"></div>' +
      "      </div>" +
      "    </div>" +
      '    <div id="playlist-detail" class="playlist-detail-body"></div>' +
      "  </div>" +
      "  </section>" +
      "</section>" +
      '<section id="section-voices" class="app-section">' +
      '<section class="app-card" aria-label="Voice settings">' +
      '  <div class="voices-toolbar-row">' +
      '    <div class="voices-toolbar-inner">' +
      '    <div class="app-tabs voice-segmented-tabs" id="voices-segmented-tabs">' +
      '      <button type="button" class="app-tab-btn" id="voices-tab-my" data-voices-tab="my-voices">My Voices</button>' +
      '      <button type="button" class="app-tab-btn" id="voices-tab-app" data-voices-tab="app-voices">App Voices</button>' +
      "    </div>" +
      '    <div class="library-toolbar-actions">' +
      '      <button type="button" class="library-chevron-btn section-search-toggle" id="section-search-toggle-voices" aria-label="Show search" title="Search">' +
      sectionSearchMagnifierSvg() +
      "</button>" +
      "    </div>" +
      "    </div>" +
      "  </div>" +
      sectionSearchWrapHtml("voices", "Search voices…") +
      '  <div id="voice-gender-filter-wrap" hidden style="margin:0.35rem 0 0.55rem;"></div>' +
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
      '<section id="section-audio" class="app-section">' +
      '<section class="app-card" aria-label="Background audio">' +
      '  <div class="library-toolbar-row audio-toolbar-row">' +
      '    <div class="app-tabs voice-segmented-tabs" id="audio-segmented-tabs">' +
      '      <button type="button" class="app-tab-btn" id="audio-tab-my" data-audio-page-tab="my-audio">My Audio</button>' +
      '      <button type="button" class="app-tab-btn" id="audio-tab-app" data-audio-page-tab="app-audio">App Audio</button>' +
      "    </div>" +
      '    <div class="library-toolbar-actions" id="audio-my-only-toolbar">' +
      '      <button type="button" class="app-btn app-btn-secondary" id="btn-audio-import">Import audio</button>' +
      "    </div>" +
      '    <div class="library-toolbar-actions library-search-toolbar">' +
      '      <button type="button" class="library-chevron-btn section-search-toggle" id="section-search-toggle-audio" aria-label="Show search" title="Search">' +
      sectionSearchMagnifierSvg() +
      "</button>" +
      "    </div>" +
      "  </div>" +
      sectionSearchWrapHtml("audio", "Search background audio…") +
      '  <input id="audio-import-input" type="file" accept="audio/*" style="display:none" />' +
      '  <p class="app-muted" style="margin-top:0.05rem;margin-bottom:0.5rem;">Set default background audio for new scripts and generation. Custom imports stay only in this browser.</p>' +
      '  <div id="audio-sub-my">' +
      '    <div id="audio-my-list"></div>' +
      "  </div>" +
      '  <div id="audio-sub-app" hidden>' +
      '    <div id="audio-app-list"></div>' +
      "  </div>" +
      '  <div id="backgrounds-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      "</section>" +
      "</section>" +
      '<div id="screen-help-backdrop" class="app-modal-backdrop" hidden>' +
      '  <div class="app-modal screen-help-modal" role="dialog" aria-modal="true" aria-labelledby="screen-help-title">' +
      '    <div class="screen-help-modal-hero" aria-hidden="true"><span class="screen-help-modal-hero-icon">' +
      screenHelpIconSvg() +
      "</span></div>" +
      '    <div class="screen-help-modal-head">' +
      '      <h3 id="screen-help-title">Help</h3>' +
      '      <button type="button" class="app-btn app-btn-primary" id="screen-help-done">Done</button>' +
      "    </div>" +
      '    <div id="screen-help-sections" class="screen-help-sections"></div>' +
      "  </div>" +
      "</div>" +
      '<div id="account-devices-backdrop" class="app-modal-backdrop account-sheet-backdrop" hidden>' +
      '  <div class="app-modal account-sheet-modal" role="dialog" aria-modal="true" aria-labelledby="account-devices-title">' +
      '    <div class="account-sheet-head">' +
      '      <h3 id="account-devices-title">Manage devices</h3>' +
      '      <button type="button" class="app-btn app-btn-primary" id="account-devices-close">Done</button>' +
      "    </div>" +
      '    <p class="app-muted account-sheet-lede" id="account-devices-lede"></p>' +
      '    <div id="account-devices-modal-body" class="account-sheet-body"></div>' +
      "  </div>" +
      "</div>" +
      '<div id="account-sharing-backdrop" class="app-modal-backdrop account-sheet-backdrop" hidden>' +
      '  <div class="app-modal account-sheet-modal" role="dialog" aria-modal="true" aria-labelledby="account-sharing-title">' +
      '    <div class="account-sheet-head">' +
      '      <h3 id="account-sharing-title">Shared listeners</h3>' +
      '      <button type="button" class="app-btn app-btn-primary" id="account-sharing-close">Done</button>' +
      "    </div>" +
      '    <p class="app-muted account-sheet-lede">Creator plan: manage who can listen to your shared audio and deactivate old share links.</p>' +
      '    <div id="account-sharing-modal-body" class="account-sheet-body account-sharing-management-panel"></div>' +
      "  </div>" +
      "</div>" +
      '<div id="account-info-backdrop" class="app-modal-backdrop" hidden>' +
      '  <div class="app-modal account-info-modal" role="dialog" aria-modal="true" aria-labelledby="account-info-title">' +
      '    <h3 id="account-info-title">Info</h3>' +
      '    <p id="account-info-body" class="app-muted account-info-modal__body"></p>' +
      '    <div class="app-modal-actions">' +
      '      <button type="button" class="app-btn app-btn-primary" id="account-info-done">Done</button>' +
      "    </div>" +
      "  </div>" +
      "</div>" +
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
      '    <div id="account-tab-settings" class="account-tab-panel account-ios-stack">' +
      '      <section class="account-ios-group" aria-labelledby="account-card-heading-identity">' +
      accountIosGroupHeader("Account", null, null) +
      '        <div class="account-ios-list account-ios-list--identity">' +
      '          <div class="account-identity-row">' +
      '            <div class="account-identity-avatar" aria-hidden="true">' +
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6"/></svg>' +
      "            </div>" +
      '            <div class="account-identity-meta">' +
      '              <form id="account-form" class="account-identity-form">' +
      '                <label class="account-ios-field-label" for="account-display-name">Display name</label>' +
      '                <input id="account-display-name" class="account-ios-field-input" type="text" maxlength="80" value="' +
      escapeHtml(displayName || "") +
      '">' +
      '                <button type="submit" class="app-btn app-btn-primary account-ios-save-name">Save display name</button>' +
      "              </form>" +
      '              <p class="account-identity-email">' +
      escapeHtml(email || "") +
      "</p>" +
      '              <p class="account-identity-meta-line">Last login: <span id="account-last-login">' +
      escapeHtml(formatDateString(currentUser && currentUser.metadata && currentUser.metadata.lastSignInTime)) +
      "</span></p>" +
      "            </div>" +
      "          </div>" +
      "        </div>" +
      "      </section>" +
      '      <section class="account-ios-group account-subscription-section" id="account-subscription-group">' +
      accountIosGroupHeader("Subscription", "account-subscription-info", "About subscriptions and billing") +
      '        <div class="account-ios-list account-ios-list--subscription">' +
      '          <p class="account-subscription-plan-line tier-free" id="account-subscription-headline">Your plan: Free</p>' +
      '          <p class="app-muted account-subscription-desc" id="account-subscription-description">Limited features on the Free tier.</p>' +
      '          <div id="account-subscription-billing-rows" class="account-ios-billing-rows" hidden></div>' +
      "        </div>" +
      '        <div class="account-ios-actions account-ios-actions--subscription">' +
      '          <button type="button" class="app-btn app-btn-primary account-view-plans-btn account-view-plans-btn--hero" id="account-btn-view-plans" aria-expanded="false" aria-controls="account-plans-panel">View plans &amp; upgrade</button>' +
      '          <div class="account-ios-manage-row" id="account-ios-manage-row">' +
      '            <div class="account-ios-manage-cell" id="account-manage-billing-row" hidden>' +
      '              <button type="button" class="app-btn app-btn-secondary account-manage-billing-btn account-ios-manage-cell__btn" id="account-btn-manage-billing">Manage billing</button>' +
      accountInfoButtonHtml("account-manage-billing-info", "Manage billing help") +
      "            </div>" +
      '            <div class="account-ios-manage-cell" id="account-manage-subscriptions-row" hidden>' +
      '              <button type="button" class="app-btn app-btn-secondary account-ios-manage-cell__btn" disabled>Manage subscriptions (iOS)</button>' +
      accountInfoButtonHtml("account-manage-subscriptions-info", "Manage subscriptions help") +
      "            </div>" +
      "          </div>" +
      "        </div>" +
        '        <div id="account-plans-panel" class="account-plans-panel" hidden>' +
      '          <div id="account-plans-stripe-wrap">' +
      '            <p class="app-muted account-plans-panel-note">Choose a billing period. You will be redirected to Stripe Checkout.</p>' +
      '            <div class="account-plans-grid">' +
      '              <button type="button" class="app-btn app-btn-primary account-plan-option" data-stripe-plan="starter-month">Starter — monthly</button>' +
      '              <button type="button" class="app-btn app-btn-primary account-plan-option" data-stripe-plan="starter-year">Starter — yearly</button>' +
      '              <button type="button" class="app-btn app-btn-primary account-plan-option" data-stripe-plan="creator-month">Creator — monthly</button>' +
      '              <button type="button" class="app-btn app-btn-primary account-plan-option" data-stripe-plan="creator-year">Creator — yearly</button>' +
      "            </div>" +
      "          </div>" +
      '          <div id="account-plans-appstore-wrap" hidden>' +
      '            <p class="app-muted account-plans-panel-note">Your subscription is managed through the <strong>App Store</strong>. Upgrades, downgrades, and cancellations must be done on iPhone or iPad — not through Stripe on the web.</p>' +
      '            <ul class="account-plans-readonly">' +
      "              <li><strong>Starter</strong> — More scripts, voices, cloud sync, and AI usage.</li>" +
      "              <li><strong>Creator</strong> — Higher limits, sharing, and voice cloning.</li>" +
      "            </ul>" +
      '            <p class="app-muted account-plans-panel-note" style="margin-top:0.55rem;">Open <strong>Focus Shift</strong> on your iPhone or iPad → <strong>Account</strong> → <strong>Subscription</strong> → <strong>View Plans &amp; Upgrade</strong> or <strong>Manage Subscriptions</strong>.</p>' +
      "          </div>" +
      "        </div>" +
      "      </section>" +
      '      <section class="account-ios-group" id="account-ai-usage-group" hidden>' +
      accountIosGroupHeader("AI Script Usage", null, null) +
      '        <div id="account-ai-usage-panel" class="account-ios-list account-ios-list--usage"></div>' +
      '        <div id="account-ai-usage-addon-host" class="account-ios-addon-host"></div>' +
      "      </section>" +
      '      <section class="account-ios-group" id="account-devices-group">' +
      accountIosGroupHeader("Devices & Sharing", "account-devices-section-info", "Devices and sharing help") +
      '        <div class="account-ios-list">' +
      '          <button type="button" class="account-ios-row account-ios-row--nav" id="account-manage-devices">' +
      '            <span class="account-ios-row__label">Manage devices</span>' +
      '            <span class="account-ios-row__value" id="account-device-count-label">—</span>' +
      "          </button>" +
      '          <button type="button" class="account-ios-row account-ios-row--nav" id="account-scroll-sharing" hidden>' +
      '            <span class="account-ios-row__label">Shared listeners</span>' +
      '            <span class="account-ios-row__value" id="account-shared-listeners-value">—</span>' +
      '            <span class="account-ios-row__chev" aria-hidden="true">›</span>' +
      "          </button>" +
      "        </div>" +
      "      </section>" +
      '      <section class="account-ios-group" id="account-library-group">' +
      accountIosGroupHeader("Library & Storage", null, null) +
      '        <div id="account-library-panel" class="account-ios-list account-ios-list--stats"></div>' +
      '        <div class="account-ios-actions account-ios-actions--stack">' +
      '          <button type="button" class="app-btn app-btn-primary" id="account-sync-cloud" hidden>Sync to Cloud</button>' +
      '          <button type="button" class="app-btn app-btn-secondary" id="account-refresh-library-stats">Refresh Library Stats</button>' +
      "        </div>" +
      "      </section>" +
      '      <section id="account-admin-tools-section" class="account-ios-group">' +
      accountIosGroupHeader("Admin Tools", null, null) +
      '        <div class="account-ios-list">' +
      '          <label class="account-ios-row account-ios-row--toggle account-pref-row"><input type="checkbox" id="pref-admin-mode" /> Admin mode (catalog publish &amp; edit)</label>' +
      "        </div>" +
      "      </section>" +
      '      <section class="account-ios-group account-ios-group--signout">' +
      '        <div class="account-ios-list">' +
      '          <button type="button" class="account-ios-row account-ios-row--danger" id="account-signout">Sign Out</button>' +
      "        </div>" +
      "      </section>" +
      '      <div id="account-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      "    </div>" +
      '    <div id="account-tab-preferences" class="account-tab-panel account-tab-stack" hidden>' +
      '      <section class="account-section-card">' +
      '        <h4 class="account-section-card__title">Listening defaults</h4>' +
      '        <p class="app-muted account-section-card__text">Used for new scripts and when a script has no voice or background selected. Saved to your account (same idea as iOS). Changing defaults requires Starter or Creator.</p>' +
      '        <div class="account-default-picker-row">' +
      '          <div class="account-default-picker-meta">' +
      '            <div class="account-default-picker-label">Default voice</div>' +
      '            <div id="account-pref-default-voice-display" class="account-default-picker-value">\u2014</div>' +
      "          </div>" +
      '          <button type="button" class="app-btn app-btn-secondary" id="account-pref-pick-default-voice">Choose\u2026</button>' +
      "        </div>" +
      '        <div class="account-default-picker-row">' +
      '          <div class="account-default-picker-meta">' +
      '            <div class="account-default-picker-label">Default background audio</div>' +
      '            <div id="account-pref-default-background-display" class="account-default-picker-value">\u2014</div>' +
      "          </div>" +
      '          <button type="button" class="app-btn app-btn-secondary" id="account-pref-pick-default-background">Choose\u2026</button>' +
      "        </div>" +
      "      </section>" +
      '      <section class="account-section-card">' +
      '        <h4 class="account-section-card__title">App preferences</h4>' +
      '        <p class="app-muted account-section-card__text">These options apply in this browser only.</p>' +
      '        <label class="account-pref-row"><input type="checkbox" id="pref-auto-play-next" /> Auto-Play Next</label>' +
      '        <label class="account-pref-row" for="pref-listen-shortcut-mode">Listen today shortcut</label>' +
      '        <p class="app-muted account-section-card__text" style="margin-top:0.12rem;">Choose a tab, playlist, or library track for your Listen Today shortcut (saved in this browser). Daily reminders are iOS-only; use Manage shortcut below to test it on web.</p>' +
      '        <select id="pref-listen-shortcut-mode" class="app-btn" style="width:100%;text-align:left;margin-top:0.35rem;">' +
      '          <option value="playlists">Open Playlists tab</option>' +
      '          <option value="library">Open Library tab</option>' +
      '          <option value="playlist-target">Play a playlist</option>' +
      '          <option value="script-target">Play a library track</option>' +
      "        </select>" +
      '        <div id="pref-listen-shortcut-playlist-wrap" hidden style="margin-top:0.45rem;">' +
      '          <label class="account-pref-row" for="pref-listen-shortcut-playlist-id">Playlist</label>' +
      '          <select id="pref-listen-shortcut-playlist-id" class="app-btn" style="width:100%;text-align:left;margin-top:0.15rem;"></select>' +
      "        </div>" +
      '        <div id="pref-listen-shortcut-script-wrap" hidden style="margin-top:0.45rem;">' +
      '          <label class="account-pref-row" for="pref-listen-shortcut-script-id">Library track</label>' +
      '          <select id="pref-listen-shortcut-script-id" class="app-btn" style="width:100%;text-align:left;margin-top:0.15rem;"></select>' +
      "        </div>" +
      '        <button type="button" class="app-btn app-btn-secondary" id="account-pref-open-listen-today" style="margin-top:0.55rem;width:100%;">Manage Listen Today shortcut\u2026</button>' +
      "      </section>" +
      '      <section class="account-section-card">' +
      '        <h4 class="account-section-card__title">Appearance</h4>' +
      '        <p class="app-muted account-section-card__text">Match this workspace to your device, or choose a fixed light or dark look (saved in this browser).</p>' +
      '        <fieldset class="account-pref-fieldset account-pref-fieldset--in-card">' +
      '          <legend class="account-pref-legend">Theme</legend>' +
      '          <label class="account-pref-row"><input type="radio" name="pref-app-theme" id="pref-theme-system" value="system" /> System</label>' +
      '          <label class="account-pref-row"><input type="radio" name="pref-app-theme" id="pref-theme-dark" value="dark" /> Dark</label>' +
      '          <label class="account-pref-row"><input type="radio" name="pref-app-theme" id="pref-theme-light" value="light" /> Light</label>' +
      "        </fieldset>" +
      "      </section>" +
      '      <section class="account-section-card">' +
      '        <h4 class="account-section-card__title">Workspace</h4>' +
      '        <label class="account-pref-row"><input type="checkbox" id="pref-resume-last-screen" /> Remember my last workspace screen after sign-in</label>' +
      '        <fieldset class="account-pref-fieldset account-pref-fieldset--in-card">' +
      '          <legend class="account-pref-legend">When you open Library, show</legend>' +
      '          <label class="account-pref-row"><input type="radio" name="pref-library-sub" id="pref-library-sub-my" value="my-library" /> My Library</label>' +
      '          <label class="account-pref-row"><input type="radio" name="pref-library-sub" id="pref-library-sub-app" value="app-library" /> App Library</label>' +
      "        </fieldset>" +
      "      </section>" +
      "    </div>" +
      '    <div id="account-tab-privacy" class="account-tab-panel account-tab-stack" hidden>' +
      '      <div id="account-privacy-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      '      <section class="account-section-card">' +
      '        <h4 class="account-section-card__title">Security</h4>' +
      '        <p class="app-muted account-section-card__text">Web sign-in uses email/password or Google. Sign in with Apple on the iOS app. Biometric unlock is iOS-only today.</p>' +
      '        <p id="account-apple-link-status" class="app-muted account-section-card__text">Apple Sign In on the web is unavailable while iOS and web share one Firebase Apple Services ID (bundle ID). Use the iOS app for Apple login.</p>' +
      '        <div class="account-section-card__btn-row">' +
      '          <button type="button" class="app-btn app-btn-secondary" id="account-privacy-password-reset">Send password reset email</button>' +
      '          <button type="button" class="app-btn app-btn-secondary" id="account-privacy-refresh-session">Refresh session</button>' +
      "        </div>" +
      "      </section>" +
      '      <section class="account-section-card">' +
      '        <h4 class="account-section-card__title">Privacy &amp; data</h4>' +
      '        <p class="app-muted account-section-card__text">Your scripts, playlists, and generated audio live in your Firebase account. This browser may also store lightweight UI preferences locally.</p>' +
      '        <div class="account-section-card__btn-row">' +
      '          <button type="button" class="app-btn app-btn-secondary" id="account-privacy-export-json">Export my data (JSON)</button>' +
      '          <button type="button" class="app-btn app-btn-danger" id="account-privacy-delete-account">Delete account…</button>' +
      "        </div>" +
      '        <p class="app-muted account-section-card__text" style="margin-top:0.55rem;">You can delete your account from the web (server-side, same cloud cleanup as iOS). Local data on phones or tablets is cleared the next time that app syncs or you remove the app.</p>' +
      '        <div class="account-section-card__btn-row">' +
      '          <a class="app-btn app-btn-secondary" href="https://focusshift.app/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>' +
      '          <a class="app-btn app-btn-secondary" href="https://focusshift.app/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>' +
      "        </div>" +
      "      </section>" +
      '      <section class="account-section-card">' +
      '        <h4 class="account-section-card__title">About &amp; support</h4>' +
      '        <p class="app-muted account-section-card__text">Web workspace build. For app store reviews and device-specific help, use the iOS app.</p>' +
      '        <p class="app-muted account-section-card__text"><strong>Firebase JS:</strong> <span id="account-privacy-firebase-sdk">-</span></p>' +
      '        <div class="account-section-card__btn-row">' +
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
      '<div id="mini-player" class="mini-player mini-player-is-idle" role="region" aria-label="Now playing">' +
      '  <div class="mini-player-inner">' +
      '    <div id="mini-player-title" class="mini-player-title">Nothing playing</div>' +
      '    <div class="mini-player-controls">' +
      '      <button type="button" id="mini-player-toggle" class="mini-player-icon-btn" disabled aria-label="Play">' +
      '<span class="mini-player-toggle-icon">' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>' +
      "</span></button>" +
      "    </div>" +
      '    <div class="mini-player-volume-cluster" role="group" aria-label="Volume">' +
      '      <button type="button" id="mini-player-vol-down" class="mini-player-step-btn" aria-label="Volume down">−</button>' +
      '      <input type="range" id="mini-player-volume" min="0" max="1" step="0.02" value="1" aria-label="Volume" />' +
      '      <button type="button" id="mini-player-vol-up" class="mini-player-step-btn" aria-label="Volume up">+</button>' +
      "    </div>" +
      '    <div id="mini-player-time" class="mini-player-time">—</div>' +
      "  </div>" +
      "</div>" +
      '<div id="listen-today-backdrop" class="app-modal-backdrop" hidden>' +
      '  <div class="app-modal app-modal-listen-today" role="dialog" aria-modal="true" aria-labelledby="listen-today-title">' +
      '    <h3 id="listen-today-title">Listen today</h3>' +
      '    <div id="listen-today-modal-body"></div>' +
      '    <div class="app-modal-actions">' +
      '      <button type="button" class="app-btn" id="listen-today-close">Close</button>' +
      "    </div>" +
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
      '<div id="playlist-edit-backdrop" class="app-modal-backdrop" hidden>' +
      '  <div class="app-modal" role="dialog" aria-modal="true" aria-labelledby="playlist-edit-title">' +
      '    <h3 id="playlist-edit-title">Edit playlist</h3>' +
      '    <label for="playlist-edit-name-input">Playlist name</label>' +
      '    <input id="playlist-edit-name-input" type="text" maxlength="120" style="width:100%;box-sizing:border-box;margin-bottom:0.55rem;padding:0.55rem;border-radius:10px;">' +
      '    <p class="app-muted" style="margin:0 0 0.4rem;font-size:0.82rem;">Reorder tracks with the arrows. Tap Save to update the name and order in your library (syncs with iOS).</p>' +
      '    <div id="playlist-edit-order-list" class="playlist-edit-order-list"></div>' +
      '    <div id="playlist-edit-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      '    <div class="app-modal-actions">' +
      '      <button type="button" class="app-btn" id="playlist-edit-cancel">Cancel</button>' +
      '      <button type="button" class="app-btn app-btn-primary" id="playlist-edit-save">Save</button>' +
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
      '    <label for="publish-access-tier">Who can access</label>' +
      '    <select id="publish-access-tier">' +
      '      <option value="paid" selected>Paid (Starter &amp; Creator)</option>' +
      '      <option value="free">Free (all users)</option>' +
      "    </select>" +
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
      '<div id="background-publish-backdrop" class="app-modal-backdrop" hidden>' +
      '  <div class="app-modal" role="dialog" aria-modal="true" aria-label="Publish background">' +
      "    <h3>Publish Background to Cloud</h3>" +
      '    <p class="app-muted" style="margin:0 0 0.55rem;">Uploads to Firebase Storage <code>backgroundCatalog/</code> and Firestore <code>backgroundCatalog</code>. Tracks stream during preview and generation.</p>' +
      '    <label for="bg-publish-name">Display name</label>' +
      '    <input id="bg-publish-name" type="text" maxlength="120" placeholder="Background name">' +
      '    <label for="bg-publish-category">Category</label>' +
      '    <select id="bg-publish-category"></select>' +
      '    <label for="bg-publish-access-tier">Who can access</label>' +
      '    <select id="bg-publish-access-tier">' +
      '      <option value="paid" selected>Paid (Starter &amp; Creator)</option>' +
      '      <option value="free">Free (all users)</option>' +
      "    </select>" +
      '    <label for="bg-publish-file">Audio file (MP3, M4A, WAV)</label>' +
      '    <input id="bg-publish-file" type="file" accept="audio/*,.mp3,.m4a,.wav">' +
      '    <div id="bg-publish-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      '    <div class="app-modal-actions">' +
      '      <button type="button" class="app-btn" id="bg-publish-cancel">Cancel</button>' +
      '      <button type="button" class="app-btn app-btn-primary" id="bg-publish-submit">Publish to Cloud</button>' +
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
      '    <label for="premade-edit-access-tier">Who can access</label>' +
      '    <select id="premade-edit-access-tier">' +
      '      <option value="paid">Paid (Starter &amp; Creator)</option>' +
      '      <option value="free">Free (all users)</option>' +
      "    </select>" +
      '    <label for="premade-edit-description">Description</label>' +
      '    <input id="premade-edit-description" type="text" maxlength="180">' +
      '    <label for="premade-edit-text">Script text</label>' +
      '    <textarea id="premade-edit-text" rows="6"></textarea>' +
      '    <div id="premade-edit-message" class="app-inline-msg" role="status" aria-live="polite"></div>' +
      '    <div class="app-modal-actions">' +
      '      <button type="button" class="app-btn app-btn-danger" id="premade-edit-delete">Hide from catalog</button>' +
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
      '    <label for="voice-setting-speed">Speed <span id="voice-setting-speed-value" class="app-muted">1.10</span></label>' +
      '    <input id="voice-setting-speed" type="range" min="0.7" max="1.2" step="0.05" value="1.1">' +
      '    <p class="app-muted" style="margin:-0.35rem 0 0.55rem;font-size:0.82rem;">Read slowly when cloning? Use ~1.05–1.15 so scripts sound a bit faster.</p>' +
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
      '      <button type="button" class="app-btn app-btn-ghost" data-voice-adjust-preset="inner">Inner voice</button>' +
      '      <button type="button" class="app-btn app-btn-ghost" data-voice-adjust-preset="natural">Natural</button>' +
      '      <button type="button" class="app-btn app-btn-ghost" data-voice-adjust-preset="energetic">Energetic</button>' +
      '      <button type="button" class="app-btn app-btn-ghost" data-voice-adjust-preset="calm">Calm</button>' +
      '      <button type="button" class="app-btn app-btn-ghost" data-voice-adjust-preset="clear">Clear</button>' +
      "    </div>" +
      '    <label for="voice-adjust-speed">Speed <span id="voice-adjust-speed-value" class="app-muted">1.10</span></label>' +
      '    <input id="voice-adjust-speed" type="range" min="0.7" max="1.2" step="0.05" value="1.1">' +
      '    <p class="app-muted" style="margin:-0.35rem 0 0.55rem;font-size:0.82rem;">If your clone sample was read slowly, nudge speed up so affirmations feel quicker.</p>' +
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
      '<div id="ai-text-edit-backdrop" class="app-modal-backdrop" hidden>' +
      '  <div class="app-modal ai-text-edit-modal" role="dialog" aria-modal="true" aria-labelledby="ai-text-edit-title">' +
      '    <div class="ai-text-edit-modal-scroll">' +
      '    <div id="ai-text-edit-setup-panel" class="ai-text-edit-setup-panel">' +
      '    <div class="ai-text-edit-hero">' +
      '      <span class="ai-text-edit-hero-icon" aria-hidden="true">✨</span>' +
      '      <h3 id="ai-text-edit-title">AI Text Editor</h3>' +
      '      <p class="app-muted" style="margin:0;">Tell AI how to improve or modify your text</p>' +
      "    </div>" +
      '    <label for="ai-text-edit-instructions">What would you like AI to do?</label>' +
      '    <textarea id="ai-text-edit-instructions" rows="4" placeholder="Describe how to edit your script…"></textarea>' +
      '    <div class="ai-text-edit-quick-actions" aria-label="Quick edit suggestions">' +
      '      <button type="button" class="app-btn app-btn-ghost ai-text-edit-quick" data-ai-instructions="Make this text shorter and more concise">Make shorter</button>' +
      '      <button type="button" class="app-btn app-btn-ghost ai-text-edit-quick" data-ai-instructions="Expand and elaborate on this text">Make longer</button>' +
      '      <button type="button" class="app-btn app-btn-ghost ai-text-edit-quick" data-ai-instructions="Make this text more positive and uplifting">More positive</button>' +
      '      <button type="button" class="app-btn app-btn-ghost ai-text-edit-quick" data-ai-instructions="Fix any grammar or spelling errors">Fix grammar</button>' +
      '      <button type="button" class="app-btn app-btn-ghost ai-text-edit-quick" data-ai-instructions="Improve the flow and readability of this text">Improve flow</button>' +
      "    </div>" +
      "    </div>" +
      '    <div id="ai-text-edit-busy" class="ai-text-edit-busy" hidden role="status">' +
      '      <div class="ai-text-edit-spinner" aria-hidden="true"></div>' +
      "      <span>AI is editing your text…</span>" +
      "    </div>" +
      '    <div id="ai-text-edit-error" class="app-inline-msg" role="alert" aria-live="polite"></div>' +
      '    <div id="ai-text-edit-result-wrap" class="ai-text-edit-result-wrap" hidden>' +
      '      <label for="ai-text-edit-result">Edited script</label>' +
      '      <p class="app-muted ai-text-edit-result-hint">Review and edit the text below. Save when you are ready, or discard to keep your original.</p>' +
      '      <textarea id="ai-text-edit-result" class="ai-text-edit-result" rows="14" maxlength="50000"></textarea>' +
      "    </div>" +
      "    </div>" +
      '    <div class="app-modal-actions ai-text-edit-actions">' +
      '      <button type="button" class="app-btn" id="ai-text-edit-cancel">Cancel</button>' +
      '      <button type="button" class="app-btn app-btn-secondary" id="ai-text-edit-try-again" hidden>Try Again</button>' +
      '      <button type="button" class="app-btn app-btn-primary" id="ai-text-edit-primary">Edit with AI</button>' +
      "    </div>" +
      "  </div>" +
      "</div>" +
      '<div id="share-claim-backdrop" class="app-modal-backdrop" hidden>' +
      '  <div class="app-modal share-claim-modal" role="dialog" aria-modal="true" aria-labelledby="share-claim-title">' +
      '    <h3 id="share-claim-title">Shared audio</h3>' +
      '    <p id="share-claim-lede" class="app-muted" style="margin-top:0;">Someone shared Focus Shift audio with you.</p>' +
      '    <div id="share-claim-meta" class="share-claim-meta"></div>' +
      '    <p id="share-claim-error" class="app-inline-msg error" role="alert" hidden></p>' +
      '    <div class="app-modal-actions">' +
      '      <button type="button" class="app-btn" id="share-claim-dismiss">Not now</button>' +
      '      <button type="button" class="app-btn app-btn-primary" id="share-claim-accept">Add to My Library</button>' +
      "    </div>" +
      "  </div>" +
      "</div>";

    document.getElementById("btn-create-script").addEventListener("click", function () {
      createBlankScriptAndOpenEditor();
    });
    document.getElementById("btn-library-create-menu").addEventListener("click", function (ev) {
      ev.stopPropagation();
      toggleLibraryCreateMenu();
    });
    document.getElementById("library-dropdown-create").addEventListener("click", function () {
      closeLibraryCreateMenu();
      createBlankScriptAndOpenEditor();
    });
    document.getElementById("library-dropdown-import").addEventListener("click", function () {
      closeLibraryCreateMenu();
      if (!requireWebPaidTier(WEB_PAID_FEATURE_COPY.libraryImport)) return;
      var inp = document.getElementById("script-import-audio-input");
      if (inp) inp.click();
    });
    document.getElementById("script-import-audio-input").addEventListener("change", function (ev) {
      var f = ev.target.files && ev.target.files[0];
      ev.target.value = "";
      if (f) importScriptAudioFromFile(f);
    });
    var workshopClose = document.getElementById("script-workshop-close");
    if (workshopClose) {
      workshopClose.addEventListener("click", closeScriptWorkshop);
    }
    var workshopBackdrop = document.getElementById("script-workshop-backdrop");
    if (workshopBackdrop) {
      workshopBackdrop.addEventListener("click", function (ev) {
        if (ev.target === workshopBackdrop) closeScriptWorkshop();
      });
    }
    var saveAsCancel = document.getElementById("script-save-as-cancel");
    if (saveAsCancel) {
      saveAsCancel.addEventListener("click", closeScriptWorkshopSaveAsModal);
    }
    var saveAsConfirm = document.getElementById("script-save-as-confirm");
    if (saveAsConfirm) {
      saveAsConfirm.addEventListener("click", confirmScriptWorkshopSaveAs);
    }
    var saveAsBackdrop = document.getElementById("script-save-as-backdrop");
    if (saveAsBackdrop) {
      saveAsBackdrop.addEventListener("click", function (ev) {
        if (ev.target === saveAsBackdrop) closeScriptWorkshopSaveAsModal();
      });
    }
    var saveAsTitleInput = document.getElementById("script-save-as-title-input");
    if (saveAsTitleInput) {
      saveAsTitleInput.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") {
          ev.preventDefault();
          confirmScriptWorkshopSaveAs();
        }
      });
    }
    var genOverlayDismiss = document.getElementById("audio-generation-overlay-dismiss");
    if (genOverlayDismiss) {
      genOverlayDismiss.addEventListener("click", function () {
        var overlay = document.getElementById("audio-generation-overlay");
        if (overlay) {
          overlay.hidden = true;
          overlay.setAttribute("aria-hidden", "true");
        }
      });
    }
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
    document.getElementById("playlist-edit-cancel").addEventListener("click", function () {
      closePlaylistEditModal();
    });
    document.getElementById("playlist-edit-save").addEventListener("click", function () {
      savePlaylistEditFromModal();
    });
    document.getElementById("playlist-edit-backdrop").addEventListener("click", function (ev) {
      if (ev.target && ev.target.id === "playlist-edit-backdrop") {
        closePlaylistEditModal();
      }
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
    var accountScrollSharingBtn = document.getElementById("account-scroll-sharing");
    if (accountScrollSharingBtn) {
      accountScrollSharingBtn.addEventListener("click", function () {
        openAccountSharingModal();
      });
    }
    (function bindAccountSheetModals() {
      var devicesClose = document.getElementById("account-devices-close");
      var devicesBd = document.getElementById("account-devices-backdrop");
      if (devicesClose) devicesClose.addEventListener("click", closeAccountDevicesModal);
      if (devicesBd) {
        devicesBd.addEventListener("click", function (ev) {
          if (ev.target && ev.target.id === "account-devices-backdrop") closeAccountDevicesModal();
        });
      }
      var sharingClose = document.getElementById("account-sharing-close");
      var sharingBd = document.getElementById("account-sharing-backdrop");
      if (sharingClose) sharingClose.addEventListener("click", closeAccountSharingModal);
      if (sharingBd) {
        sharingBd.addEventListener("click", function (ev) {
          if (ev.target && ev.target.id === "account-sharing-backdrop") closeAccountSharingModal();
        });
      }
    })();
    (function bindStripePlanButtons() {
      var planMap = {
        "starter-month": ["starter", "month"],
        "starter-year": ["starter", "year"],
        "creator-month": ["creator", "month"],
        "creator-year": ["creator", "year"],
      };
      var accountBackdrop = document.getElementById("account-modal-backdrop");
      if (accountBackdrop) {
        accountBackdrop.addEventListener("click", function (ev) {
          var stepBtn =
            ev.target && ev.target.closest && ev.target.closest("#account-usage-addon-action");
          if (stepBtn && accountBackdrop.contains(stepBtn)) {
            ev.preventDefault();
            var stepMode = stepBtn.getAttribute("data-stepup-mode") || "complimentary";
            if (stepMode === "stripe") {
              postStripeStepUpCheckout();
            } else if (stepMode === "appstore") {
              openAppStoreStepUpInstructions();
            } else {
              applyComplimentaryStepUp().catch(function (e) {
                setAccountMessage((e && e.message) || "Could not apply usage add-on.", "error");
              });
            }
            return;
          }
          var btn = ev.target && ev.target.closest && ev.target.closest("button[data-stripe-plan]");
          if (!btn || !accountBackdrop.contains(btn)) return;
          var key = (btn.getAttribute("data-stripe-plan") || "").trim();
          var pair = planMap[key];
          if (!pair) return;
          ev.preventDefault();
          ev.stopPropagation();
          if (profileUsesAppStoreBilling() && resolvedSubscriptionTier() !== "free") {
            showAppBanner(
              "Manage in the iOS app",
              "App Store subscriptions cannot be changed with Stripe on the web. Open Focus Shift on iPhone or iPad → Account → Subscription.",
              "info",
              { duration: 9000 }
            );
            return;
          }
          postStripeCheckoutTier(pair[0], pair[1]);
        });
      }
    })();
    document.getElementById("account-btn-view-plans").addEventListener("click", function () {
      var panel = document.getElementById("account-plans-panel");
      if (!panel) return;
      syncAccountPlansPanelForBilling();
      var willShow = !!panel.hidden;
      panel.hidden = !willShow;
      this.setAttribute("aria-expanded", willShow ? "true" : "false");
      this.textContent = willShow ? "Hide plans" : viewPlansButtonLabelCollapsed();
    });
    var accountManageBillingBtn = document.getElementById("account-btn-manage-billing");
    if (accountManageBillingBtn) {
      accountManageBillingBtn.addEventListener("click", function () {
        postStripeBillingPortal();
      });
    }
    document.getElementById("account-manage-devices").addEventListener("click", function () {
      openAccountDevicesModal();
    });
    bindShareClaimModal();
    document.getElementById("account-refresh-library-stats").addEventListener("click", function () {
      refreshAccountInsightsFromCloud().then(function () {
        setAccountMessage("Usage and library statistics refreshed.", "success");
      });
    });
    var accountSyncCloudBtn = document.getElementById("account-sync-cloud");
    if (accountSyncCloudBtn) {
      accountSyncCloudBtn.addEventListener("click", function () {
        setAccountMessage(
          "Cloud sync is account-linked. New scripts and playlists should appear across devices after refresh.",
          ""
        );
      });
    }
    document.getElementById("account-signout").addEventListener("click", function () {
      closeAccountModal();
      auth.signOut().then(redirectLogin);
    });
    document.getElementById("account-privacy-password-reset").addEventListener("click", function () {
      sendPasswordResetFromAccount();
      setPrivacyMessage("If you requested a reset, check your email inbox.", "success");
    });
    var linkAppleBtn = document.getElementById("account-btn-link-apple");
    if (linkAppleBtn) {
      linkAppleBtn.addEventListener("click", function () {
        setPrivacyMessage("Opening Apple…", "");
        linkAppleToCurrentAccount().catch(function (err) {
          var msg = friendlyAppleLinkError(err);
          if (msg) setPrivacyMessage(msg, "error");
        });
      });
    }
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
    document.getElementById("btn-screen-help").addEventListener("click", function () {
      openScreenHelp();
    });
    document.getElementById("screen-help-done").addEventListener("click", function () {
      closeScreenHelp();
    });
    wireAccountInfoButtons();
    var accountInfoDone = document.getElementById("account-info-done");
    if (accountInfoDone) accountInfoDone.addEventListener("click", closeAccountInfoModal);
    var accountInfoBackdrop = document.getElementById("account-info-backdrop");
    if (accountInfoBackdrop) {
      accountInfoBackdrop.addEventListener("click", function (ev) {
        if (ev.target && ev.target.id === "account-info-backdrop") closeAccountInfoModal();
      });
    }
    document.getElementById("screen-help-backdrop").addEventListener("click", function (ev) {
      if (ev.target === ev.currentTarget) closeScreenHelp();
    });
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
    document.getElementById("pref-listen-shortcut-mode").addEventListener("change", function () {
      onPrefListenShortcutModeChange(this.value || "playlists");
    });
    document.getElementById("pref-listen-shortcut-playlist-id").addEventListener("change", function () {
      var id = this.value;
      if (!id) return;
      var opt = this.options[this.selectedIndex];
      var nm = opt ? opt.textContent.trim() : "Playlist";
      writeListenShortcutPlaylist(id, nm);
      syncListenShortcutPreferenceUi();
      setAccountMessage('Shortcut will play playlist "' + nm + '".', "success");
      if (activeAdminTab === "home") renderHomeFlow((currentUser && currentUser.displayName) || "");
    });
    document.getElementById("pref-listen-shortcut-script-id").addEventListener("change", function () {
      var id = this.value;
      if (!id) return;
      var opt = this.options[this.selectedIndex];
      var t = opt ? opt.textContent.trim() : "Library track";
      writeListenShortcutScript(id, t);
      syncListenShortcutPreferenceUi();
      setAccountMessage('Shortcut will play "' + t + '".', "success");
      if (activeAdminTab === "home") renderHomeFlow((currentUser && currentUser.displayName) || "");
    });
    var openListenTodayPrefBtn = document.getElementById("account-pref-open-listen-today");
    if (openListenTodayPrefBtn) {
      openListenTodayPrefBtn.addEventListener("click", function () {
        closeAccountModal();
        openListenTodayModal();
      });
    }
    ["pref-theme-system", "pref-theme-dark", "pref-theme-light"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("change", function () {
        if (!this.checked) return;
        writeAppTheme(this.value);
        setAccountMessage("Theme updated for this browser.", "success");
      });
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
    document.getElementById("account-pref-pick-default-voice").addEventListener("click", function () {
      if (!requireWebPaidTier(WEB_PAID_FEATURE_COPY.setDefault)) return;
      openMediaPicker({ kind: "account-default", field: "voice" });
    });
    document.getElementById("account-pref-pick-default-background").addEventListener("click", function () {
      if (!requireWebPaidTier(WEB_PAID_FEATURE_COPY.setDefault)) return;
      openMediaPicker({ kind: "account-default", field: "background" });
    });
    var prefAdminMode = document.getElementById("pref-admin-mode");
    if (prefAdminMode) {
      prefAdminMode.addEventListener("change", function () {
        writeAdminModeEnabled(!!prefAdminMode.checked);
      });
    }
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
        if (tab !== "playlists" && playlistDetailVisible) {
          closePlaylistDetailView();
        }
        if (tab === "home") {
          setHomeFlowStep("landing", displayName || "");
        }
        setAdminTab(tab);
      });
    });
    root.querySelectorAll("[data-library-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var nextTab = btn.getAttribute("data-library-tab") || "my-library";
        if (nextTab !== "app-library") activePremadeCategoryId = null;
        activeLibraryTab = nextTab;
        renderLibrarySubtab();
        if (activeLibraryTab === "my-library") renderScripts(currentScripts);
        else renderPremade();
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
    (function bindMiniPlayerVolume() {
      var vol = document.getElementById("mini-player-volume");
      var step = 0.07;
      function bump(delta) {
        var cur = readPlaybackVolume();
        var next = Math.min(1, Math.max(0, cur + delta));
        writePlaybackVolume(next);
        applyPlaybackVolumeToActiveAudio();
        if (vol) vol.value = String(next);
      }
      if (vol) {
        vol.value = String(readPlaybackVolume());
        vol.addEventListener("input", function () {
          var v = parseFloat(vol.value);
          if (!isFinite(v)) return;
          writePlaybackVolume(v);
          applyPlaybackVolumeToActiveAudio();
        });
      }
      var down = document.getElementById("mini-player-vol-down");
      if (down) {
        down.addEventListener("click", function () {
          bump(-step);
        });
      }
      var up = document.getElementById("mini-player-vol-up");
      if (up) {
        up.addEventListener("click", function () {
          bump(step);
        });
      }
    })();
    document.getElementById("playlist-picker-close").addEventListener("click", function () {
      closePlaylistPicker();
    });
    document.getElementById("listen-today-close").addEventListener("click", function () {
      closeListenTodayModal();
    });
    document.getElementById("listen-today-backdrop").addEventListener("click", function (ev) {
      if (ev.target === ev.currentTarget) closeListenTodayModal();
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
    document.getElementById("bg-publish-cancel").addEventListener("click", function () {
      closeBackgroundPublishModal();
    });
    document.getElementById("bg-publish-submit").addEventListener("click", function () {
      publishBackgroundFromModal();
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
        var tab = btn.getAttribute("data-voices-tab") || "app-voices";
        if (tab === "my-voices" && !isWebPaidTierForAI()) {
          promptWebPaidUpgrade(WEB_PAID_FEATURE_COPY.myVoices);
          return;
        }
        activeVoicesTab = tab;
        renderVoices();
      });
    });
    root.querySelectorAll("[data-audio-page-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tab = btn.getAttribute("data-audio-page-tab") || "my-audio";
        if (tab === "my-audio" && !isWebPaidTierForAI()) {
          promptWebPaidUpgrade(WEB_PAID_FEATURE_COPY.myAudio);
          return;
        }
        activeAudioPageTab = tab;
        renderAudioPage();
      });
    });
    var audioImportBtn = document.getElementById("btn-audio-import");
    var audioImportInput = document.getElementById("audio-import-input");
    if (audioImportBtn && audioImportInput) {
      audioImportBtn.addEventListener("click", function () {
        if (!requireWebPaidTier(WEB_PAID_FEATURE_COPY.bgImport)) return;
        setBackgroundsMessage("Choose an audio file (MP3, M4A, WAV, …). Stored only in this browser.", "");
        audioImportInput.click();
      });
      audioImportInput.addEventListener("change", handleUserBackgroundImportSelected);
    }
    if (window.ResizeObserver) {
      var adminHead = document.querySelector(".app-admin-sticky-head");
      if (adminHead) {
        var headRo = new ResizeObserver(function () {
          syncSubnavStickyOffset();
        });
        headRo.observe(adminHead);
      }
    }
    window.onresize = function () {
      syncVoiceSegmentedPill();
      syncLibrarySegmentedPill();
      syncAudioPageSegmentedPill();
      updatePremadeExpandAllToggleUi();
      syncSubnavStickyOffset();
    };
    requestAnimationFrame(function () {
      requestAnimationFrame(syncSubnavStickyOffset);
    });
    document.getElementById("btn-voice-clone").addEventListener("click", function () {
      if (!requireWebPaidTier(WEB_PAID_FEATURE_COPY.voiceUpload)) return;
      setVoicesMessage("Choose a clear voice audio file to upload.", "");
      beginVoiceUploadFlow("clone");
    });
    document.getElementById("btn-voice-record").addEventListener("click", function () {
      if (!requireWebPaidTier(WEB_PAID_FEATURE_COPY.voiceClone)) return;
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
    bindSectionSearchControls();
    bindAITextEditModal();
    ["speed", "stability", "similarity", "style"].forEach(function (k) {
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
    ["speed", "stability", "similarity", "style"].forEach(function (k) {
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
    applyAdminModeUi();
    syncPaidFeatureControls();
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
    postScreenMessage("publish-premade-message", text, kind);
  }

  function openPublishPremadeModal() {
    if (!adminModeEnabled) return;
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

  function makeSafePremadeFilename(title) {
    var cleaned = (title || "premade-audio")
      .replace(/[^\w\s\-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase();
    return cleaned || "premade-audio";
  }

  function makeSafeBackgroundFilename(title) {
    var cleaned = makeSafePremadeFilename(title || "background");
    return cleaned === "premade-audio" ? "background" : cleaned;
  }

  function setBackgroundPublishMessage(text, kind) {
    postScreenMessage("bg-publish-message", text, kind);
  }

  function populateBgPublishCategorySelect() {
    var select = document.getElementById("bg-publish-category");
    if (!select) return;
    select.innerHTML = backgroundCategoryOrder
      .map(function (cid) {
        return (
          '<option value="' +
          escapeHtml(cid) +
          '">' +
          escapeHtml(backgroundCategoryDisplayName(cid)) +
          "</option>"
        );
      })
      .join("");
    if (!select.value) select.value = "general";
  }

  function openBackgroundPublishModal() {
    if (!adminModeEnabled) return;
    var backdrop = document.getElementById("background-publish-backdrop");
    if (!backdrop) return;
    populateBgPublishCategorySelect();
    var name = document.getElementById("bg-publish-name");
    var file = document.getElementById("bg-publish-file");
    var tier = document.getElementById("bg-publish-access-tier");
    if (name) name.value = "";
    if (file) file.value = "";
    if (tier) tier.value = "paid";
    setBackgroundPublishMessage("", "");
    backdrop.hidden = false;
  }

  function closeBackgroundPublishModal() {
    var backdrop = document.getElementById("background-publish-backdrop");
    if (backdrop) backdrop.hidden = true;
    setBackgroundPublishMessage("", "");
  }

  function newBgCloudDocId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return "bg-cloud-" + crypto.randomUUID().toLowerCase();
    }
    return "bg-cloud-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function publishBackgroundFromModal() {
    if (!adminModeEnabled) return;
    if (!currentUser) return;
    if (typeof firebase.storage !== "function") {
      setBackgroundPublishMessage("Firebase Storage is not loaded. Refresh and try again.", "error");
      return;
    }
    var displayName = ((document.getElementById("bg-publish-name").value || "").trim());
    var categoryID = (document.getElementById("bg-publish-category").value || "").trim() || "general";
    var accessTierEl = document.getElementById("bg-publish-access-tier");
    var accessTier = accessTierEl && accessTierEl.value === "free" ? "free" : "paid";
    var fileInput = document.getElementById("bg-publish-file");
    var file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
    if (!displayName) {
      setBackgroundPublishMessage("Display name is required.", "error");
      return;
    }
    if (!file) {
      setBackgroundPublishMessage("Choose an audio file to upload.", "error");
      return;
    }
    setBackgroundPublishMessage("Publishing (uploading to catalog storage)...", "");
    var docId = newBgCloudDocId();
    var ext = (file.name.split(".").pop() || "mp3").toLowerCase();
    if (ext !== "mp3" && ext !== "m4a" && ext !== "wav") ext = "mp3";
    var storagePath =
      "backgroundCatalog/" + makeSafeBackgroundFilename(displayName) + "-" + docId.slice(-8) + "." + ext;
    var contentType = ext === "wav" ? "audio/wav" : ext === "m4a" ? "audio/mp4" : "audio/mpeg";
    var storageRef = firebase.storage().ref(storagePath);
    storageRef
      .put(file, { contentType: contentType })
      .then(function (snap) {
        return snap.ref.getDownloadURL();
      })
      .then(function (downloadURL) {
        return backgroundCatalogCollection().doc(docId).set({
          name: displayName,
          categoryID: categoryID,
          accessTier: accessTier,
          audioURL: downloadURL,
          storagePath: storagePath,
          active: true,
          sortOrder: 0,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          createdBy: currentUser.uid,
        });
      })
      .then(function () {
        setBackgroundPublishMessage("Published to cloud catalog.", "success");
        setBackgroundsMessage('Published "' + displayName + '" to App Audio cloud catalog.', "success");
        setTimeout(function () {
          closeBackgroundPublishModal();
        }, 600);
      })
      .catch(function (e) {
        setBackgroundPublishMessage(e.message || "Could not publish background.", "error");
      });
  }

  function renderAdminCloudBackgroundsSection() {
    if (!adminModeEnabled) return "";
    var count = currentBackgroundCatalog.length;
    var intro =
      '<p class="app-muted" style="margin:0.5rem 0 0.65rem;font-size:0.88rem;line-height:1.45;">Cloud tracks in Firestore <code>backgroundCatalog</code>. Bundled App Audio files are unchanged.</p>';
    var header =
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;margin:0.5rem 0 0.65rem;">' +
      '<span class="app-muted" style="font-size:0.88rem;">Admin: cloud background catalog</span>' +
      '<button type="button" class="app-btn app-btn-secondary" id="btn-open-publish-background">Publish Background</button>' +
      "</div>";
    if (!count) {
      return (
        '<details class="admin-cloud-bg-panel" style="margin:0 0 1rem;padding:0.75rem;border:1px solid var(--border-subtle,#e5e7eb);border-radius:0.6rem;">' +
        '<summary style="cursor:pointer;font-weight:600;">Cloud backgrounds (0)</summary>' +
        intro +
        header +
        '<p class="app-muted" style="margin:0.35rem 0 0;">No cloud backgrounds yet.</p>' +
        "</details>"
      );
    }
    var rows = currentBackgroundCatalog
      .map(function (b) {
        return (
          '<div class="admin-cloud-bg-row" style="display:flex;align-items:center;gap:0.5rem;padding:0.45rem 0;border-bottom:1px solid var(--border-subtle,#e5e7eb);">' +
          '<div style="flex:1;min-width:0;"><strong>' +
          escapeHtml(b.name || "Background") +
          '</strong><br><span class="app-muted" style="font-size:0.82rem;">' +
          escapeHtml(backgroundCategoryDisplayName((b.categoryID || "").trim() || "general")) +
          " · " +
          escapeHtml((b.accessTier || "free") === "paid" ? "Paid" : "Free") +
          "</span></div>" +
          "</div>"
        );
      })
      .join("");
    return (
      '<details class="admin-cloud-bg-panel" open style="margin:0 0 1rem;padding:0.75rem;border:1px solid var(--border-subtle,#e5e7eb);border-radius:0.6rem;">' +
      '<summary style="cursor:pointer;font-weight:600;">Cloud backgrounds (' +
      count +
      ")</summary>" +
      intro +
      header +
      rows +
      "</details>"
    );
  }

  function bindAdminCloudBackgroundActions(scopeRoot) {
    if (!scopeRoot) return;
    var btn = scopeRoot.querySelector("#btn-open-publish-background");
    if (btn) {
      btn.addEventListener("click", function () {
        if (!adminModeEnabled) return;
        openBackgroundPublishModal();
      });
    }
  }

  function publishPremadeFromModal() {
    if (!adminModeEnabled) return;
    if (!currentUser) return;
    if (typeof firebase.storage !== "function") {
      setPublishPremadeMessage("Firebase Storage is not loaded. Refresh and try again.", "error");
      return;
    }
    var s = selectedPublishScript();
    if (!s) {
      setPublishPremadeMessage("Choose a script with audio first.", "error");
      return;
    }
    var title = ((document.getElementById("publish-title").value || "").trim() || s.title || "Premade Script");
    var description = (document.getElementById("publish-description").value || "").trim();
    var categoryID = (document.getElementById("publish-category").value || "").trim() || "confidence";
    var scriptText = (document.getElementById("publish-script-text").value || "").trim() || s.text || "";
    var accessTierEl = document.getElementById("publish-access-tier");
    var accessTier = accessTierEl && accessTierEl.value === "free" ? "free" : "paid";
    var audioURL = (s.audioURL || "").trim();
    if (!audioURL) {
      setPublishPremadeMessage("Selected script has no audio URL.", "error");
      return;
    }
    setPublishPremadeMessage("Publishing (uploading to catalog storage)...", "");
    var docRef = premadeCollection().doc();
    var docId = docRef.id;
    fetch(audioURL)
      .then(function (r) {
        if (!r.ok) throw new Error("Could not download script audio for publishing.");
        return r.blob();
      })
      .then(function (blob) {
        var ext = /\.wav(\?|$)/i.test(audioURL) ? "wav" : "mp3";
        var filename = makeSafePremadeFilename(title) + "-" + docId.slice(0, 8) + "." + ext;
        var storagePath = "premadeAudio/" + filename;
        var ref = firebase.storage().ref(storagePath);
        return ref.put(blob, { contentType: blob.type || (ext === "wav" ? "audio/wav" : "audio/mpeg") }).then(function (snap) {
          return snap.ref.getDownloadURL().then(function (downloadURL) {
            return docRef.set({
              title: title,
              categoryID: categoryID,
              description: description,
              scriptText: scriptText,
              audioURL: downloadURL,
              storagePath: storagePath,
              accessTier: accessTier,
              active: true,
              sourceScriptID: s.id,
              voiceID: (s.voiceID && String(s.voiceID).trim()) || "",
              backgroundID: (s.backgroundID && String(s.backgroundID).trim()) || "",
              createdByUID: currentUser.uid,
              createdByEmail: currentUser.email || "",
              createdByName: currentUser.displayName || "",
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
          });
        });
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
    postScreenMessage("premade-edit-message", text, kind);
  }

  function openEditPremadeModal(premade) {
    if (!premade) return;
    if (!adminModeEnabled) return;
    editingPremadeId = premade.id;
    var backdrop = document.getElementById("premade-edit-backdrop");
    var title = document.getElementById("premade-edit-title");
    var category = document.getElementById("premade-edit-category");
    var accessTier = document.getElementById("premade-edit-access-tier");
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
    if (accessTier) accessTier.value = premade.accessTier === "paid" ? "paid" : "free";
    desc.value = premade.description || "";
    text.value = resolvePremadeScriptText(premade);
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
    if (!adminModeEnabled) return;
    if (!editingPremadeId) return;
    var title = ((document.getElementById("premade-edit-title").value || "").trim());
    var categoryID = ((document.getElementById("premade-edit-category").value || "").trim() || "confidence");
    var accessTierEl = document.getElementById("premade-edit-access-tier");
    var accessTier = accessTierEl && accessTierEl.value === "free" ? "free" : "paid";
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
          accessTier: accessTier,
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

  function storagePathFromPremadeDownloadURL(urlString) {
    if (!urlString) return "";
    try {
      var path = new URL(urlString).pathname || "";
      var marker = "/o/";
      var idx = path.indexOf(marker);
      if (idx < 0) return "";
      return decodeURIComponent(path.slice(idx + marker.length));
    } catch (_e) {
      return "";
    }
  }

  function hidePremadeById(premadeId) {
    return premadeCollection()
      .doc(premadeId)
      .set(
        {
          active: false,
          hiddenAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  }

  function restorePremadeById(premadeId) {
    return premadeCollection()
      .doc(premadeId)
      .set(
        {
          active: true,
          hiddenAt: firebase.firestore.FieldValue.delete(),
        },
        { merge: true }
      );
  }

  function deletePremadeStorageIfPresent(premade) {
    if (!premade) return Promise.resolve();
    var path =
      (premade.storagePath && String(premade.storagePath).trim()) ||
      storagePathFromPremadeDownloadURL(premade.audioURL);
    if (!path || typeof firebase.storage !== "function") return Promise.resolve();
    return firebase.storage().ref(path).delete().catch(function () {
      return null;
    });
  }

  function deletePremadePermanentlyById(premadeId) {
    var premade = currentHiddenPremade.find(function (x) {
      return x.id === premadeId;
    });
    return deletePremadeStorageIfPresent(premade).then(function () {
      return premadeCollection().doc(premadeId).delete();
    });
  }

  function unpublishPremade() {
    if (!adminModeEnabled) return;
    if (!editingPremadeId) return;
    var premade = currentPremade.find(function (x) {
      return x.id === editingPremadeId;
    });
    if (
      !window.confirm(
        'Hide "' +
          ((premade && premade.title) || "this premade") +
          '" from the App Library?\n\nYou can restore it later from Hidden premades.'
      )
    ) {
      return;
    }
    setEditPremadeMessage("Hiding...", "");
    hidePremadeById(editingPremadeId)
      .then(function () {
        setPremadeMessage("Premade hidden from App Library.", "success");
        closeEditPremadeModal();
      })
      .catch(function (e) {
        setEditPremadeMessage(e.message || "Could not hide premade.", "error");
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
    syncListenShortcutPreferenceUi();
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
    var adminModeCb = document.getElementById("pref-admin-mode");
    if (adminModeCb) {
      adminModeCb.checked = adminModeEnabled;
    }
    var theme = readAppTheme();
    var thSys = document.getElementById("pref-theme-system");
    var thDark = document.getElementById("pref-theme-dark");
    var thLight = document.getElementById("pref-theme-light");
    if (thSys && thDark && thLight) {
      thSys.checked = theme === "system";
      thDark.checked = theme === "dark";
      thLight.checked = theme === "light";
    }
    syncAccountDefaultMediaLabels();
  }

  function syncAccountDefaultMediaLabels() {
    var vEl = document.getElementById("account-pref-default-voice-display");
    var bEl = document.getElementById("account-pref-default-background-display");
    if (vEl) vEl.textContent = voiceNameById(selectedVoiceId);
    if (bEl) bEl.textContent = backgroundNameById(selectedBackgroundId);
    var paid = isWebPaidTierForAI();
    ["account-pref-pick-default-voice", "account-pref-pick-default-background"].forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.hidden = !paid;
      btn.disabled = !paid;
      btn.title = paid ? "" : "Starter or Creator required";
    });
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
    if (chosen === "preferences") {
      syncAccountDefaultMediaLabels();
      syncListenShortcutPreferenceUi();
    }
  }

  function readPrefAutoPlay() {
    try {
      return localStorage.getItem(PREF_AUTO_PLAY_KEY) === "1";
    } catch (_e) {
      return false;
    }
  }

  function openAccountModal(options) {
    options = options || {};
    if (options.focusUsageAddOn) accountOpenFocusUsageAddOn = true;
    var bd = document.getElementById("account-modal-backdrop");
    if (!bd) return;
    resetAccountPlansPanel();
    syncAccountPreferencesForm();
    syncAccountAppleLinkUI();
    renderAccountInsights();
    renderUsageAddOnSection();
    syncAccountSharedListenersRow();
    refreshAccountInsightsFromCloud().then(function () {
      if (accountOpenFocusUsageAddOn) {
        accountOpenFocusUsageAddOn = false;
        scrollToUsageAddOnSection();
      }
    });
    refreshShareManagementPanel();
    setAccountModalTab("settings");
    bd.hidden = false;
    var btn = document.getElementById("btn-account-menu");
    if (btn) btn.setAttribute("aria-expanded", "true");
  }

  function closeAccountModal() {
    var bd = document.getElementById("account-modal-backdrop");
    if (!bd) return;
    resetAccountPlansPanel();
    bd.hidden = true;
    var b = document.getElementById("btn-account-menu");
    if (b) b.setAttribute("aria-expanded", "false");
  }

  function setAdminTab(tabId) {
    var normalized = tabId || "home";
    if (normalized === "backgrounds") normalized = "audio";
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
      audio: "section-audio",
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
    syncScreenHelpButtonLabel();
    if (activeAdminTab === "library" || activeAdminTab === "voices" || activeAdminTab === "audio") {
      requestAnimationFrame(function () {
        syncSubnavStickyOffset();
        if (activeAdminTab === "audio") syncAudioPageSegmentedPill();
      });
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

  function syncSubnavStickyOffset() {
    var head = document.querySelector(".app-admin-sticky-head");
    if (!head) return;
    var h = head.getBoundingClientRect().height;
    if (!isFinite(h) || h <= 0) return;
    document.documentElement.style.setProperty("--app-subnav-sticky-top", Math.ceil(h) + "px");
  }

  function renderLibrarySubtab() {
    var myBtn = document.getElementById("library-tab-my");
    var appBtn = document.getElementById("library-tab-app");
    var mySection = document.getElementById("library-sub-my");
    var appSection = document.getElementById("library-sub-app");
    var myTools = document.getElementById("library-my-only-toolbar");
    var appTools = document.getElementById("library-app-only-toolbar");
    if (myBtn) myBtn.classList.toggle("is-active", activeLibraryTab === "my-library");
    if (appBtn) appBtn.classList.toggle("is-active", activeLibraryTab === "app-library");
    if (mySection) mySection.hidden = activeLibraryTab !== "my-library";
    if (appSection) appSection.hidden = activeLibraryTab !== "app-library";
    if (myTools) myTools.style.display = activeLibraryTab === "my-library" ? "" : "none";
    if (appTools) appTools.style.display = activeLibraryTab === "app-library" ? "" : "none";
    if (activeLibraryTab !== "my-library") closeLibraryCreateMenu();
    syncLibrarySegmentedPill();
    if (activeLibraryTab === "my-library") updateLibraryExpandAllToggleUi();
    if (activeLibraryTab === "app-library") updatePremadeExpandAllToggleUi();
    var librarySearchInput = document.getElementById("section-search-input-library");
    if (librarySearchInput) {
      librarySearchInput.placeholder =
        activeLibraryTab === "app-library" ? "Search app library…" : "Search my library…";
    }
    if (sectionSearchOpen.library && normalizeSectionSearchQuery(sectionSearchQuery.library)) {
      rerenderForSectionSearch("library");
    }
    requestAnimationFrame(function () {
      syncSubnavStickyOffset();
    });
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
    postScreenMessage("generation-message", text, kind);
  }

  function setMediaPickerMessage(text, kind) {
    postScreenMessage("media-picker-message", text, kind);
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
    var bid = (backgroundID && String(backgroundID).trim()) || "";
    if (!bid) return "Background";
    if (isKnownUserBackgroundId(bid)) {
      var meta = mergedUserBackgroundMetas().find(function (m) {
        return m && m.id === bid;
      });
      return (meta && meta.name) || "My audio";
    }
    var found = backgroundEntryById(bid);
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
    var builtin = availableBackgrounds.find(function (b) {
      return b.id === bid;
    });
    if (builtin) {
      return {
        id: builtin.id,
        name: builtin.name,
        categoryID: builtin.categoryID,
        file: builtin.file,
        accessTier: "free",
        isCloudCatalog: false,
      };
    }
    var cloud = currentBackgroundCatalog.find(function (b) {
      return b.id === bid;
    });
    if (cloud) return cloud;
    if (isKnownUserBackgroundId(bid)) {
      var meta = mergedUserBackgroundMetas().find(function (m) {
        return m && m.id === bid;
      });
      var cloud = currentCloudUserBackgrounds.find(function (b) {
        return b && b.id === bid;
      });
      if (!meta && !cloud) return null;
      return {
        id: bid,
        name: (meta && meta.name) || (cloud && cloud.name) || "Imported audio",
        categoryID: "my-upload",
        file: "",
        audioURL: (meta && meta.audioURL) || (cloud && cloud.audioURL) || "",
        userUpload: true,
      };
    }
    return null;
  }

  function backgroundTrackAssetUrl(filename) {
    var fn = (filename && String(filename).trim()) || "";
    if (!fn) return "";
    return new URL("../audio/backgrounds/" + encodeURIComponent(fn), window.location.href).href;
  }

  function voiceSampleAssetUrl(filename) {
    var fn = (filename && String(filename).trim()) || "";
    if (!fn) return "";
    return new URL("../audio/voices/" + encodeURIComponent(fn), window.location.href).href;
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
        var premadeRow = {
          id: "static-premade-" + cid + "-" + String(idx + 1),
          title: title,
          categoryID: cid,
          description: "Built-in premade audio",
          scriptText: "",
        };
        premadeRow.scriptText = resolvePremadeScriptText(premadeRow);
        rows.push({
          id: premadeRow.id,
          title: title,
          categoryID: cid,
          description: "Built-in premade audio",
          scriptText: premadeRow.scriptText,
          audioURL: staticUrl,
          accessTier: "free",
          isCloudCatalog: false,
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

  /** Same triangle / bars SVG pair as library script cards (`script-card-play-btn`). */
  function libraryTransportPlayPauseIconSvg(isPlaying) {
    if (!isPlaying) {
      return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>'
      );
    }
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
    );
  }

  function mediaCardPlusIconSvg() {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
    );
  }

  function mediaCardSavedIconSvg() {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>'
    );
  }

  function mediaCardVoiceSettingsIconSvg() {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
      '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>' +
      '<line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>' +
      '<line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>' +
      '<line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>' +
      "</svg>"
    );
  }

  function mediaCardTrashIconSvg() {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
      '<polyline points="3 6 5 6 21 6"/>' +
      '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' +
      '<line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>' +
      "</svg>"
    );
  }

  function mediaCardDefaultStarIconSvg(isDefault) {
    if (isDefault) {
      return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
      );
    }
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
    );
  }

  function mediaCardPlayBtnHtml(dataAttr, dataValue, isPlaying, title) {
    var label = title || (isPlaying ? "Pause" : "Play");
    return (
      '<button type="button" class="script-card-play-btn" ' +
      dataAttr +
      '="' +
      escapeHtml(dataValue) +
      '" title="' +
      escapeHtml(label) +
      '" aria-label="' +
      escapeHtml(label) +
      '">' +
      libraryTransportPlayPauseIconSvg(isPlaying) +
      "</button>"
    );
  }

  function mediaCardIconActionBtnHtml(dataAttr, dataValue, title, iconSvg, isActive, extraClass) {
    return (
      '<button type="button" class="app-btn app-btn-secondary library-script-share-btn media-card-icon-btn' +
      (isActive ? " is-active" : "") +
      (extraClass ? " " + extraClass : "") +
      '" ' +
      dataAttr +
      '="' +
      escapeHtml(dataValue) +
      '" title="' +
      escapeHtml(title) +
      '" aria-label="' +
      escapeHtml(title) +
      '">' +
      iconSvg +
      "</button>"
    );
  }

  function isVoicePreviewing(voiceId) {
    var vid = (voiceId && String(voiceId).trim()) || "";
    return !!(
      activeAudio &&
      !activeAudioScriptId &&
      activeVoicePreviewId === vid &&
      !activeAudio.paused
    );
  }

  function voiceOptionById(voiceId, fallbackList) {
    var id = (voiceId && String(voiceId).trim()) || "";
    if (!id) return null;
    if (Array.isArray(fallbackList) && fallbackList.length) {
      var fromList = fallbackList.find(function (v) {
        return v && v.id === id;
      });
      if (fromList) return fromList;
    }
    var builtIn = availableVoices.find(function (v) {
      return v.id === id;
    });
    if (builtIn) return builtIn;
    return (
      currentClonedVoices.find(function (v) {
        return v.id === id;
      }) || null
    );
  }

  function previewBackgroundById(backgroundId, onError) {
    var entry = backgroundEntryById(backgroundId);
    if (!entry || entry.id === "bg-none") return Promise.resolve(false);
    var canPrev =
      !!(entry.file && String(entry.file).trim()) ||
      !!(entry.audioURL && String(entry.audioURL).trim()) ||
      !!entry.userUpload ||
      isKnownUserBackgroundId(entry.id);
    if (!canPrev) return Promise.resolve(false);

    if (backgroundPreviewAudio && backgroundPreviewId === entry.id) {
      if (backgroundPreviewAudio.paused) {
        return backgroundPreviewAudio
          .play()
          .then(function () {
            return true;
          })
          .catch(function () {
            stopBackgroundPreview();
            var msg =
              "Could not play preview. Check the file exists under audio/backgrounds/ or re-import your custom track.";
            if (typeof onError === "function") onError(msg);
            return false;
          });
      }
      backgroundPreviewAudio.pause();
      return Promise.resolve(true);
    }

    stopBackgroundPreview();
    function playFromUrl(url) {
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
            "Could not play preview. Check the file exists under audio/backgrounds/ or re-import your custom track.";
          if (typeof onError === "function") onError(msg);
          return false;
        });
    }
    if (entry.userUpload || isKnownUserBackgroundId(entry.id)) {
      if (entry.audioURL && String(entry.audioURL).trim()) {
        return playFromUrl(String(entry.audioURL).trim());
      }
      revokeCachedUserBgObjectUrl(entry.id);
      return getUserBackgroundBlob(entry.id).then(function (blob) {
        if (!blob) {
          stopBackgroundPreview();
          if (typeof onError === "function") onError("Imported background could not be loaded.");
          return false;
        }
        var objUrl = URL.createObjectURL(blob);
        userBgObjectUrlCache[entry.id] = objUrl;
        return playFromUrl(objUrl);
      });
    }
    if (entry.audioURL && String(entry.audioURL).trim()) {
      var cloudBgUrl = String(entry.audioURL).trim();
      reportCatalogStorageCostFromUrl(cloudBgUrl, "background_preview");
      return playFromUrl(cloudBgUrl);
    }
    var url = backgroundTrackAssetUrl(entry.file);
    return playFromUrl(url);
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
      var bgIdRaw = (backgroundId && String(backgroundId).trim()) || "";
      if (!bgIdRaw || bgIdRaw === "bg-none") {
        reject(new Error("Unknown background for mixing."));
        return;
      }
      var entry = backgroundEntryById(bgIdRaw);
      if (!entry && !isKnownUserBackgroundId(bgIdRaw)) {
        reject(new Error("Unknown background for mixing."));
        return;
      }
      if (
        !entry ||
        (!entry.file &&
          !(entry.audioURL && String(entry.audioURL).trim()) &&
          !(entry.userUpload || isKnownUserBackgroundId(bgIdRaw)))
      ) {
        reject(new Error("Unknown background for mixing."));
        return;
      }
      var ACtx = window.AudioContext || window.webkitAudioContext;
      if (!ACtx) {
        reject(new Error("Web Audio is not available in this browser."));
        return;
      }
      var ctx = new ACtx();
      var decodeBgPromise;
      if (entry.userUpload || isKnownUserBackgroundId(bgIdRaw)) {
        decodeBgPromise = getUserBackgroundBlob(bgIdRaw).then(function (blob) {
          if (!blob) {
            throw new Error("Imported background audio could not be loaded. Open My Audio on a device where it was imported.");
          }
          return blob.arrayBuffer().then(function (buf) {
            return ctx.decodeAudioData(buf.slice(0));
          });
        });
      } else if (entry.audioURL && String(entry.audioURL).trim()) {
        var cloudMixBgUrl = String(entry.audioURL).trim();
        decodeBgPromise = fetch(cloudMixBgUrl).then(function (r) {
          if (!r.ok) {
            throw new Error("Cloud background audio could not be loaded (" + r.status + ").");
          }
          return r.arrayBuffer().then(function (bgAb) {
            reportCatalogStorageCost(cloudMixBgUrl, bgAb.byteLength || 0, "background_mix");
            return bgAb;
          });
        }).then(function (bgAb) {
          return ctx.decodeAudioData(bgAb.slice(0));
        });
      } else {
        decodeBgPromise = fetch(backgroundTrackAssetUrl(entry.file)).then(function (r) {
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
        });
      }
      Promise.all([ctx.decodeAudioData(ttsArrayBuffer.slice(0)), decodeBgPromise])
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

  function isNetworkFetchFailure(err) {
    if (!err) return false;
    var msg = String(err.message || err).toLowerCase();
    return (
      msg === "failed to fetch" ||
      msg.indexOf("networkerror") >= 0 ||
      msg.indexOf("load failed") >= 0 ||
      msg.indexOf("network request failed") >= 0
    );
  }

  function networkFetchErrorMessage(context) {
    return (
      "Could not download " +
      (context || "audio") +
      ". Check your internet connection and try disabling ad blockers for focushift.app. " +
      "If it keeps failing, set Background to None and generate again, or use the iOS app."
    );
  }

  function fetchAudioJobStagingTts(jobId, token) {
    if (!jobId || !token) {
      return Promise.reject(new Error("Missing audio job credentials."));
    }
    return fetch(
      backendBaseURL() + "/audio-jobs/" + encodeURIComponent(jobId) + "/staging-tts",
      {
        method: "GET",
        headers: { Authorization: "Bearer " + token },
      }
    )
      .then(function (resp) {
        return resp.arrayBuffer().then(function (ab) {
          if (!resp.ok) {
            var errMsg = "Could not download speech audio (" + resp.status + ").";
            if (resp.status === 404) {
              errMsg = "Speech audio is not ready yet. Wait a moment and try Generate again.";
            }
            throw new Error(errMsg);
          }
          if (!ab || !ab.byteLength) {
            throw new Error("Speech audio download was empty.");
          }
          return ab;
        });
      })
      .catch(function (err) {
        if (isNetworkFetchFailure(err)) {
          throw new Error(networkFetchErrorMessage("speech audio"));
        }
        throw err;
      });
  }

  function storagePathFromFirebaseDownloadUrl(url) {
    try {
      var u = new URL(url);
      if (u.hostname !== "firebasestorage.googleapis.com") return "";
      var parts = u.pathname.split("/o/");
      if (parts.length < 2) return "";
      return decodeURIComponent(parts[1].split("?")[0]);
    } catch (_e) {
      return "";
    }
  }

  function fetchArrayBufferFromUrl(url, contextLabel) {
    function viaHttp() {
      return fetch(url).then(function (r) {
        if (!r.ok) {
          throw new Error(
            "Could not download " + (contextLabel || "file") + " (" + r.status + ")."
          );
        }
        return r.arrayBuffer();
      });
    }
    return viaHttp().catch(function (err) {
      if (!isNetworkFetchFailure(err)) throw err;
      var path = storagePathFromFirebaseDownloadUrl(url);
      if (!path || typeof firebase.storage !== "function" || !currentUser) {
        throw new Error(networkFetchErrorMessage(contextLabel));
      }
      var ref = firebase.storage().ref(path);
      if (!ref || typeof ref.getDownloadURL !== "function") {
        throw new Error(networkFetchErrorMessage(contextLabel));
      }
      return ref
        .getDownloadURL()
        .then(function (signedUrl) {
          return fetch(signedUrl).then(function (r) {
            if (!r.ok) {
              throw new Error(
                "Could not download " + (contextLabel || "file") + " (" + r.status + ")."
              );
            }
            return r.arrayBuffer();
          });
        })
        .catch(function (storageErr) {
          if (storageErr && storageErr.message && storageErr.message.indexOf("Could not download") === 0) {
            throw storageErr;
          }
          var detail = storageErr && storageErr.message ? " " + storageErr.message : "";
          throw new Error(networkFetchErrorMessage(contextLabel) + detail);
        });
    });
  }

  function validateScriptForAudioGeneration(script) {
    if (!script) return "Script not found.";
    var voiceId = effectiveVoiceIdForScript(script);
    if (!voiceId) return "Pick a voice before generating audio.";
    if (!isWebVoiceAvailableForGeneration(voiceId)) {
      return webGenerationGateMessage("voice");
    }
    var bgId = effectiveBackgroundIdForScript(script);
    if (!isWebBackgroundAvailableForGeneration(bgId)) {
      return webGenerationGateMessage("background");
    }
    if (voiceId.indexOf("-") >= 0) {
      var cloned = clonedVoiceById(voiceId);
      if (!cloned || !(cloned.elevenLabsVoiceID && String(cloned.elevenLabsVoiceID).trim())) {
        return "This cloned voice is not ready on the server. Refresh the page or recreate the voice under Voices.";
      }
    }
    if (typeof firebase.storage !== "function") {
      return "Firebase Storage is not loaded. Refresh the page and try again.";
    }
    return "";
  }

  function finalizeAwaitingClientMix(uid, scriptId, jobId, backgroundId, token) {
    return fetchAudioJobStagingTts(jobId, token)
      .then(function (ttsAb) {
        return mixTtsWithBackgroundToWavBlob(ttsAb, backgroundId);
      })
      .then(function (wavBlob) {
        return uploadFinalMixedWav(uid, scriptId, wavBlob);
      });
  }

  function setVoicesMessage(text, kind) {
    postScreenMessage("voices-message", text, kind);
  }

  function setBackgroundsMessage(text, kind) {
    postScreenMessage("backgrounds-message", text, kind);
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

  function bindVoiceGenderFilterActions() {
    var wrap = document.getElementById("voice-gender-filter-wrap");
    if (!wrap) return;
    wrap.querySelectorAll("[data-voice-gender-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var filter = btn.getAttribute("data-voice-gender-filter") || "all";
        if (filter === activeVoiceGenderFilter) return;
        activeVoiceGenderFilter = filter;
        renderVoices();
      });
    });
  }

  function renderVoices() {
    var list = document.getElementById("voices-list");
    if (!list) return;
    var tabMy = document.getElementById("voices-tab-my");
    var tabApp = document.getElementById("voices-tab-app");
    var genderWrap = document.getElementById("voice-gender-filter-wrap");
    if (tabMy) tabMy.classList.toggle("is-active", activeVoicesTab === "my-voices");
    if (tabApp) tabApp.classList.toggle("is-active", activeVoicesTab === "app-voices");
    if (tabMy) tabMy.classList.toggle("is-tier-locked", !isWebPaidTierForAI());
    if (genderWrap) {
      genderWrap.hidden = activeVoicesTab !== "app-voices";
      genderWrap.innerHTML = activeVoicesTab === "app-voices" ? voiceGenderFilterBarHtml() : "";
      bindVoiceGenderFilterActions();
    }
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
    sourceVoices = filteredVoicesForDisplay(sourceVoices);
    if (!sourceVoices.length) {
      list.innerHTML =
        normalizeSectionSearchQuery(sectionSearchQuery.voices) || activeVoiceGenderFilter !== "all"
          ? '<div class="app-empty-hint">No voices match your search or filter.</div>'
          : '<div class="app-empty-hint">No voices here yet. Save from App Voices or create a cloned voice.</div>';
      return;
    }

    list.innerHTML = sourceVoices
      .map(function (v) {
        var isSelected = v.id === selectedVoiceId;
        var inMyVoices = !!savedSet[v.id] || currentClonedVoices.some(function (cv) { return cv.id === v.id; });
        var supportsSaveToggle = activeVoicesTab === "app-voices" && isWebPaidTierForAI();
        var isCloned = isClonedVoiceOption(v);
        var supportsCloneActions = activeVoicesTab === "my-voices" && isCloned;
        var isAudible = isVoicePreviewing(v.id);
        return (
          '<div class="app-modal-row media-card-row">' +
          '  <div class="media-card-row-main">' +
          '    <div class="app-modal-row-name">' +
          escapeHtml(v.name) +
          (v.description ? '<div class="app-muted" style="font-size:0.75rem;">' + escapeHtml(v.description) + "</div>" : "") +
          "    </div>" +
          "  </div>" +
          '<div class="media-card-actions">' +
          mediaCardPlayBtnHtml("data-voice-preview-id", v.id, isAudible) +
          (supportsSaveToggle
            ? mediaCardIconActionBtnHtml(
                "data-voice-save-id",
                v.id,
                inMyVoices ? "Remove from My Voices" : "Add to My Voices",
                inMyVoices ? mediaCardSavedIconSvg() : mediaCardPlusIconSvg(),
                inMyVoices
              )
            : "") +
          (supportsCloneActions
            ? mediaCardIconActionBtnHtml(
                "data-voice-settings-id",
                v.id,
                "Voice settings",
                mediaCardVoiceSettingsIconSvg(),
                false,
                "media-card-icon-btn-settings"
              ) +
              mediaCardIconActionBtnHtml(
                "data-voice-delete-id",
                v.id,
                "Delete cloned voice",
                mediaCardTrashIconSvg(),
                false,
                "media-card-icon-btn-delete"
              )
            : "") +
          (isWebPaidTierForAI()
            ? mediaCardIconActionBtnHtml(
                "data-voice-id",
                v.id,
                isSelected ? "Default voice" : "Set as default voice",
                mediaCardDefaultStarIconSvg(isSelected),
                isSelected
              )
            : "") +
          "</div>" +
          "</div>"
        );
      })
      .join("");
    list.querySelectorAll("[data-voice-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!requireWebPaidTier(WEB_PAID_FEATURE_COPY.setDefault)) return;
        var voiceID = btn.getAttribute("data-voice-id");
        if (!voiceID || voiceID === selectedVoiceId) return;
        if (!isWebVoiceAvailableForGeneration(voiceID)) {
          promptWebPaidUpgrade(webGenerationGateMessage("voice"));
          return;
        }
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
        if (!requireWebPaidTier(WEB_PAID_FEATURE_COPY.myVoices)) return;
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
        previewVoiceById(voiceID, function (msg) {
          setVoicesMessage(msg, "error");
        }).then(function () {
          renderVoices();
        });
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
    var wrap = document.getElementById("voices-segmented-tabs");
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

  function clampVoiceSpeed(n, fallback) {
    var x = Number(n);
    if (!isFinite(x)) x = fallback;
    return Math.max(0.7, Math.min(1.2, x));
  }

  function normalizeVoiceSettingsPayload(raw) {
    function clamp01(n, fallback) {
      var x = Number(n);
      if (!isFinite(x)) return fallback;
      return Math.max(0, Math.min(1, x));
    }
    var s = raw || {};
    return {
      speed: clampVoiceSpeed(s.speed, 1.0),
      stability: clamp01(s.stability, 0.5),
      similarity_boost: clamp01(s.similarity_boost != null ? s.similarity_boost : s.similarityBoost, 0.75),
      style: clamp01(s.style, 0),
      use_speaker_boost: s.use_speaker_boost !== false && s.useSpeakerBoost !== false,
    };
  }

  function persistClonedVoiceSettingsDoc(localVoiceId, settingsPayload) {
    if (!currentUser || !localVoiceId) return Promise.resolve();
    return clonedVoicesCollection(currentUser.uid)
      .doc(localVoiceId)
      .set(
        {
          settings: settingsPayload,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  }

  function voiceSettingsForAudioJob(localVoiceId) {
    var cloned = clonedVoiceById(localVoiceId);
    if (!cloned || !cloned.settings) return null;
    return normalizeVoiceSettingsPayload(cloned.settings);
  }

  function beginVoiceUploadFlow(mode) {
    if (!requireWebPaidTier(WEB_PAID_FEATURE_COPY.voiceUpload)) return;
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
    postScreenMessage("voice-recording-status", text, kind, { inlineOnly: true });
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
    postScreenMessage("voice-consent-message", text, kind);
  }

  function setVoiceMicHelpMessage(text, kind) {
    postScreenMessage("voice-mic-help-message", text, kind);
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
    postScreenMessage("voice-adjust-message", text, kind);
  }

  function updateVoiceAdjustReadout(kind) {
    var input = document.getElementById("voice-adjust-" + kind);
    var out = document.getElementById("voice-adjust-" + kind + "-value");
    if (!input || !out) return;
    var val = Number(input.value || 0);
    if (!isFinite(val)) val = 0;
    out.textContent = kind === "speed" ? val.toFixed(2) : val.toFixed(2);
  }

  function currentVoiceAdjustPayload() {
    var speed = document.getElementById("voice-adjust-speed");
    var stability = document.getElementById("voice-adjust-stability");
    var similarity = document.getElementById("voice-adjust-similarity");
    var style = document.getElementById("voice-adjust-style");
    var speaker = document.getElementById("voice-adjust-speaker-boost");
    return normalizeVoiceSettingsPayload({
      speed: speed && speed.value,
      stability: stability && stability.value,
      similarity_boost: similarity && similarity.value,
      style: style && style.value,
      use_speaker_boost: !!(speaker && speaker.checked),
    });
  }

  function applyVoiceAdjustPreset(preset) {
    var sp = document.getElementById("voice-adjust-speed");
    var s = document.getElementById("voice-adjust-stability");
    var m = document.getElementById("voice-adjust-similarity");
    var y = document.getElementById("voice-adjust-style");
    var b = document.getElementById("voice-adjust-speaker-boost");
    if (!sp || !s || !m || !y || !b) return;
    if (preset === "inner") {
      sp.value = "1.10"; s.value = "0.60"; m.value = "0.80"; y.value = "0.30"; b.checked = true;
    } else if (preset === "energetic") {
      sp.value = "1.10"; s.value = "0.60"; m.value = "0.80"; y.value = "0.50"; b.checked = true;
    } else if (preset === "calm") {
      sp.value = "0.90"; s.value = "0.70"; m.value = "0.70"; y.value = "0.00"; b.checked = true;
    } else if (preset === "clear") {
      sp.value = "1.00"; s.value = "0.60"; m.value = "0.90"; y.value = "0.20"; b.checked = true;
    } else {
      sp.value = "1.00"; s.value = "0.50"; m.value = "0.75"; y.value = "0.00"; b.checked = true;
    }
    updateVoiceAdjustReadout("speed");
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
        var sp = document.getElementById("voice-adjust-speed");
        var s = document.getElementById("voice-adjust-stability");
        var m = document.getElementById("voice-adjust-similarity");
        var y = document.getElementById("voice-adjust-style");
        var b = document.getElementById("voice-adjust-speaker-boost");
        if (sp) sp.value = String(clampVoiceSpeed(settings.speed, 1.1));
        if (s) s.value = String(typeof settings.stability === "number" ? settings.stability : 0.5);
        if (m) m.value = String(typeof settings.similarity_boost === "number" ? settings.similarity_boost : 0.75);
        if (y) y.value = String(typeof settings.style === "number" ? settings.style : 0.0);
        if (b) b.checked = settings.use_speaker_boost !== false;
        updateVoiceAdjustReadout("speed");
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
        applyPlaybackVolumeToActiveAudio();
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
        var payload = currentVoiceAdjustPayload();
        return persistClonedVoiceSettingsDoc(cloneAdjustLocalVoiceId, payload);
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
    if (!isWebPaidTierForAI()) {
      promptWebPaidUpgrade(WEB_PAID_FEATURE_COPY.voiceClone);
      return;
    }
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
    if (!requireWebPaidTier(WEB_PAID_FEATURE_COPY.voiceClone)) return;
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
    if (!requireWebPaidTier(WEB_PAID_FEATURE_COPY.voiceClone)) return;
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

  function startVoicePreviewPlayback(audioUrl, voice, isBlobURL) {
    if (activePreviewBlobURL) {
      try { URL.revokeObjectURL(activePreviewBlobURL); } catch (_e) {}
      activePreviewBlobURL = null;
    }
    stopActiveAudio(false);
    activeAudio = new Audio(audioUrl);
    if (isBlobURL) activePreviewBlobURL = audioUrl;
    applyPlaybackVolumeToActiveAudio();
    activeAudioScriptId = null;
    activeVoicePreviewId = voice.id || "";
    activeAudioTitle = "Voice preview — " + (voice.name || "Voice");
    bindAudioLifecycle(function () {
      if (activePreviewBlobURL) {
        try { URL.revokeObjectURL(activePreviewBlobURL); } catch (_e) {}
        activePreviewBlobURL = null;
      }
      activeAudioScriptId = null;
      activeVoicePreviewId = "";
      activeAudioTitle = "";
      activeAudio = null;
      updateMiniPlayer();
      if (activeAdminTab === "voices") renderVoices();
    });
    return activeAudio.play();
  }

  function previewVoiceSample(voice, onError) {
    if (!voice || !voice.id) return Promise.resolve(false);
    var sampleFile = (voice.file && String(voice.file).trim()) || "";
    if (sampleFile) {
      var sampleUrl = voiceSampleAssetUrl(sampleFile);
      if (!sampleUrl) {
        var missingMsg = "Could not preview voice.";
        if (typeof onError === "function") onError(missingMsg);
        else setVoicesMessage(missingMsg, "error");
        return Promise.resolve(false);
      }
      setVoicesMessage('Playing preview for "' + (voice.name || "voice") + '"...', "");
      return startVoicePreviewPlayback(sampleUrl, voice, false)
        .then(function () {
          updateMiniPlayer();
          setVoicesMessage("Playing preview.", "success");
          return true;
        })
        .catch(function () {
          var playMsg = "Could not play preview. Check the file exists under audio/voices/.";
          if (typeof onError === "function") onError(playMsg);
          else setVoicesMessage(playMsg, "error");
          return false;
        });
    }
    if (!currentUser) {
      var signInMsg = "Sign in to preview this voice.";
      if (typeof onError === "function") onError(signInMsg);
      else setVoicesMessage(signInMsg, "error");
      return Promise.resolve(false);
    }
    setVoicesMessage('Generating preview for "' + (voice.name || "voice") + '"...', "");
    return currentUser
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
        var blobURL = URL.createObjectURL(blob);
        return startVoicePreviewPlayback(blobURL, voice, true);
      })
      .then(function () {
        updateMiniPlayer();
        setVoicesMessage("Playing preview.", "success");
        return true;
      })
      .catch(function (e) {
        var errMsg = e.message || "Could not preview voice.";
        if (typeof onError === "function") onError(errMsg);
        else setVoicesMessage(errMsg, "error");
        return false;
      });
  }

  function previewVoiceById(voiceId, onError) {
    var voice = voiceOptionById(voiceId);
    if (!voice) return Promise.resolve(false);
    if (activeVoicePreviewId === voice.id && activeAudio && !activeAudioScriptId) {
      if (activeAudio.paused) {
        return activeAudio
          .play()
          .then(function () {
            updateMiniPlayer();
            return true;
          })
          .catch(function () {
            if (typeof onError === "function") {
              onError("Could not play preview.");
            }
            return false;
          });
      }
      activeAudio.pause();
      updateMiniPlayer();
      return Promise.resolve(true);
    }
    return previewVoiceSample(voice, onError);
  }

  function setVoiceSettingsMessage(text, kind) {
    postScreenMessage("voice-settings-message", text, kind);
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
    var speed = document.getElementById("voice-setting-speed");
    var stability = document.getElementById("voice-setting-stability");
    var similarity = document.getElementById("voice-setting-similarity");
    var style = document.getElementById("voice-setting-style");
    var speaker = document.getElementById("voice-setting-speaker-boost");
    if (!speed || !stability || !similarity || !style || !speaker) return;

    var s = settings || {};
    speed.value = String(clampVoiceSpeed(s.speed, 1.1));
    stability.value = String(typeof s.stability === "number" ? s.stability : 0.5);
    similarity.value = String(typeof s.similarity_boost === "number" ? s.similarity_boost : 0.8);
    style.value = String(typeof s.style === "number" ? s.style : 0.3);
    speaker.checked = s.use_speaker_boost !== false;

    updateVoiceSettingsReadout("speed");
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

    var speed = document.getElementById("voice-setting-speed");
    var stability = document.getElementById("voice-setting-stability");
    var similarity = document.getElementById("voice-setting-similarity");
    var style = document.getElementById("voice-setting-style");
    var speaker = document.getElementById("voice-setting-speaker-boost");
    if (!speed || !stability || !similarity || !style || !speaker) return;

    var payload = normalizeVoiceSettingsPayload({
      speed: speed.value,
      stability: stability.value,
      similarity_boost: similarity.value,
      style: style.value,
      use_speaker_boost: !!speaker.checked,
    });

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
        return persistClonedVoiceSettingsDoc(editingVoiceSettingsId, payload);
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

  function bindAudioTrackRowHandlers(scopeRoot) {
    if (!scopeRoot) return;
    scopeRoot.querySelectorAll("[data-background-preview]").forEach(function (pbtn) {
      pbtn.addEventListener("click", function () {
        var pid = pbtn.getAttribute("data-background-preview");
        previewBackgroundById(pid, function (msg) {
          setBackgroundsMessage(msg, "error");
        }).then(function () {
          renderAudioPage();
        });
      });
    });
    scopeRoot.querySelectorAll("[data-background-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!requireWebPaidTier(WEB_PAID_FEATURE_COPY.setDefault)) return;
        var backgroundID = btn.getAttribute("data-background-id");
        if (!backgroundID || backgroundID === selectedBackgroundId) return;
        if (!isWebBackgroundAvailableForGeneration(backgroundID)) {
          promptWebPaidUpgrade(webGenerationGateMessage("background"));
          return;
        }
        selectedBackgroundId = backgroundID;
        setBackgroundsMessage("Saving default background...", "");
        saveUserDefaults()
          .then(function () {
            renderAudioPage();
            setBackgroundsMessage("Default background saved.", "success");
          })
          .catch(function (e) {
            setBackgroundsMessage(e.message || "Could not save default background.", "error");
          });
      });
    });
    scopeRoot.querySelectorAll("[data-bg-category]").forEach(function (sec) {
      sec.addEventListener("toggle", function () {
        var cid = sec.getAttribute("data-bg-category");
        if (!cid) return;
        backgroundCategoryOpenById[cid] = !!sec.open;
      });
    });
    scopeRoot.querySelectorAll("[data-user-bg-delete]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var bid = btn.getAttribute("data-user-bg-delete");
        if (!bid) return;
        deleteUserBackgroundEntry(bid).then(function () {
          if (selectedBackgroundId === bid) {
            selectedBackgroundId = "bg-none";
            saveUserDefaults()
              .then(function () {
                renderAudioPage();
                setBackgroundsMessage("Imported track removed. Default reset to No Background.", "success");
              })
              .catch(function (_e2) {
                renderAudioPage();
              });
          } else {
            renderAudioPage();
            setBackgroundsMessage("Imported track removed.", "success");
          }
        });
      });
    });
    scopeRoot.querySelectorAll("[data-remove-saved-bg]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var bid = btn.getAttribute("data-remove-saved-bg");
        if (!bid) return;
        removeSavedAppBackgroundId(bid);
        if (selectedBackgroundId === bid) {
          selectedBackgroundId = "bg-none";
          saveUserDefaults()
            .finally(function () {
              renderAudioPage();
              setBackgroundsMessage("Removed from My Audio shortcuts.", "");
            });
        } else {
          renderAudioPage();
          setBackgroundsMessage("Removed from My Audio shortcuts.", "");
        }
      });
    });
    scopeRoot.querySelectorAll("[data-add-saved-bg]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!requireWebPaidTier(WEB_PAID_FEATURE_COPY.myAudio)) return;
        var bid = btn.getAttribute("data-add-saved-bg");
        if (!bid) return;
        addSavedAppBackgroundId(bid);
        renderAudioPage();
        setBackgroundsMessage("Added to My Audio.", "success");
      });
    });
  }

  function deleteUserBackgroundEntry(backgroundId) {
    var bid = (backgroundId && String(backgroundId).trim()) || "";
    if (!bid || !isKnownUserBackgroundId(bid)) return Promise.resolve();
    revokeCachedUserBgObjectUrl(bid);
    var next = loadUserBackgroundMetaList().filter(function (m) {
      return !m || m.id !== bid;
    });
    saveUserBackgroundMetaList(next);
    return Promise.all([deleteUserBackgroundBlob(bid).catch(function () {}), deleteCloudUserBackground(bid)]).then(
      function () {}
    );
  }

  function audioBuiltinRowMarkup(b, options) {
    options = options || {};
    var isSelected = b.id === selectedBackgroundId;
    var isAudible = isBackgroundPreviewing(b.id);
    var canPrev = backgroundRowCanPreview(b);
    var badges = "";
    if (b.isCloudCatalog) {
      badges += ' <span class="app-chip">Cloud</span>';
    }
    if (!canPrev) {
      badges += ' <span class="app-chip">Silent</span>';
    }
    var trailing = "";
    if (options.showPinToMy) {
      var savedNow = !!loadSavedAppBackgroundIdSet()[b.id];
      if (!savedNow) {
        trailing += mediaCardIconActionBtnHtml(
          "data-add-saved-bg",
          b.id,
          "Add to My Audio",
          mediaCardPlusIconSvg(),
          false
        );
      }
    }
    var transportHtml = canPrev ? mediaCardPlayBtnHtml("data-background-preview", b.id, isAudible) : "";
    return (
      '<div class="app-modal-row media-card-row">' +
      '  <div class="media-card-row-main">' +
      '    <div class="app-modal-row-name">' +
      escapeHtml(b.name) +
      badges +
      "</div>" +
      "  </div>" +
      '<div class="media-card-actions">' +
      transportHtml +
      trailing +
      (isWebPaidTierForAI()
        ? mediaCardIconActionBtnHtml(
            "data-background-id",
            b.id,
            isSelected ? "Default background" : "Set as default background",
            mediaCardDefaultStarIconSvg(isSelected),
            isSelected
          )
        : "") +
      "</div>" +
      "</div>"
    );
  }

  function audioSavedShortcutRowMarkup(builtinEntry) {
    var b = builtinEntry;
    var isSelected = b.id === selectedBackgroundId;
    var isAudible = isBackgroundPreviewing(b.id);
    var canPrev = backgroundRowCanPreview(b);
    return (
      '<div class="app-modal-row media-card-row">' +
      '  <div class="media-card-row-main">' +
      '    <div class="app-modal-row-name">' +
      escapeHtml(b.name) +
      ' <span class="app-muted" style="font-weight:400;">(App)</span></div>' +
      "  </div>" +
      '<div class="media-card-actions">' +
      (canPrev ? mediaCardPlayBtnHtml("data-background-preview", b.id, isAudible) : "") +
      '<button type="button" class="app-btn app-btn-ghost" style="padding:0.32rem 0.55rem;font-size:0.78rem;" data-remove-saved-bg="' +
      escapeHtml(b.id) +
      '">Remove from My</button>' +
      (isWebPaidTierForAI()
        ? mediaCardIconActionBtnHtml(
            "data-background-id",
            b.id,
            isSelected ? "Default background" : "Set as default background",
            mediaCardDefaultStarIconSvg(isSelected),
            isSelected
          )
        : "") +
      "</div>" +
      "</div>"
    );
  }

  function audioUserImportRowMarkup(meta) {
    var b = {
      id: meta.id,
      name: meta.name || "Imported audio",
      file: "",
      audioURL: meta.audioURL || "",
      userUpload: true,
    };
    var isSelected = b.id === selectedBackgroundId;
    var isAudible = isBackgroundPreviewing(b.id);
    return (
      '<div class="app-modal-row media-card-row">' +
      '  <div class="media-card-row-main">' +
      '    <div class="app-modal-row-name">' +
      escapeHtml(b.name) +
      "</div>" +
      "  </div>" +
      '<div class="media-card-actions">' +
      mediaCardPlayBtnHtml("data-background-preview", b.id, isAudible) +
      '<button type="button" class="app-btn app-btn-ghost" style="padding:0.32rem 0.55rem;font-size:0.78rem;color:#fca5a5;" data-user-bg-delete="' +
      escapeHtml(b.id) +
      '">Delete</button>' +
      (isWebPaidTierForAI()
        ? mediaCardIconActionBtnHtml(
            "data-background-id",
            b.id,
            isSelected ? "Default background" : "Set as default background",
            mediaCardDefaultStarIconSvg(isSelected),
            isSelected
          )
        : "") +
      "</div>" +
      "</div>"
    );
  }

  function renderAudioAppList() {
    var list = document.getElementById("audio-app-list");
    if (!list) return;
    var audioSearchQuery = normalizeSectionSearchQuery(sectionSearchQuery.audio);
    var grouped = {};
    backgroundCategoryOrder.forEach(function (cid) {
      grouped[cid] = [];
    });
    allAppBackgroundTracksIncludingCloud().forEach(function (b) {
      if (b.id === "bg-none") return;
      if (audioSearchQuery && !textMatchesSectionSearch(b.name, audioSearchQuery)) return;
      var cid = (b.categoryID && String(b.categoryID).trim()) || "general";
      if (!grouped[cid]) grouped[cid] = [];
      grouped[cid].push(b);
    });
    var none = availableBackgrounds.find(function (b) {
      return b.id === "bg-none";
    });
    if (none && audioSearchQuery && !textMatchesSectionSearch(none.name, audioSearchQuery)) {
      none = null;
    }
    var sections = backgroundCategoryOrder
      .map(function (cid) {
        var items = grouped[cid] || [];
        if (!items.length) return "";
        if (backgroundCategoryOpenById[cid] == null) {
          backgroundCategoryOpenById[cid] = false;
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
              return audioBuiltinRowMarkup(b, {
                showPinToMy: isWebPaidTierForAI(),
              });
            })
            .join("") +
          "</div>" +
          "</details>"
        );
      })
      .join("");
    if (audioSearchQuery && !none && !sections.replace(/\s/g, "")) {
      list.innerHTML =
        '<p class="app-muted audio-app-lede">No background audio matches your search.</p>';
      return;
    }
    list.innerHTML =
      renderAdminCloudBackgroundsSection() +
      '<p class="app-muted audio-app-lede">' +
      "Premade background tracks for generation and mixing — same catalog as App Audio on iOS. Preview any track here; pin to My Audio with Starter or Creator." +
      "</p>" +
      (none ? '<div class="app-bg-none-row">' + audioBuiltinRowMarkup(none, { showPinToMy: false }) + "</div>" : "") +
      sections;
    bindAdminCloudBackgroundActions(list);
    bindAudioTrackRowHandlers(list);
  }

  function renderAudioMyList() {
    var list = document.getElementById("audio-my-list");
    if (!list) return;
    var audioSearchQuery = normalizeSectionSearchQuery(sectionSearchQuery.audio);
    var none = availableBackgrounds.find(function (b) {
      return b.id === "bg-none";
    });
    if (none && audioSearchQuery && !textMatchesSectionSearch(none.name, audioSearchQuery)) {
      none = null;
    }
    var users = mergedUserBackgroundMetas().filter(function (m) {
      if (!m || !m.id) return false;
      return !audioSearchQuery || textMatchesSectionSearch(m.name, audioSearchQuery);
    });
    var savedMap = loadSavedAppBackgroundIdSet();
    var pinned = availableBackgrounds.filter(function (b) {
      if (b.id === "bg-none" || !savedMap[b.id]) return false;
      return !audioSearchQuery || textMatchesSectionSearch(b.name, audioSearchQuery);
    });
    var parts = [];
    parts.push("<p class=\"app-muted audio-my-lede\">");
    parts.push(
      "Your imports sync across devices on Starter and Creator. This browser also keeps a local copy for faster mixing."
    );
    parts.push("</p>");
    if (none) {
      parts.push('<div class="app-bg-none-row">' + audioBuiltinRowMarkup(none, { showPinToMy: false }) + "</div>");
    }
    if (users.length) {
      parts.push('<p class="app-muted audio-my-subhdr" style="margin:0.65rem 0 0.35rem;font-weight:600;">Your imports</p>');
      users.forEach(function (m) {
        if (!m || !m.id) return;
        parts.push(audioUserImportRowMarkup(m));
      });
    }
    if (pinned.length) {
      parts.push(
        '<p class="app-muted audio-my-subhdr" style="margin:0.75rem 0 0.35rem;font-weight:600;">Shortcuts from App Audio</p>'
      );
      pinned.forEach(function (b) {
        parts.push(audioSavedShortcutRowMarkup(b));
      });
    }
    if (!users.length && !pinned.length) {
      parts.push(
        audioSearchQuery
          ? '<div class="app-empty-hint" style="margin-top:0.5rem;">No background audio matches your search.</div>'
          : '<div class="app-empty-hint" style="margin-top:0.5rem;">Use <strong>Import audio</strong> above, or open <strong>App Audio</strong> and tap <strong>Add to My Audio</strong> on a track.</div>'
      );
    }
    list.innerHTML = parts.join("");
    bindAudioTrackRowHandlers(list);
  }

  function syncAudioPageSegmentedPill() {
    var wrap = document.getElementById("audio-segmented-tabs");
    if (!wrap) return;
    var activeBtn =
      wrap.querySelector('.app-tab-btn[data-audio-page-tab="' + activeAudioPageTab + '"]') ||
      wrap.querySelector(".app-tab-btn.is-active");
    if (!activeBtn) return;
    wrap.style.setProperty("--voice-pill-x", activeBtn.offsetLeft + "px");
    wrap.style.setProperty("--voice-pill-w", activeBtn.offsetWidth + "px");
    wrap.classList.add("is-ready");
    wrap.classList.remove("is-pulsing");
    void wrap.offsetWidth;
    wrap.classList.add("is-pulsing");
  }

  function renderAudioPageSubtab() {
    var myBtn = document.getElementById("audio-tab-my");
    var appBtn = document.getElementById("audio-tab-app");
    var myPanel = document.getElementById("audio-sub-my");
    var appPanel = document.getElementById("audio-sub-app");
    if (myBtn) myBtn.classList.toggle("is-active", activeAudioPageTab === "my-audio");
    if (appBtn) appBtn.classList.toggle("is-active", activeAudioPageTab === "app-audio");
    if (myBtn) myBtn.classList.toggle("is-tier-locked", !isWebPaidTierForAI());
    if (myPanel) myPanel.hidden = activeAudioPageTab !== "my-audio";
    if (appPanel) appPanel.hidden = activeAudioPageTab !== "app-audio";
    var myTools = document.getElementById("audio-my-only-toolbar");
    if (myTools) myTools.style.display = activeAudioPageTab === "my-audio" ? "" : "none";
    try {
      localStorage.setItem(PREF_AUDIO_PAGE_SUB_KEY, activeAudioPageTab);
    } catch (_e) {}
    syncAudioPageSegmentedPill();
    requestAnimationFrame(function () {
      syncSubnavStickyOffset();
    });
  }

  function renderAudioPage() {
    renderAudioMyList();
    renderAudioAppList();
    renderAudioPageSubtab();
  }

  function renderBackgrounds() {
    renderAudioPage();
  }

  function setAccountMessage(text, kind) {
    postScreenMessage("account-message", text, kind);
  }

  function setPrivacyMessage(text, kind) {
    postScreenMessage("account-privacy-message", text, kind);
  }

  function userHasAppleProvider() {
    if (!currentUser || !currentUser.providerData) return false;
    return currentUser.providerData.some(function (p) {
      return p && p.providerId === "apple.com";
    });
  }

  function syncAccountAppleLinkUI() {
    var statusEl = document.getElementById("account-apple-link-status");
    if (!statusEl) return;
    var linked = userHasAppleProvider();
    statusEl.textContent = linked
      ? "Apple ID is linked to this account (Sign in with Apple works on the iOS app)."
      : "Apple Sign In on the web is unavailable while iOS and web share one Firebase Apple Services ID. Use the iOS app to sign in with Apple.";
  }

  function friendlyAppleLinkError(err) {
    if (!err) return "Could not link Apple ID.";
    if (err.code === "auth/credential-already-in-use") {
      return (
        "This Apple ID is already linked to another Focus Shift account. " +
        "Sign in with Apple only if that is your main account, or remove the duplicate relay user in Firebase Authentication."
      );
    }
    if (err.code === "auth/popup-closed-by-user") return "";
    if (err.code === "auth/provider-already-linked") {
      syncAccountAppleLinkUI();
      return "Apple ID is already linked to this account.";
    }
    return err.message || "Could not link Apple ID.";
  }

  function linkAppleToCurrentAccount() {
    if (!currentUser) {
      return Promise.reject(new Error("You must be signed in."));
    }
    if (userHasAppleProvider()) {
      syncAccountAppleLinkUI();
      return Promise.resolve();
    }
    var provider = new firebase.auth.OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");
    return currentUser
      .linkWithPopup(provider)
      .then(function () {
        return currentUser.reload();
      })
      .then(function () {
        syncAccountAppleLinkUI();
        return syncUserProfileDocFromAuthUser(currentUser);
      })
      .then(function () {
        setPrivacyMessage("Apple ID linked. You can now sign in with Apple on the login page.", "success");
      });
  }

  function syncUserProfileDocFromAuthUser(user) {
    if (!user) return Promise.resolve();
    var payload = {
      email: user.email || "",
      displayName: user.displayName || "",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    return db.collection("users").doc(user.uid).set(payload, { merge: true });
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
        var code = (e && e.code) || "";
        var msg = (e && e.message) || code || "Account deletion failed.";
        if (code === "functions/not-found") {
          msg =
            "Server step not found. Deploy the deleteOwnAccount Cloud Function (see functions/index.js), then try again.";
        } else if (
          code === "auth/requires-recent-login" ||
          String(msg).toLowerCase().indexOf("recent login") >= 0
        ) {
          msg =
            "For security, sign out and sign back in, then try deleting again within a few minutes.";
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

  function getWebDeviceId() {
    try {
      var existing = localStorage.getItem(WEB_DEVICE_ID_KEY);
      if (existing && String(existing).trim()) return String(existing).trim();
      var id = "web-" + (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36));
      localStorage.setItem(WEB_DEVICE_ID_KEY, id);
      return id;
    } catch (_e) {
      return "web-" + Date.now().toString(36);
    }
  }

  function webDeviceDisplayName() {
    var label = "Web browser";
    try {
      if (navigator.userAgentData && navigator.userAgentData.platform) {
        label = "Web (" + navigator.userAgentData.platform + ")";
      } else if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        label = "Web (iOS)";
      } else if (/Android/i.test(navigator.userAgent)) {
        label = "Web (Android)";
      } else if (/Mac/i.test(navigator.userAgent)) {
        label = "Web (Mac)";
      } else if (/Windows/i.test(navigator.userAgent)) {
        label = "Web (Windows)";
      }
    } catch (_e2) {}
    return label;
  }

  function registerWebDeviceRecord(uid) {
    if (!uid) return Promise.resolve();
    var deviceId = getWebDeviceId();
    return db
      .collection("users")
      .doc(uid)
      .collection("devices")
      .doc(deviceId)
      .set(
        {
          name: webDeviceDisplayName(),
          lastActiveAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  }

  function estimateCloudStorageBytes(uid) {
    if (!uid || typeof firebase.storage !== "function") return Promise.resolve(null);
    var rootRef = firebase.storage().ref("users/" + uid + "/audios");
    return rootRef
      .listAll()
      .then(function (list) {
        if (!list.items.length) return 0;
        return Promise.all(
          list.items.map(function (itemRef) {
            return itemRef
              .getMetadata()
              .then(function (meta) {
                return meta && meta.size ? Number(meta.size) : 0;
              })
              .catch(function () {
                return 0;
              });
          })
        ).then(function (sizes) {
          return sizes.reduce(function (sum, n) {
            return sum + (isFinite(n) ? n : 0);
          }, 0);
        });
      })
      .catch(function () {
        return null;
      });
  }

  function webTierDeviceLimit(tier) {
    if (tier === "starter") return 3;
    if (tier === "creator") return 5;
    return 2;
  }

  function webTierUsageLimits(tier) {
    if (tier === "starter") {
      return { scriptsLimit: 50, wordsLimit: 3000, ttsLimit: 15000 };
    }
    if (tier === "creator") {
      return { scriptsLimit: null, wordsLimit: 8000, ttsLimit: 40000 };
    }
    return { scriptsLimit: 0, wordsLimit: 0, ttsLimit: 0 };
  }

  function usageDocInt(usage, key) {
    if (!usage || usage[key] == null) return 0;
    var n = Number(usage[key]);
    return isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }

  function formatInsightsLimit(n) {
    if (n === null || typeof n === "undefined") return "Unlimited";
    var num = Number(n);
    if (!isFinite(num)) return "-";
    if (num >= 999999) return "Unlimited";
    return num.toLocaleString();
  }

  function formatUsageRatio(used, limit) {
    if (limit === null) return formatInsightsInt(used) + " (unlimited)";
    return formatInsightsInt(used) + " / " + formatInsightsLimit(limit);
  }

  function formatSubscriptionTierSourceLabel(profile) {
    if (!profile) return "Not set";
    var src = String(profile.subscriptionTierSource || profile.subscriptionSource || "")
      .trim()
      .toLowerCase();
    if (src === "stripe") return "Web (Stripe)";
    if (src === "store") return "App Store";
    if (src === "manual") return "Complimentary";
    if (src) return src.charAt(0).toUpperCase() + src.slice(1);
    return "Not set";
  }

  function formatBillingIntervalLabel(profile) {
    if (!profile) return "";
    var raw = String(profile.subscriptionBillingInterval || "")
      .trim()
      .toLowerCase();
    if (raw === "monthly" || raw === "month") return "Monthly";
    if (raw === "yearly" || raw === "year" || raw === "annual") return "Yearly";
    return "";
  }

  function isQuotaLimitError(error) {
    var msg = String((error && error.message) || error || "").toLowerCase();
    return (
      msg.indexOf("word limit") >= 0 ||
      msg.indexOf("tts limit") >= 0 ||
      msg.indexOf("monthly script quota") >= 0 ||
      msg.indexOf("step-up") >= 0 ||
      msg.indexOf("usage add-on") >= 0 ||
      msg.indexOf("usage pack") >= 0 ||
      msg.indexOf("quota reached") >= 0
    );
  }

  function handleQuotaLimitError(message) {
    if (!isQuotaLimitError(message)) return false;
    showAppBanner(
      "Usage limit reached",
      "Add a usage pack in Account Settings to keep creating scripts and voice audio this billing period. Tap here to open Account.",
      "info",
      {
        autoDismiss: false,
        onTap: function () {
          openAccountModal({ focusUsageAddOn: true });
        },
      }
    );
    return true;
  }

  function scrollToUsageAddOnSection() {
    var section = document.getElementById("account-ai-usage-group");
    if (!section || section.hidden) return;
    setAccountModalTab("settings");
    setTimeout(function () {
      section.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 120);
  }

  function renderUsageAddOnSection() {
    var host = document.getElementById("account-ai-usage-addon-host");
    if (!host) return;

    var tier = resolvedSubscriptionTier();
    if (tier !== "starter" && tier !== "creator") {
      host.innerHTML = "";
      return;
    }

    var wordsLabel = STEP_UP_WORDS_BONUS.toLocaleString();
    var ttsLabel = STEP_UP_TTS_BONUS.toLocaleString();
    var freeStepUpKnown = accountInsightsSnapshot.freeStepUpEnabled !== null;
    var freeStepUp = accountInsightsSnapshot.freeStepUpEnabled === true;
    var billingChannel = resolveSubscriptionBillingChannel();

    var ledeText =
      "Adds +" + wordsLabel + " AI words and +" + ttsLabel + " voice (TTS) characters for this billing period. You can purchase more than once.";
    var actionText = "Buy usage add-on";
    var actionHidden = true;
    var actionMode = "";
    var noteText = "Loading usage add-on options…";

    if (!freeStepUpKnown && accountInsightsSnapshot.loading) {
      /* defaults above */
    } else if (freeStepUp) {
      actionText = "Add " + wordsLabel + " words & " + ttsLabel + " TTS";
      actionHidden = false;
      actionMode = "complimentary";
      noteText = "Complimentary while beta top-ups are enabled (same as iOS).";
    } else if (billingChannel === "stripe" && accountInsightsSnapshot.stepUpStripeConfigured) {
      var priceLabel = accountInsightsSnapshot.stepUpStripePriceDisplay;
      actionText = priceLabel ? "Buy usage pack (" + priceLabel + ")" : "Buy usage pack";
      actionHidden = false;
      actionMode = "stripe";
      noteText =
        "One-time purchase via Stripe Checkout (your subscription is billed on the web). Limits update after payment.";
    } else if (billingChannel === "store") {
      actionText = "Buy usage add-on (App Store)";
      actionHidden = false;
      actionMode = "appstore";
      noteText =
        "Your plan is billed through the App Store. Purchase the usage pack in the Focus Shift iOS app (Sandbox works for TestFlight testing).";
    } else if (billingChannel === "stripe" && !accountInsightsSnapshot.stepUpStripeConfigured) {
      noteText =
        "Stripe usage add-on checkout is not configured yet (set STRIPE_PRICE_STEPUP on the API function).";
    } else {
      actionText = "Buy usage add-on";
      actionHidden = false;
      actionMode = "appstore";
      noteText =
        "If you subscribed on iPhone or iPad, buy the pack in the iOS app. If you subscribed on the web with Stripe, contact support if checkout is missing.";
    }

    host.innerHTML =
      '<div class="account-ios-addon">' +
      accountIosGroupHeader("Usage add-on", null, null) +
      '<p class="account-ios-addon__lede">' +
      escapeHtml(ledeText) +
      "</p>" +
      '<button type="button" class="app-btn app-btn-primary account-ios-addon__action" id="account-usage-addon-action"' +
      (actionHidden ? " hidden" : "") +
      (actionMode ? ' data-stepup-mode="' + escapeHtml(actionMode) + '"' : "") +
      ">" +
      escapeHtml(actionText) +
      "</button>" +
      '<p class="account-ios-addon__note app-muted">' +
      escapeHtml(noteText) +
      "</p>" +
      "</div>";
  }

  function applyComplimentaryStepUp() {
    if (!currentUser) return Promise.reject(new Error("Sign in required."));
    var tier = resolvedSubscriptionTier();
    if (tier !== "starter" && tier !== "creator") {
      return Promise.reject(new Error("Usage add-ons require Starter or Creator."));
    }
    if (accountInsightsSnapshot.freeStepUpEnabled === false) {
      return Promise.reject(new Error("Complimentary top-ups are disabled. Use the iOS app to buy a usage add-on."));
    }
    var btn = document.getElementById("account-usage-addon-action");
    if (btn) btn.disabled = true;
    return currentUser
      .getIdToken(true)
      .then(function (token) {
        return fetch(backendBaseURL() + "/usage/stepup", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: "{}",
        }).then(function (resp) {
          return resp.json().then(function (json) {
            if (!resp.ok) {
              throw new Error((json && json.error) || "Could not apply usage add-on.");
            }
            return json;
          });
        });
      })
      .then(function () {
        setAccountMessage("Usage add-on applied for this billing period.", "success");
        showAppBanner("Usage add-on applied", "Your word and TTS limits were increased for this period.", "success");
        return refreshAccountInsightsFromCloud();
      })
      .finally(function () {
        if (btn) btn.disabled = false;
        renderUsageAddOnSection();
      });
  }

  function formatInsightsInt(n) {
    var num = Number(n);
    if (!isFinite(num)) return "-";
    return Math.floor(num).toLocaleString();
  }

  function firestoreDateLabel(val) {
    if (!val) return "";
    try {
      if (val.toDate) return formatDate(val);
      if (val instanceof Date) return formatDate(val);
    } catch (_e) {}
    return "";
  }

  function refreshAccountInsightsFromCloud() {
    if (!currentUser) return Promise.resolve();
    var uid = currentUser.uid;
    accountInsightsSnapshot.loading = true;
    accountInsightsSnapshot.error = null;
    renderAccountInsights();

    return currentUser
      .getIdToken(true)
      .then(function (token) {
        return fetch(backendBaseURL() + "/usage/refresh", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: "{}",
        })
          .then(function (resp) {
            if (!resp || !resp.ok) return null;
            return resp.json().catch(function () {
              return null;
            });
          })
          .then(function (json) {
            if (json && typeof json.freeStepUpEnabled === "boolean") {
              accountInsightsSnapshot.freeStepUpEnabled = json.freeStepUpEnabled;
            }
            if (json && typeof json.stepUpStripeConfigured === "boolean") {
              accountInsightsSnapshot.stepUpStripeConfigured = json.stepUpStripeConfigured;
            }
            if (json && json.stepUpStripePriceDisplay) {
              accountInsightsSnapshot.stepUpStripePriceDisplay = String(json.stepUpStripePriceDisplay);
            } else if (json && json.stepUpStripeConfigured === false) {
              accountInsightsSnapshot.stepUpStripePriceDisplay = null;
            }
          })
          .catch(function () {
            return null;
          });
      })
      .then(function () {
        return registerWebDeviceRecord(uid);
      })
      .then(function () {
        return Promise.all([
          db.collection("users").doc(uid).collection("meta").doc("usage").get(),
          db.collection("users").doc(uid).collection("devices").get(),
          db.collection("users").doc(uid).collection("shareAudience").get(),
          estimateCloudStorageBytes(uid),
        ]);
      })
      .then(function (results) {
        var usageSnap = results[0];
        var devicesSnap = results[1];
        var audienceSnap = results[2];
        accountInsightsSnapshot.usage = usageSnap.exists ? usageSnap.data() || {} : {};
        accountInsightsSnapshot.devices = devicesSnap.docs.map(function (doc) {
          var data = doc.data() || {};
          return {
            id: doc.id,
            name: (data.name && String(data.name)) || "Device",
            lastActiveAt: data.lastActiveAt || null,
            isCurrent: doc.id === getWebDeviceId(),
          };
        });
        accountInsightsSnapshot.shareAudienceCount = audienceSnap.size;
        accountInsightsSnapshot.storageBytes = results[3];
        accountInsightsSnapshot.loading = false;
        accountInsightsSnapshot.error = null;
        renderAccountInsights();
        renderUsageAddOnSection();
      })
      .catch(function (e) {
        accountInsightsSnapshot.loading = false;
        accountInsightsSnapshot.error = (e && e.message) || "Could not load account usage.";
        renderAccountInsights();
      });
  }

  function renderAccountSubscriptionBillingRows() {
    var el = document.getElementById("account-subscription-billing-rows");
    if (!el) return;
    var tier = resolvedSubscriptionTier();
    if (tier === "free") {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    el.hidden = false;
    var interval = formatBillingIntervalLabel(currentUserProfile) || "—";
    var billedVia = formatSubscriptionTierSourceLabel(currentUserProfile);
    el.innerHTML =
      accountIosKvRow("Billing period", interval) + accountIosKvRow("Billed via", billedVia);
  }

  function renderAccountAiUsagePanel() {
    var group = document.getElementById("account-ai-usage-group");
    var el = document.getElementById("account-ai-usage-panel");
    if (!group || !el) return;

    var tier = resolvedSubscriptionTier();
    if (tier !== "starter" && tier !== "creator") {
      group.hidden = true;
      el.innerHTML = "";
      return;
    }
    group.hidden = false;

    if (accountInsightsSnapshot.loading) {
      el.innerHTML = '<p class="account-ios-loading">Loading usage…</p>';
      return;
    }

    if (accountInsightsSnapshot.error) {
      el.innerHTML =
        '<p class="app-inline-msg error" style="margin:0 0 0.5rem;">' +
        escapeHtml(accountInsightsSnapshot.error) +
        '</p><button type="button" class="app-btn app-btn-secondary" id="account-insights-retry">Try again</button>';
      var retryBtn = document.getElementById("account-insights-retry");
      if (retryBtn) {
        retryBtn.addEventListener("click", function () {
          refreshAccountInsightsFromCloud().then(function () {
            setAccountMessage("Usage statistics updated.", "success");
          });
        });
      }
      return;
    }

    var limits = webTierUsageLimits(tier);
    var usage = accountInsightsSnapshot.usage || {};
    var scriptsUsed = usageDocInt(usage, "scriptsThisMonth");
    var wordsUsed = usageDocInt(usage, "wordsThisMonth");
    var ttsUsed = usageDocInt(usage, "ttsCharactersThisMonth");
    var stepUpWords = usageDocInt(usage, "stepUpWordsThisMonth");
    var stepUpTts = usageDocInt(usage, "stepUpTtsCharactersThisMonth");
    var effectiveWordsLimit =
      limits.wordsLimit > 0 ? limits.wordsLimit + stepUpWords : limits.wordsLimit;
    var effectiveTtsLimit = limits.ttsLimit > 0 ? limits.ttsLimit + stepUpTts : limits.ttsLimit;

    var usageResetLabel = "";
    if (usage.usagePeriodEnd) {
      usageResetLabel = firestoreDateLabel(usage.usagePeriodEnd);
    } else if (usage.monthStart) {
      usageResetLabel = firestoreDateLabel(usage.monthStart);
    }

    var meters =
      accountUsageMeterHtml("Scripts", scriptsUsed, limits.scriptsLimit) +
      accountUsageMeterHtml("Words", wordsUsed, effectiveWordsLimit || limits.wordsLimit) +
      accountUsageMeterHtml(
        "Voice audio (TTS)",
        ttsUsed,
        effectiveTtsLimit || limits.ttsLimit,
        "characters remaining"
      );

    var resetRow = usageResetLabel
      ? '<p class="account-ios-reset-line"><span aria-hidden="true">↻</span> Resets: ' +
        escapeHtml(usageResetLabel) +
        "</p>"
      : "";

    el.innerHTML =
      '<div class="account-ios-usage-meters">' +
      meters +
      "</div>" +
      resetRow +
      '<div class="account-ios-action-row account-ios-action-row--refresh">' +
      '<button type="button" class="app-btn app-btn-secondary account-ios-action-row__btn" id="account-refresh-ai-usage">Refresh AI Usage</button>' +
      accountInfoButtonHtml("account-ai-usage-info", "AI script usage help") +
      "</div>";

    var refreshAiBtn = document.getElementById("account-refresh-ai-usage");
    if (refreshAiBtn && !refreshAiBtn._bound) {
      refreshAiBtn._bound = true;
      refreshAiBtn.addEventListener("click", function () {
        refreshAccountInsightsFromCloud().then(function () {
          setAccountMessage("AI usage refreshed.", "success");
        });
      });
    }
  }

  function renderAccountLibraryPanel() {
    var el = document.getElementById("account-library-panel");
    if (!el) return;

    if (accountInsightsSnapshot.loading) {
      el.innerHTML = '<p class="account-ios-loading">Loading statistics…</p>';
      return;
    }

    var storageDisplay = "—";
    if (accountInsightsSnapshot.storageBytes !== null) {
      storageDisplay = formatBytesHuman(accountInsightsSnapshot.storageBytes);
    } else if (accountInsightsSnapshot.storageBytes === 0) {
      storageDisplay = "0 B";
    }

    el.innerHTML =
      accountIosStatRow("Scripts", formatCount(currentScripts.length)) +
      accountIosStatRow("Scripts with audio", formatCount(scriptsWithAudioCount())) +
      accountIosStatRow("Imported audio", formatCount(importedAudioCount())) +
      accountIosStatRow("Storage used", storageDisplay);
  }

  function renderAccountDevicesSummary() {
    var label = document.getElementById("account-device-count-label");
    var sharingBtn = document.getElementById("account-scroll-sharing");
    if (!label) return;

    var tier = resolvedSubscriptionTier();
    var deviceLimit = webTierDeviceLimit(tier);
    var deviceCount = (accountInsightsSnapshot.devices || []).length;
    if (accountInsightsSnapshot.loading) {
      label.textContent = "—";
    } else {
      label.textContent = String(deviceCount) + " of " + String(deviceLimit);
    }

    var sharingVal = document.getElementById("account-shared-listeners-value");
    if (sharingBtn) sharingBtn.hidden = tier !== "creator";
    if (sharingVal) {
      if (tier !== "creator") sharingVal.textContent = "—";
      else if (accountInsightsSnapshot.loading || accountInsightsSnapshot.shareAudienceCount == null) {
        sharingVal.textContent = "—";
      } else {
        sharingVal.textContent = formatUsageRatio(accountInsightsSnapshot.shareAudienceCount || 0, 15);
      }
    }
  }

  function renderAccountInsights() {
    renderAccountSubscriptionBillingRows();
    renderAccountAiUsagePanel();
    renderAccountLibraryPanel();
    renderAccountDevicesSummary();
    syncAccountSubscriptionHeadline();
    renderUsageAddOnSection();
  }

  function subscriptionTierDisplayName() {
    var t = resolvedSubscriptionTier();
    if (t === "starter") return "Starter";
    if (t === "creator") return "Creator";
    return "Free";
  }

  function subscriptionTierDescriptionWeb() {
    var t = resolvedSubscriptionTier();
    if (t === "starter") return "Perfect for getting started.";
    if (t === "creator") return "For creators who need more.";
    return "Limited features on the Free tier. Upgrade for more scripts, voices, and cloud sync.";
  }

  function subscriptionPlanHeadlineWeb() {
    var name = subscriptionTierDisplayName();
    var tier = resolvedSubscriptionTier();
    if (tier === "free") return "Your plan: " + name;
    var interval = formatBillingIntervalLabel(currentUserProfile);
    if (interval) return "Your plan: " + name + " (" + interval + ")";
    return "Your plan: " + name;
  }

  function resolveSubscriptionBillingChannel() {
    if (!currentUserProfile) return "unknown";
    var tier = resolvedSubscriptionTier();
    if (tier === "free") return "unknown";
    var src = String(
      currentUserProfile.subscriptionTierSource || currentUserProfile.subscriptionSource || ""
    )
      .trim()
      .toLowerCase();
    if (src === "store") return "store";
    if (src === "stripe") return "stripe";
    if (currentUserProfile.stripeCustomerId) return "stripe";
    return "store";
  }

  function profileUsesStripeBilling() {
    return resolveSubscriptionBillingChannel() === "stripe";
  }

  function profileUsesAppStoreBilling() {
    return resolveSubscriptionBillingChannel() === "store";
  }

  function openAppStoreStepUpInstructions() {
    setAccountMessage(
      "Usage add-ons on App Store plans are purchased in the Focus Shift iOS app. Open the app on iPhone or iPad → Account → Usage add-on. In TestFlight/Sandbox, sign in with your Sandbox Apple ID when prompted.",
      "info"
    );
    showAppBanner(
      "Purchase in the iOS app",
      "Web checkout is for Stripe-billed plans only. App Store subscribers buy usage packs inside the iPhone/iPad app (Sandbox works for testing).",
      "info",
      { duration: 9000 }
    );
  }

  function syncAccountBillingButtons() {
    var stripe = profileUsesStripeBilling();
    var tier = resolvedSubscriptionTier();
    var manageBillingRow = document.getElementById("account-manage-billing-row");
    var manageSubsRow = document.getElementById("account-manage-subscriptions-row");
    var manageRow = document.getElementById("account-ios-manage-row");
    var syncCloudBtn = document.getElementById("account-sync-cloud");
    var hideBilling = !stripe;
    var hideSubs = tier === "free" || stripe;
    if (manageBillingRow) manageBillingRow.hidden = hideBilling;
    if (manageSubsRow) manageSubsRow.hidden = hideSubs;
    if (manageRow) manageRow.hidden = hideBilling && hideSubs;
    if (syncCloudBtn) syncCloudBtn.hidden = tier !== "starter" && tier !== "creator";
  }

  function viewPlansButtonLabelCollapsed() {
    if (profileUsesAppStoreBilling() && resolvedSubscriptionTier() !== "free") {
      return "View plans";
    }
    return "View plans & upgrade";
  }

  function syncAccountPlansPanelForBilling() {
    var stripeWrap = document.getElementById("account-plans-stripe-wrap");
    var appStoreWrap = document.getElementById("account-plans-appstore-wrap");
    var storePaid = profileUsesAppStoreBilling() && resolvedSubscriptionTier() !== "free";
    if (stripeWrap) stripeWrap.hidden = storePaid;
    if (appStoreWrap) appStoreWrap.hidden = !storePaid;
    var btn = document.getElementById("account-btn-view-plans");
    if (btn && btn.getAttribute("aria-expanded") !== "true") {
      btn.textContent = viewPlansButtonLabelCollapsed();
    }
  }

  function syncAccountSubscriptionHeadline() {
    var headlineEl = document.getElementById("account-subscription-headline");
    var descEl = document.getElementById("account-subscription-description");
    if (!headlineEl || !descEl) return;
    headlineEl.textContent = subscriptionPlanHeadlineWeb();
    descEl.textContent = subscriptionTierDescriptionWeb();
    var tier = resolvedSubscriptionTier();
    headlineEl.classList.remove("tier-free", "tier-starter", "tier-creator");
    headlineEl.classList.add("tier-" + tier);
    syncAccountBillingButtons();
    syncAccountPlansPanelForBilling();
    syncPaidFeatureControls();
  }

  function resetAccountPlansPanel() {
    var panel = document.getElementById("account-plans-panel");
    var btn = document.getElementById("account-btn-view-plans");
    if (panel) panel.hidden = true;
    if (btn) {
      btn.setAttribute("aria-expanded", "false");
      btn.textContent = viewPlansButtonLabelCollapsed();
    }
    syncAccountPlansPanelForBilling();
  }

  function openAccountDevicesModal() {
    var bd = document.getElementById("account-devices-backdrop");
    if (!bd || !currentUser) return;
    var lede = document.getElementById("account-devices-lede");
    var limit = webTierDeviceLimit(resolvedSubscriptionTier());
    if (lede) {
      lede.textContent =
        "You can use up to " +
        String(limit) +
        " device" +
        (limit === 1 ? "" : "s") +
        " on your plan. Remove a device to sign in on another.";
    }
    renderAccountDevicesModalContent(true);
    bd.hidden = false;
    refreshAccountInsightsFromCloud().then(function () {
      renderAccountDevicesModalContent(false);
      renderAccountDevicesSummary();
    });
  }

  function closeAccountDevicesModal() {
    var bd = document.getElementById("account-devices-backdrop");
    if (bd) bd.hidden = true;
  }

  function renderAccountDevicesModalContent(loading) {
    var body = document.getElementById("account-devices-modal-body");
    if (!body) return;
    if (loading || accountInsightsSnapshot.loading) {
      body.innerHTML = '<p class="app-muted" style="margin:0;">Loading devices…</p>';
      return;
    }
    if (accountInsightsSnapshot.error) {
      body.innerHTML =
        '<p class="app-inline-msg error" style="margin:0;">' + escapeHtml(accountInsightsSnapshot.error) + "</p>";
      return;
    }
    var devices = accountInsightsSnapshot.devices || [];
    var currentId = getWebDeviceId();
    if (!devices.length) {
      body.innerHTML = '<p class="app-muted" style="margin:0;">No registered devices yet.</p>';
      return;
    }
    body.innerHTML =
      '<ul class="account-sheet-list">' +
      devices
        .map(function (d) {
          var isCurrent = d.id === currentId || d.isCurrent;
          var lastLine = isCurrent
            ? '<span class="account-sheet-item__meta account-sheet-item__meta--current">This browser</span>'
            : '<span class="account-sheet-item__meta">Last active on this device</span>';
          var removeBtn = isCurrent
            ? ""
            : '<button type="button" class="app-btn app-btn-secondary account-device-remove" data-device-id="' +
              escapeHtml(d.id) +
              '">Remove</button>';
          return (
            '<li class="account-sheet-list-item">' +
            '<div class="account-sheet-item__main">' +
            '<div class="account-sheet-item__title">' +
            escapeHtml(d.name || "Device") +
            "</div>" +
            lastLine +
            "</div>" +
            removeBtn +
            "</li>"
          );
        })
        .join("") +
      "</ul>";
    body.querySelectorAll(".account-device-remove").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var deviceId = btn.getAttribute("data-device-id");
        if (!deviceId || !currentUser) return;
        if (!window.confirm("Remove this device? It will need to sign in again.")) return;
        btn.disabled = true;
        db.collection("users")
          .doc(currentUser.uid)
          .collection("devices")
          .doc(deviceId)
          .delete()
          .then(function () {
            setAccountMessage("Device removed.", "success");
            return refreshAccountInsightsFromCloud();
          })
          .then(function () {
            renderAccountDevicesModalContent(false);
            renderAccountDevicesSummary();
          })
          .catch(function (e) {
            setAccountMessage((e && e.message) || "Could not remove device.", "error");
          })
          .finally(function () {
            btn.disabled = false;
          });
      });
    });
  }

  function openAccountSharingModal() {
    if (!isWebCreatorTier()) {
      setAccountMessage("Shared listeners require the Creator plan.", "info");
      return;
    }
    var bd = document.getElementById("account-sharing-backdrop");
    if (!bd) return;
    bd.hidden = false;
    refreshShareManagementPanel();
  }

  function closeAccountSharingModal() {
    var bd = document.getElementById("account-sharing-backdrop");
    if (bd) bd.hidden = true;
  }

  function syncAccountSharedListenersRow() {
    var sharingBtn = document.getElementById("account-scroll-sharing");
    if (sharingBtn) sharingBtn.hidden = !isWebCreatorTier();
  }

  function setHomeFlowStep(step, displayName) {
    homeFlowStep = step;
    renderHomeFlow(displayName || "");
  }

  function restoreSurveyFormFromClarifySnapshot(snap) {
    if (!snap) return;
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

  function abandonClarifyAndReturnToSurvey(displayName) {
    var snap = homeClarifyFlow;
    homeClarifyFlow = null;
    generationMessage("", "");
    setHomeFlowStep("survey", displayName);
    restoreSurveyFormFromClarifySnapshot(snap);
  }

  function syncHomeSectionHeader(displayName) {
    var header = document.getElementById("home-section-header");
    var titleEl = document.getElementById("home-section-title");
    if (!header || !titleEl) return;

    var oldBack = document.getElementById("home-flow-back");
    if (oldBack) oldBack.remove();

    if (homeFlowStep === "landing") {
      titleEl.hidden = false;
      titleEl.textContent = "Home";
      return;
    }

    var back = document.createElement("button");
    back.type = "button";
    back.id = "home-flow-back";
    back.className = "playlist-back-arrow-btn home-flow-back-btn";
    back.textContent = "←";

    if (homeFlowStep === "category") {
      back.setAttribute("aria-label", "Back to home");
      titleEl.hidden = false;
      titleEl.textContent = "Choose a category";
      back.addEventListener("click", function () {
        setHomeFlowStep("landing", displayName);
      });
    } else if (homeFlowStep === "survey") {
      back.setAttribute("aria-label", "Back to categories");
      titleEl.hidden = true;
      back.addEventListener("click", function () {
        setHomeFlowStep("category", displayName);
      });
    } else if (homeFlowStep === "clarify") {
      back.setAttribute("aria-label", "Back to questions");
      titleEl.hidden = false;
      titleEl.textContent = "Clarifying";
      back.addEventListener("click", function () {
        abandonClarifyAndReturnToSurvey(displayName);
      });
    } else {
      titleEl.hidden = false;
      titleEl.textContent = "Home";
      return;
    }

    header.insertBefore(back, titleEl);
  }

  function resolvedSubscriptionTier() {
    if (!currentUserProfile) return "free";
    var raw = (currentUserProfile.subscriptionTier || "").toString().trim().toLowerCase();
    if (raw === "basic") return "starter";
    if (raw === "premium") return "creator";
    if (raw === "starter" || raw === "creator" || raw === "free") return raw;
    return "free";
  }

  function isWebCreatorTier() {
    return resolvedSubscriptionTier() === "creator";
  }

  function parseShareTokenFromLocation() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      var fromQuery = (params.get("share") || "").trim();
      if (fromQuery) return fromQuery;
    } catch (_e) {}
    return null;
  }

  function clearShareTokenFromLocation() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      if (!params.has("share")) return;
      params.delete("share");
      var qs = params.toString();
      var path = window.location.pathname + (qs ? "?" + qs : "") + (window.location.hash || "");
      window.history.replaceState({}, "", path);
    } catch (_e2) {}
  }

  function shareClaimErrorMessage(code) {
    if (code === "self") return "You cannot claim your own share link.";
    if (code === "inactive") return "This share is no longer active.";
    if (code === "missing") return "This link is invalid or expired.";
    return "Could not load this share link.";
  }

  function closeShareClaimModal() {
    var bd = document.getElementById("share-claim-backdrop");
    if (bd) bd.hidden = true;
    unlockAppBodyScroll();
    pendingShareClaimToken = null;
  }

  function openShareClaimModal(token, inviteData) {
    var bd = document.getElementById("share-claim-backdrop");
    if (!bd || !token) return;
    pendingShareClaimToken = token;
    var titleEl = document.getElementById("share-claim-title");
    var ledeEl = document.getElementById("share-claim-lede");
    var metaEl = document.getElementById("share-claim-meta");
    var errEl = document.getElementById("share-claim-error");
    var acceptBtn = document.getElementById("share-claim-accept");
    var data = inviteData || {};
    var sender = (data.creatorDisplayName && String(data.creatorDisplayName).trim()) || "Someone";
    var audioTitle = (data.title && String(data.title).trim()) || "Shared audio";
    if (titleEl) titleEl.textContent = audioTitle;
    if (ledeEl) {
      ledeEl.textContent = sender + " shared Focus Shift audio with you.";
    }
    if (metaEl) {
      metaEl.innerHTML =
        '<p class="share-claim-meta-line"><strong>From:</strong> ' +
        escapeHtml(sender) +
        "</p>" +
        (data.audioURL && String(data.audioURL).trim()
          ? '<p class="share-claim-meta-line app-muted">Listen-only copy — added to My Library on this account.</p>'
          : '<p class="share-claim-meta-line app-inline-msg error">No audio URL on this share yet.</p>');
    }
    if (errEl) {
      errEl.hidden = true;
      errEl.textContent = "";
    }
    if (acceptBtn) {
      acceptBtn.disabled = !(data.active !== false && data.audioURL && String(data.audioURL).trim());
    }
    bd.hidden = false;
    lockAppBodyScroll();
  }

  function loadShareInviteForClaim(token) {
    if (!token || !currentUser) return Promise.resolve(null);
    return db
      .collection("shareInvites")
      .doc(token)
      .get()
      .then(function (snap) {
        if (!snap.exists) return { error: "missing" };
        var data = snap.data() || {};
        if (data.active === false) return { error: "inactive", data: data };
        if (data.creatorUid && data.creatorUid === currentUser.uid) return { error: "self", data: data };
        return { data: data };
      });
  }

  function claimShareToken(token) {
    if (!currentUser || !token) return Promise.reject(new Error("Sign in required."));
    var recipientUid = currentUser.uid;
    var inviteRef = db.collection("shareInvites").doc(token);
    return inviteRef.get().then(function (inviteSnap) {
      if (!inviteSnap.exists) throw new Error(shareClaimErrorMessage("missing"));
      var data = inviteSnap.data() || {};
      if (data.active === false) throw new Error(shareClaimErrorMessage("inactive"));
      var creatorUid = data.creatorUid;
      if (!creatorUid) throw new Error(shareClaimErrorMessage("missing"));
      if (creatorUid === recipientUid) throw new Error(shareClaimErrorMessage("self"));

      var audienceRef = db.collection("users").doc(creatorUid).collection("shareAudience").doc(recipientUid);
      var incomingRef = db
        .collection("users")
        .doc(recipientUid)
        .collection("incomingSharedScripts")
        .doc(token);
      var batch = db.batch();
      batch.set(
        audienceRef,
        {
          claimToken: token,
          claimedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      batch.set(
        incomingRef,
        {
          creatorUid: creatorUid,
          creatorDisplayName: data.creatorDisplayName || "Someone",
          sourceScriptId: data.scriptId || "",
          title: data.title || "Shared audio",
          text: data.text || "",
          audioURL: data.audioURL || "",
          voiceID: data.voiceID || "",
          backgroundID: data.backgroundID || "",
          claimedAt: firebase.firestore.FieldValue.serverTimestamp(),
          shareToken: token,
        },
        { merge: true }
      );
      return batch.commit();
    });
  }

  function maybePresentPendingShareClaim() {
    var token = parseShareTokenFromLocation();
    if (!token || !currentUser) return;
    loadShareInviteForClaim(token)
      .then(function (result) {
        if (!result || result.error) {
          setMessage(shareClaimErrorMessage((result && result.error) || "missing"), "error");
          clearShareTokenFromLocation();
          return;
        }
        openShareClaimModal(token, result.data);
        clearShareTokenFromLocation();
      })
      .catch(function (e) {
        setMessage((e && e.message) || "Could not load share link.", "error");
        clearShareTokenFromLocation();
      });
  }

  function bindShareClaimModal() {
    var dismiss = document.getElementById("share-claim-dismiss");
    var accept = document.getElementById("share-claim-accept");
    var backdrop = document.getElementById("share-claim-backdrop");
    if (dismiss) {
      dismiss.addEventListener("click", function () {
        closeShareClaimModal();
      });
    }
    if (accept) {
      accept.addEventListener("click", function () {
        if (!pendingShareClaimToken) return;
        accept.disabled = true;
        claimShareToken(pendingShareClaimToken)
          .then(function () {
            closeShareClaimModal();
            setMessage("Shared audio added to My Library.", "success");
            showAppBanner("Shared audio added", "Find it in Library with a Shared badge.", "success");
          })
          .catch(function (e) {
            var errEl = document.getElementById("share-claim-error");
            if (errEl) {
              errEl.hidden = false;
              errEl.textContent = (e && e.message) || "Could not claim share.";
            }
          })
          .finally(function () {
            if (accept) accept.disabled = false;
          });
      });
    }
    if (backdrop) {
      backdrop.addEventListener("click", function (ev) {
        if (ev.target && ev.target.id === "share-claim-backdrop") closeShareClaimModal();
      });
    }
  }

  function renderShareManagementPanel() {
    var panel = document.getElementById("account-sharing-modal-body");
    if (!panel) return;
    syncAccountSharedListenersRow();
    if (shareManagementSnapshot.loading) {
      panel.innerHTML = '<p class="app-muted" style="margin:0;">Loading sharing lists…</p>';
      return;
    }
    if (shareManagementSnapshot.error) {
      panel.innerHTML =
        '<p class="app-inline-msg error" style="margin:0;">' +
        escapeHtml(shareManagementSnapshot.error) +
        "</p>";
      return;
    }
    var audience = shareManagementSnapshot.audience || [];
    var outgoing = shareManagementSnapshot.outgoing || [];
    var audienceHtml =
      audience.length === 0
        ? '<p class="app-muted" style="margin:0 0 0.75rem;">No listeners yet.</p>'
        : '<ul class="account-share-list">' +
          audience
            .map(function (m) {
              var label =
                (m.displayName && String(m.displayName).trim()) ||
                (m.email && String(m.email).trim()) ||
                m.recipientUid;
              return (
                '<li class="account-share-list-item">' +
                '<span class="account-share-list-label">' +
                escapeHtml(label) +
                "</span>" +
                '<button type="button" class="app-btn app-btn-secondary account-share-remove-listener" data-share-listener="' +
                escapeHtml(m.recipientUid) +
                '">Remove</button>' +
                "</li>"
              );
            })
            .join("") +
          "</ul>";
    var shareLinksOpenAttr = readAccountShareLinksSectionOpen() ? " open" : "";
    var outgoingBodyHtml =
      outgoing.length === 0
        ? '<p class="app-muted" style="margin:0;">No active share links.</p>'
        : '<ul class="account-share-list">' +
          outgoing
            .map(function (o) {
              var link = SHARE_UNIVERSAL_LINK_ORIGIN + o.token;
              return (
                '<li class="account-share-list-item account-share-list-item--stack">' +
                '<div><strong>' +
                escapeHtml(o.title || "Shared audio") +
                "</strong>" +
                '<div class="app-muted" style="font-size:0.78rem;word-break:break-all;">' +
                escapeHtml(link) +
                "</div></div>" +
                '<button type="button" class="app-btn app-btn-secondary account-share-deactivate" data-share-token="' +
                escapeHtml(o.token) +
                '">Deactivate</button>' +
                "</li>"
              );
            })
            .join("") +
          "</ul>";
    panel.innerHTML =
      "<h5>Listeners (" +
      String(audience.length) +
      " / 15)</h5>" +
      audienceHtml +
      '<details class="account-share-links-details" id="account-share-links-details"' +
      shareLinksOpenAttr +
      ' style="margin-top:1rem;">' +
      '  <summary class="account-share-links-summary" aria-label="Active share links, tap to expand or collapse">' +
      '    <span class="account-share-links-chevron" aria-hidden="true">▸</span>' +
      '    <span class="account-share-links-summary-title">Active share links (' +
      String(outgoing.length) +
      ")</span>" +
      "  </summary>" +
      '  <div class="account-share-links-body">' +
      outgoingBodyHtml +
      "  </div>" +
      "</details>";
    var shareLinksDetails = document.getElementById("account-share-links-details");
    if (shareLinksDetails) {
      shareLinksDetails.addEventListener("toggle", function () {
        writeAccountShareLinksSectionOpen(!!shareLinksDetails.open);
      });
    }
    panel.querySelectorAll(".account-share-remove-listener").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var uid = btn.getAttribute("data-share-listener");
        if (!uid || !currentUser) return;
        if (!window.confirm("Remove this listener? They will lose access to your shared audio.")) return;
        btn.disabled = true;
        db.collection("users")
          .doc(currentUser.uid)
          .collection("shareAudience")
          .doc(uid)
          .delete()
          .then(function () {
            setAccountMessage("Listener removed.", "success");
            return refreshShareManagementPanel().then(function () {
              renderAccountDevicesSummary();
            });
          })
          .catch(function (e) {
            setAccountMessage((e && e.message) || "Could not remove listener.", "error");
          })
          .finally(function () {
            btn.disabled = false;
          });
      });
    });
    panel.querySelectorAll(".account-share-deactivate").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var token = btn.getAttribute("data-share-token");
        if (!token || !currentUser) return;
        if (!window.confirm("Deactivate this share link? New listeners cannot claim it.")) return;
        btn.disabled = true;
        var batch = db.batch();
        batch.set(db.collection("shareInvites").doc(token), { active: false }, { merge: true });
        batch.delete(db.collection("users").doc(currentUser.uid).collection("outgoingShares").doc(token));
        batch
          .commit()
          .then(function () {
            setAccountMessage("Share link deactivated.", "success");
            return refreshShareManagementPanel();
          })
          .catch(function (e) {
            setAccountMessage((e && e.message) || "Could not deactivate share.", "error");
          })
          .finally(function () {
            btn.disabled = false;
          });
      });
    });
  }

  function refreshShareManagementPanel() {
    if (!currentUser || !isWebCreatorTier()) {
      shareManagementSnapshot = { audience: [], outgoing: [], loading: false, error: null };
      renderShareManagementPanel();
      return Promise.resolve();
    }
    var uid = currentUser.uid;
    shareManagementSnapshot.loading = true;
    shareManagementSnapshot.error = null;
    renderShareManagementPanel();
    return Promise.all([
      db.collection("users").doc(uid).collection("shareAudience").get(),
      db.collection("users").doc(uid).collection("outgoingShares").get(),
    ])
      .then(function (results) {
        var audienceSnap = results[0];
        var outgoingSnap = results[1];
        return Promise.all(
          audienceSnap.docs.map(function (doc) {
            var memberUid = doc.documentID;
            var claimedAt = (doc.data() || {}).claimedAt || null;
            return db
              .collection("users")
              .doc(memberUid)
              .get()
              .then(function (profileSnap) {
                var profile = profileSnap.exists ? profileSnap.data() || {} : {};
                return {
                  recipientUid: memberUid,
                  claimedAt: claimedAt,
                  displayName: profile.displayName || "",
                  email: profile.email || "",
                };
              })
              .catch(function () {
                return { recipientUid: memberUid, claimedAt: claimedAt, displayName: "", email: "" };
              });
          })
        ).then(function (audience) {
          var outgoing = outgoingSnap.docs.map(function (doc) {
            var d = doc.data() || {};
            return {
              token: doc.id,
              title: d.title || "",
              scriptId: d.scriptId || "",
              createdAt: d.createdAt || null,
            };
          });
          shareManagementSnapshot = {
            audience: audience,
            outgoing: outgoing,
            loading: false,
            error: null,
          };
          accountInsightsSnapshot.shareAudienceCount = audience.length;
          renderShareManagementPanel();
          renderAccountInsights();
        });
      })
      .catch(function (e) {
        shareManagementSnapshot.loading = false;
        shareManagementSnapshot.error = (e && e.message) || "Could not load sharing lists.";
        renderShareManagementPanel();
      });
  }

  function makeShareInviteToken() {
    var bytes = new Uint8Array(16);
    var c = window.crypto || window.msCrypto;
    if (!c || !c.getRandomValues) {
      throw new Error("Secure random is not available in this browser.");
    }
    c.getRandomValues(bytes);
    var bin = "";
    for (var i = 0; i < bytes.length; i += 1) {
      bin += String.fromCharCode(bytes[i]);
    }
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  /**
   * Creator-only: writes `shareInvites/{token}` + `users/{uid}/outgoingShares/{token}` like iOS `AudioShareService`.
   * Recipients open `https://focusshift.app/s/{token}` in the app (or web when claim UI exists).
   */
  function shareAudioFromScript(script) {
    if (!currentUser || !currentUser.uid) {
      setMessage("Sign in to share.", "error");
      return;
    }
    if (!isWebCreatorTier()) {
      setMessage("Sharing is available on the Creator plan.", "info");
      return;
    }
    var uid = currentUser.uid;
    var outgoingCol = db.collection("users").doc(uid).collection("outgoingShares");
    outgoingCol
      .get()
      .then(function (snap) {
        if (snap.size >= CREATOR_OUTGOING_SHARE_CAP) {
          setMessage(
            "You’ve reached the maximum number of active shares. Deactivate an old share in Account → Sharing management and try again.",
            "error"
          );
          return;
        }
        var shareAudio = (script.audioURL && String(script.audioURL).trim()) || "";
        function proceedWithAudio(url) {
          var u = (url || "").trim();
          if (!u || u.toLowerCase().indexOf("http") !== 0) {
            setMessage(
              "No https audio link on this script yet. Generate audio (or wait for cloud sync), then try again — sharing uses the hosted URL listeners can play.",
              "error"
            );
            return;
          }
          var token;
          try {
            token = makeShareInviteToken();
          } catch (e) {
            setMessage((e && e.message) || "Could not create share link.", "error");
            return;
          }
          var creatorName = resolveDisplayNameForScript("") || "Someone";
          var batch = db.batch();
          var inviteRef = db.collection("shareInvites").doc(token);
          var outRef = outgoingCol.doc(token);
          batch.set(inviteRef, {
            creatorUid: uid,
            creatorDisplayName: creatorName,
            scriptId: script.id,
            title: script.title || "Shared audio",
            text: script.text || "",
            audioURL: u,
            voiceID: script.voiceID || "",
            backgroundID: script.backgroundID || "",
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            active: true,
          });
          batch.set(outRef, {
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            title: script.title || "",
            scriptId: script.id,
          });
          batch
            .commit()
            .then(function () {
              var link = SHARE_UNIVERSAL_LINK_ORIGIN + token;
              if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
                return navigator.clipboard.writeText(link).then(function () {
                  setMessage(
                    "Share link copied. Recipients sign in on iPhone, iPad, or the web app and open the link to add this audio to My Library.",
                    "success"
                  );
                });
              }
              window.prompt("Copy this share link:", link);
              setMessage("Share link created.", "success");
              return Promise.resolve();
            })
            .catch(function (e) {
              setMessage((e && e.message) || "Could not create share link.", "error");
            });
        }
        if (shareAudio && shareAudio.toLowerCase().indexOf("http") === 0) {
          proceedWithAudio(shareAudio);
        } else {
          scriptCollection(uid)
            .doc(script.id)
            .get()
            .then(function (docSnap) {
              var d = (docSnap.exists && docSnap.data()) || {};
              var remote = (d.audioURL && String(d.audioURL).trim()) || "";
              proceedWithAudio(remote || shareAudio);
            })
            .catch(function (e) {
              setMessage((e && e.message) || "Could not read script audio.", "error");
            });
        }
      })
      .catch(function (e) {
        setMessage((e && e.message) || "Could not check existing shares.", "error");
      });
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

  function resolvedWelcomeNickname(email) {
    var n = resolveDisplayNameForScript("");
    if (n) return n;
    var e = (email || "").trim();
    var at = e.indexOf("@");
    if (at > 0) {
      var local = e.slice(0, at).trim();
      if (local) return local;
    }
    return e || "there";
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
    var intakeAnswers = {};
    if (ctx.intakeObstacle) intakeAnswers.obstacle = ctx.intakeObstacle;
    if (ctx.intakeContext) intakeAnswers.context = ctx.intakeContext;
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
      intakeAnswers: intakeAnswers,
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
    var obstacleEl = document.getElementById("gen-intake-obstacle");
    var contextEl = document.getElementById("gen-intake-context");
    var toneEl = document.getElementById("gen-tone");
    var lenRadio = document.querySelector('input[name="gen-length"]:checked');
    var persRadio = document.querySelector('input[name="gen-perspective"]:checked');
    var useNameEl = document.getElementById("gen-use-name");
    return {
      cat: cat,
      q1: q1.trim(),
      q2: q2.trim(),
      intakeObstacle: obstacleEl ? obstacleEl.value.trim() : "",
      intakeContext: contextEl ? contextEl.value.trim() : "",
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
    generationMessage("", "");
    showScriptWorkOverlay({
      title: "Generating your script...",
      detail: "Long scripts can take up to 5 minutes.",
    });
    postGenerateScriptRequest(payload)
      .then(function (json) {
        if (!json.content) throw new Error("Empty script response.");
        var title = uniqueScriptTitle(ctx.cat.name + " Script");
        var docRef = scriptCollection(currentUser.uid).doc();
        var mediaRec = recommendedMediaForCategory(ctx.cat.id, ctx.tone);
        var saveVoiceId =
          accountDefaultVoiceId() ||
          (selectedVoiceId || "").trim() ||
          (mediaRec && mediaRec.voiceID) ||
          "";
        var saveBgId =
          accountDefaultBackgroundId() ||
          (selectedBackgroundId || "").trim() ||
          (mediaRec && mediaRec.backgroundID) ||
          "";
        return scriptCollection(currentUser.uid)
          .doc(docRef.id)
          .set({
            title: title,
            text: String(json.content).trim(),
            createdAt: firebase.firestore.Timestamp.now(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            audioURL: "",
            backgroundID: saveBgId,
            voiceID: saveVoiceId,
            audioCreatedAt: null,
            categoryID: ctx.cat.id,
          })
          .then(function () {
            var newScriptId = docRef.id;
            var scriptText = String(json.content).trim();
            var now = firebase.firestore.Timestamp.now();
            generationMessage("Generated and saved as \"" + title + "\".", "success");
            homeClarifyFlow = null;
            var q1El = document.getElementById("gen-q1");
            var q2El = document.getElementById("gen-q2");
            if (q1El) q1El.value = "";
            if (q2El) q2El.value = "";
            upsertCurrentScript({
              id: newScriptId,
              title: title,
              text: scriptText,
              audioURL: "",
              voiceID: saveVoiceId,
              backgroundID: saveBgId,
              categoryID: ctx.cat.id,
              createdAt: now,
              updatedAt: null,
              audioCreatedAt: null,
              audioContentHash: "",
              audioVoiceID: "",
              audioBackgroundID: "",
            });
            seedInlineScriptDraft(newScriptId, title, scriptText);
            setMessage("Saved to My Library — edit the title or script below.", "success");
            setHomeFlowStep("landing", ctx.displayName || "");
            openInlineScriptEditorForScript(newScriptId, true);
          });
      })
      .catch(function (e) {
        var msg = e.message || "Could not generate script.";
        if (!handleQuotaLimitError(msg)) generationMessage(msg, "error");
      })
      .finally(function () {
        stopScriptWorkOverlay();
      });
  }

  function requestNextClarifyingQuestion() {
    if (!homeClarifyFlow || !currentUser) return;
    var f = homeClarifyFlow;
    generationMessage("", "");
    showScriptWorkOverlay({
      title:
        "Generating clarifying question " +
        (f.currentIndex + 1) +
        " of " +
        f.requested +
        "…",
      detail: "This usually takes a moment.",
    });
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
        var msg = e.message || "Could not load clarifying question.";
        if (!handleQuotaLimitError(msg)) generationMessage(msg, "error");
        homeClarifyFlow = null;
        setHomeFlowStep("survey", f.displayName);
      })
      .finally(function () {
        stopScriptWorkOverlay();
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
    syncHomeSectionHeader(displayName);
    var cat = selectedCategory();
    if (homeFlowStep === "landing") {
      var ls = webListeningStats || normalizeListeningDoc({});
      var dailySparkSub = escapeHtml(dailySparkSubtitleWeb());
      var dailySparkLoading = dailySparkState.loading || dailySparkState.playing;
      var dailySparkAudible = isDailySparkTransportPlaying();
      var listenHead = hasPlayedTodayWeb(ls) ? "Listen again" : "Listen to an affirmation today";
      var listenSub = escapeHtml(listenTodaySubtitleWeb(ls));
      el.innerHTML =
        '<div style="display:flex;flex-direction:column;gap:0.65rem;">' +
        '  <div class="app-card app-glass-card" style="margin:0;padding:0.95rem 0.9rem;">' +
        '    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.6rem;flex-wrap:wrap;">' +
        "      <div>" +
        '        <strong style="font-size:1rem;">Create Personalized Mental Script</strong>' +
        '        <p class="app-muted" style="margin:0.25rem 0 0;">Follow category selection, then answer your survey questions.</p>' +
        "      </div>" +
        "    </div>" +
        '    <div style="margin-top:0.75rem;"><button type="button" class="app-btn app-btn-primary" id="home-start-create">Create Personalized Mental Script</button></div>' +
        "  </div>" +
        '  <div class="app-card app-glass-card home-action-buttons-card">' +
        '    <div class="home-action-buttons-grid">' +
        '    <button type="button" class="home-daily-spark-row" id="home-daily-spark-row">' +
        '      <span class="home-daily-spark-icon" aria-hidden="true">' +
        '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="4.5" fill="#fbbf24"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round"/></svg></span>' +
        '      <span class="home-listen-today-text">' +
        '        <span class="home-listen-today-title">Daily Spark</span>' +
        '        <span class="home-listen-today-sub">' +
        dailySparkSub +
        "</span>" +
        "      </span>" +
        (dailySparkLoading
          ? '      <span class="home-daily-spark-spinner" aria-hidden="true"></span>'
          : "      " + homeDailySparkTransportIconHtml(dailySparkAudible)) +
        "    </button>" +
        '    <button type="button" class="home-listen-today-row" id="home-listen-today-row">' +
        '      <span class="home-listen-today-icon" aria-hidden="true">' +
        '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="#60a5fa" stroke-width="1.4"/><path d="M8 10c1.5 1.2 3.5 1.2 5 0M8 14h8" stroke="#93c5fd" stroke-width="1.3" stroke-linecap="round"/></svg></span>' +
        '      <span class="home-listen-today-text">' +
        '        <span class="home-listen-today-title">' +
        escapeHtml(listenHead) +
        "</span>" +
        '        <span class="home-listen-today-sub">' +
        listenSub +
        "</span>" +
        "      </span>" +
        '      <span class="home-listen-today-chev" aria-hidden="true">›</span>' +
        "    </button>" +
        "    </div>" +
        "  </div>" +
        buildHomeDashboardCardHtml(ls) +
        "</div>";
      var startBtn = document.getElementById("home-start-create");
      if (startBtn) {
        startBtn.addEventListener("click", function () {
          if (!isWebPaidTierForAI()) {
            setMessage("AI script generation requires Starter or Creator.", "info");
            openAccountModal();
            return;
          }
          setHomeFlowStep("category", displayName);
        });
      }
      if (isWebPaidTierForAI()) {
        fetchDailySparkCurrent(false);
      }
      var dailySparkRow = document.getElementById("home-daily-spark-row");
      if (dailySparkRow) {
        dailySparkRow.addEventListener("click", function () {
          playDailySparkWeb();
        });
      }
      var listenRow = document.getElementById("home-listen-today-row");
      if (listenRow) {
        listenRow.addEventListener("click", function () {
          performListenTodayPrimaryAction();
        });
      }
      var playsPeriodBtn = document.getElementById("home-plays-period");
      if (playsPeriodBtn) {
        playsPeriodBtn.addEventListener("click", function (ev) {
          ev.stopPropagation();
          cycleHomePlaysPeriod();
          renderHomeFlow(displayName);
        });
      }
      var lastPlayedBtn = document.getElementById("home-last-played");
      if (lastPlayedBtn) {
        lastPlayedBtn.addEventListener("click", function () {
          playLastListenedAgain();
        });
      }
      var milestonesToggle = document.getElementById("home-milestones-toggle");
      if (milestonesToggle) {
        milestonesToggle.addEventListener("click", function () {
          homeDashboardBadgesExpanded = !homeDashboardBadgesExpanded;
          renderHomeFlow(displayName);
        });
      }
      var upgradeBtn = document.getElementById("home-dashboard-upgrade");
      if (upgradeBtn) {
        upgradeBtn.addEventListener("click", function () {
          openAccountModal();
        });
      }
      var remindersRow = document.getElementById("home-reminders-row");
      if (remindersRow) {
        remindersRow.addEventListener("click", function () {
          setMessage(
            "Daily listening reminders are set up in the Focus Shift iOS app under Home or Account.",
            "info"
          );
        });
      }
      return;
    }
    if (homeFlowStep === "category") {
      el.innerHTML =
        '<div style="display:flex;flex-direction:column;gap:0.65rem;">' +
        '  <p class="app-muted" style="margin:0;">Pick a topic to personalize your script.</p>' +
        '  <div id="home-category-list" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:0.5rem;"></div>' +
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
      return;
    }
    if (homeFlowStep === "clarify" && homeClarifyFlow) {
      generationMessage("", "");
      var cf = homeClarifyFlow;
      var pq = cf.pendingQuestion || "";
      var turnHint = clarifyingTurnGoal(cf.currentIndex || 0);
      el.innerHTML =
        '<div class="app-card app-glass-card" style="margin:0;padding:0.95rem 0.9rem;">' +
        '  <p class="gen-clarify-progress">Clarifying question <strong>' +
        escapeHtml(String(cf.currentIndex + 1)) +
        "</strong> of <strong>" +
        escapeHtml(String(cf.requested)) +
        "</strong></p>" +
        '  <p class="app-muted" style="margin:0 0 0.5rem;font-size:0.85rem;">' +
        escapeHtml(turnHint) +
        "</p>" +
        '  <p style="margin:0 0 0.65rem;font-weight:600;">' +
        escapeHtml(pq) +
        "</p>" +
        '  <div class="gen-clarify-field">' +
        '    <label for="clarify-answer">Your answer</label>' +
        '    <textarea id="clarify-answer" class="gen-survey-textarea gen-clarify-textarea" required rows="5" placeholder="Share what feels true for you…"></textarea>' +
        "  </div>" +
        '  <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.85rem;">' +
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
    var defaultTone = defaultToneForCategory(cat.id);
    var mediaRec = recommendedMediaForCategory(cat.id, defaultTone);
    el.innerHTML =
      '<form id="generate-form" class="app-form" style="margin:0;">' +
      '  <p class="app-muted" style="margin:0 0 0.45rem;">Category: <strong>' +
      escapeHtml(cat.name) +
      "</strong></p>" +
      (mediaRec
        ? '  <p class="app-muted" id="gen-media-hint" style="margin:0 0 0.5rem;font-size:0.85rem;">Listen match: <strong>' +
          escapeHtml(mediaRec.voiceName) +
          "</strong> + <strong>" +
          escapeHtml(mediaRec.backgroundName) +
          "</strong> (updates when you change tone; confirm in My Library after save)</p>"
        : "") +
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
      '  <label for="gen-intake-obstacle" style="margin-top:0.85rem;">' +
      escapeHtml(surveyIntakeObstacleQuestion) +
      "</label>" +
      '  <textarea id="gen-intake-obstacle" class="gen-survey-textarea" rows="3" placeholder="Optional — helps the script address what gets in your way"></textarea>' +
      '  <label for="gen-intake-context" style="margin-top:0.75rem;">' +
      escapeHtml(surveyIntakeContextQuestion) +
      "</label>" +
      '  <textarea id="gen-intake-context" class="gen-survey-textarea" rows="3" placeholder="Optional — morning, bedtime, before a game, at work…"></textarea>' +
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
        : '  <div class="gen-stepper-row gen-stepper-locked"><span id="gen-clarify-display" class="gen-stepper-value">0</span></div>' +
          '  <input type="hidden" id="gen-clarify-count" value="0" />') +
      '  <p class="gen-pill-hint app-muted" style="margin-top:0.35rem;">' +
      escapeHtml(clarifyHint) +
      "</p>" +
      '  <div style="margin-top:0.9rem;">' +
      '    <button type="submit" class="app-btn app-btn-primary" id="gen-submit-primary">Generate</button>' +
      "  </div>" +
      "</form>";
    wirePerspectiveUseNameRow();
    wireGenLengthHint();
    wireClarifyStepper();
    var tonePick = document.getElementById("gen-tone");
    if (tonePick) {
      tonePick.value = defaultTone;
      tonePick.addEventListener("change", function () {
        var rec = applyCategoryMediaRecommendations(cat.id, tonePick.value);
        var hint = document.getElementById("gen-media-hint");
        if (hint && rec) {
          hint.innerHTML =
            "Listen match: <strong>" +
            escapeHtml(rec.voiceName) +
            "</strong> + <strong>" +
            escapeHtml(rec.backgroundName) +
            "</strong> (updates when you change tone; confirm in My Library after save)";
        }
      });
    }
    var form = document.getElementById("generate-form");
    if (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        beginScriptGenerationFromForm(displayName || "");
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
    postScreenMessage("scripts-message", text, kind);
  }

  function setPlaylistsMessage(text, kind) {
    postScreenMessage("playlists-message", text, kind);
  }

  function setPremadeMessage(text, kind) {
    postScreenMessage("premade-message", text, kind);
  }

  function updateTabCounts() {
    var cLib = document.getElementById("count-library");
    var cPlay = document.getElementById("count-playlists");
    var cPre = document.getElementById("count-premade");
    if (cLib) cLib.textContent = String(currentScripts.length);
    if (cPlay) cPlay.textContent = String(currentPlaylists.length);
    if (cPre) cPre.textContent = String(filterPremadesByCatalogAccess(currentPremade).length);
    renderAccountInsights();
  }

  function accountDefaultVoiceId() {
    var fromProfile =
      currentUserProfile && currentUserProfile.defaultVoiceID
        ? String(currentUserProfile.defaultVoiceID).trim()
        : "";
    if (fromProfile) return fromProfile;
    return (selectedVoiceId || "").trim();
  }

  function accountDefaultBackgroundId() {
    var fromProfile =
      currentUserProfile && currentUserProfile.defaultBackgroundID
        ? String(currentUserProfile.defaultBackgroundID).trim()
        : "";
    if (fromProfile) return fromProfile;
    return (selectedBackgroundId || "").trim();
  }

  function effectiveVoiceIdForScript(script) {
    var v = script && script.voiceID ? String(script.voiceID).trim() : "";
    if (!v || v === "default") return accountDefaultVoiceId();
    return v;
  }

  function effectiveBackgroundIdForScript(script) {
    var b = script && script.backgroundID ? String(script.backgroundID).trim() : "";
    if (!b) return accountDefaultBackgroundId();
    return b;
  }

  /** Card/workshop labels: stored script fields only (iOS `savedVoiceName` / `savedBackgroundName`). */
  function storedVoiceDisplayNameForScript(script) {
    var v = script && script.voiceID ? String(script.voiceID).trim() : "";
    if (!v || v === "default") return "Default";
    return voiceNameById(v);
  }

  function storedBackgroundDisplayNameForScript(script) {
    var b = script && script.backgroundID ? String(script.backgroundID).trim() : "";
    if (!b) return "No Background";
    return backgroundNameById(b);
  }

  function workshopVoiceLabelFromDraft(draft) {
    var v = draft && draft.voiceID ? String(draft.voiceID).trim() : "";
    if (!v || v === "default") return "Default";
    return voiceNameById(v);
  }

  function workshopBackgroundLabelFromDraft(draft) {
    var b = draft && draft.backgroundID ? String(draft.backgroundID).trim() : "";
    if (!b) return "No Background";
    return backgroundNameById(b);
  }

  function getFrozenAudioVoiceId(script) {
    if (!script) return "";
    if (script.audioVoiceID && String(script.audioVoiceID).trim()) {
      return String(script.audioVoiceID).trim();
    }
    var cached = frozenAudioSettingsByScriptId[script.id];
    return cached && cached.voiceID ? cached.voiceID : "";
  }

  function getFrozenAudioBackgroundId(script) {
    if (!script) return "";
    if (script.audioBackgroundID && String(script.audioBackgroundID).trim()) {
      return String(script.audioBackgroundID).trim();
    }
    var cached = frozenAudioSettingsByScriptId[script.id];
    return cached && cached.backgroundID ? cached.backgroundID : "";
  }

  /** Cache voice/background from first snapshot when audio exists but audioVoiceID is missing (legacy / iOS). */
  function ensureFrozenAudioSettingsCached(script) {
    if (!script || !script.id) return;
    if (getFrozenAudioVoiceId(script) || getFrozenAudioBackgroundId(script)) return;
    if (frozenAudioSettingsByScriptId[script.id]) return;
    if (!(script.audioURL && String(script.audioURL).trim()) || !getEffectiveStoredContentHash(script)) {
      return;
    }
    var sv = (script.voiceID && String(script.voiceID).trim()) || "";
    var sb = (script.backgroundID && String(script.backgroundID).trim()) || "";
    frozenAudioSettingsByScriptId[script.id] = {
      voiceID: sv || accountDefaultVoiceId(),
      backgroundID: sb || accountDefaultBackgroundId(),
    };
  }

  function scriptHasFrozenAudioSettings(script) {
    if (!script) return false;
    ensureFrozenAudioSettingsCached(script);
    return !!(getFrozenAudioVoiceId(script) || getFrozenAudioBackgroundId(script));
  }

  function scriptVoiceBackgroundDrifted(script) {
    if (!script || !(script.audioURL && String(script.audioURL).trim())) return false;
    if (!scriptHasFrozenAudioSettings(script)) return false;
    var av = getFrozenAudioVoiceId(script);
    var ab = getFrozenAudioBackgroundId(script);
    return effectiveVoiceIdForScript(script) !== av || effectiveBackgroundIdForScript(script) !== ab;
  }

  function scriptDigestSourceFromScript(script) {
    return {
      text: (script && script.text) || "",
      voiceID: effectiveVoiceIdForScript(script),
      backgroundID: effectiveBackgroundIdForScript(script),
    };
  }

  /** Hash input for a library card (saved script state only). */
  function scriptDigestSourceForScriptCard(script) {
    return scriptDigestSourceFromScript(script);
  }

  /** Aligns with iOS `AudioTagUtils` for Eleven v3-style tags. */
  var WEB_SHOW_AUDIO_TAGS_STORAGE_KEY = "focusshiftWebShowAudioTagsInScript";

  function readShowAudioTagsFormattingPreference() {
    try {
      return localStorage.getItem(WEB_SHOW_AUDIO_TAGS_STORAGE_KEY) === "1";
    } catch (_e) {
      return false;
    }
  }

  function stripAudioTagsForDisplay(text) {
    if (text == null || text === "") return "";
    var result = String(text);
    result = result.replace(/\[emphasized\]([\s\S]*?)\[\/emphasized\]/g, "$1");
    ["[short pause]", "[long pause]", "[pause]"].forEach(function (tag) {
      result = result.split(tag).join(" ");
    });
    var standaloneTags = [
      "[deliberate]",
      "[/deliberate]",
      "[shouts]",
      "[/shouts]",
      "[whispers]",
      "[/whispers]",
      "[rushed]",
      "[/rushed]",
      "[slows down]",
      "[stress on next word]",
      "[understated]",
    ];
    standaloneTags.forEach(function (tag) {
      result = result.split(tag).join("");
    });
    result = result.replace(/\[\/?[a-zA-Z\s]+\]/g, "");
    while (result.indexOf("  ") >= 0) {
      result = result.replace(/  /g, " ");
    }
    return result.trim();
  }

  function containsAudioTagsForScript(text) {
    if (!text) return false;
    if (/\[short pause\]|\[long pause\]|\[pause\]|\[emphasized\]/.test(text)) return true;
    return /\[[^\]]+\]/.test(text);
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

  /** Hash of text|voice|background last used when audio was produced (Firestore), else localStorage fallback. */
  function getEffectiveStoredContentHash(script) {
    if (!script || !script.id) return "";
    var fromDoc = (script.audioContentHash && String(script.audioContentHash).trim()) || "";
    if (fromDoc) return fromDoc;
    return getStoredGeneratedHash(script.id);
  }

  function setStoredGeneratedHash(scriptId, hex) {
    try {
      if (!scriptId || !hex) return;
      localStorage.setItem(GENERATED_HASH_STORAGE_PREFIX + scriptId, hex);
    } catch (_e) {}
  }

  /** True when text, voice, or background no longer match the last generated audio. */
  function scriptNeedsAudioRegeneration(script, contentHashHex) {
    var hasAudio = !!(script && script.audioURL && String(script.audioURL).trim());
    if (!hasAudio) return true;
    var stored = getEffectiveStoredContentHash(script);
    if (!stored) return true;
    return stored !== contentHashHex;
  }

  function shouldEnableGenerateFromHash(script, contentHashHex) {
    return scriptNeedsAudioRegeneration(script, contentHashHex);
  }

  /** @deprecated Use scriptNeedsAudioRegeneration — kept for call sites. */
  function scriptAudioSettingsDrifted(script, contentHashHex) {
    if (!script || !(script.audioURL && String(script.audioURL).trim())) return false;
    return scriptNeedsAudioRegeneration(script, contentHashHex);
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
      text: resolvePremadeScriptText(premade),
      voiceID: String(resolvePremadeVoiceSelection(premade) || "").trim(),
      backgroundID: String(resolvePremadeBackgroundSelection(premade) || "").trim(),
    };
  }

  function premadePublishedDigestSource(premade) {
    var publishedVoice = (premade && premade.voiceID && String(premade.voiceID).trim()) || "";
    if (!publishedVoice) publishedVoice = PREMADE_DEFAULT_VOICE_ID || selectedVoiceId || "";
    var publishedBg = (premade && premade.backgroundID && String(premade.backgroundID).trim()) || "";
    if (publishedBg === "bg-none") publishedBg = "";
    if (!publishedBg) publishedBg = selectedBackgroundId || "";
    return {
      text: resolvePremadeScriptText(premade),
      voiceID: publishedVoice,
      backgroundID: publishedBg,
    };
  }

  function seedPremadeContentHashIfNeeded(premade) {
    if (!premade || !premade.id) return Promise.resolve();
    if (!premade.audioURL || !String(premade.audioURL).trim()) return Promise.resolve();
    if (getStoredGeneratedHashPremade(premade.id)) return Promise.resolve();
    return scriptContentSha256Hex(premadePublishedDigestSource(premade)).then(function (digest) {
      setStoredGeneratedHashPremade(premade.id, digest);
    });
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
    return false;
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
    if (!ids.length) return false;
    return ids.every(function (id) {
      return controlsExpandedForPremade(id);
    });
  }

  function toggleExpandAllPremadeAudioControls() {
    var ids = premadeIdsForExpandAllToggle();
    if (!ids.length) return;
    var next = !allPremadeAudioControlsExpanded(ids);
    ids.forEach(function (id) {
      setPremadeCardAudioControlsExpanded(id, next);
    });
    renderPremade();
  }

  function updatePremadeExpandAllToggleUi() {
    var btn = document.getElementById("premade-expand-all-audio");
    if (!btn) return;
    if (!activePremadeCategoryId) {
      btn.disabled = true;
      btn.textContent = "▼";
      btn.setAttribute("aria-expanded", "false");
      btn.title = "Open a category to expand or collapse audio controls";
      return;
    }
    var ids = premadeIdsForExpandAllToggle();
    if (!ids.length) {
      btn.disabled = true;
      btn.textContent = "▼";
      btn.setAttribute("aria-expanded", "false");
      btn.title = "";
      return;
    }
    btn.disabled = false;
    btn.title = "";
    var allExp = allPremadeAudioControlsExpanded(ids);
    btn.textContent = allExp ? "▲" : "▼";
    btn.setAttribute("aria-expanded", allExp ? "true" : "false");
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

  function premadeLibraryCategoryDisplayName(categoryID) {
    if (categoryID === "__other__") return "Other";
    var row = PREMADE_LIBRARY_CATEGORY_ORDER.find(function (c) {
      return c.id === categoryID;
    });
    return (row && row.name) || categoryID || "Other";
  }

  function premadeCategoryIconHtml(categoryId) {
    var svg =
      PREMADE_CATEGORY_ICON_SVGS[categoryId] ||
      PREMADE_CATEGORY_ICON_SVGS.__other__ ||
      "";
    return (
      '<div class="premade-category-selector-icon premade-category-selector-icon--' +
      escapeHtml(categoryId) +
      '" aria-hidden="true">' +
      svg +
      "</div>"
    );
  }

  function premadeCategoryMatchesSearch(categoryName, items, query) {
    if (!query) return true;
    if (textMatchesSectionSearch(categoryName, query)) return true;
    return (items || []).some(function (p) {
      return (
        textMatchesSectionSearch(p.title, query) ||
        textMatchesSectionSearch(p.scriptText, query) ||
        textMatchesSectionSearch(p.description, query)
      );
    });
  }

  function premadeCategoryRowsForList(grouped) {
    var q = normalizeSectionSearchQuery(sectionSearchQuery.library);
    var rows = PREMADE_LIBRARY_CATEGORY_ORDER.map(function (c) {
      return {
        id: c.id,
        name: c.name,
        items: grouped.byId[c.id] || [],
      };
    });
    if (grouped.other.length) {
      rows.push({ id: "__other__", name: "Other", items: grouped.other });
    }
    if (!q) return rows;
    return rows.filter(function (row) {
      return premadeCategoryMatchesSearch(row.name, row.items, q);
    });
  }

  function premadeCategorySelectorCardHtml(row) {
    var count = (row.items && row.items.length) || 0;
    var countLabel = count === 1 ? "1 script" : count + " scripts";
    return (
      '<button type="button" class="premade-category-selector-card" data-premade-category-open="' +
      escapeHtml(row.id) +
      '">' +
      premadeCategoryIconHtml(row.id) +
      '  <span class="premade-category-selector-copy">' +
      '    <span class="premade-category-selector-name">' +
      escapeHtml(row.name) +
      "</span>" +
      '    <span class="premade-category-selector-sub">App Library · ' +
      escapeHtml(countLabel) +
      "</span>" +
      "  </span>" +
      '  <span class="premade-category-selector-chevron" aria-hidden="true">\u203a</span>' +
      "</button>"
    );
  }

  function premadeCategoryListHtml(grouped) {
    var rows = premadeCategoryRowsForList(grouped);
    if (!rows.length) {
      return '<p class="app-muted" style="margin:0;">No categories match your search.</p>';
    }
    return (
      '<div class="premade-category-selector-list">' +
      rows.map(premadeCategorySelectorCardHtml).join("") +
      "</div>"
    );
  }

  function premadeCategoryDetailHtml(categoryId, categoryName, items, hashMap) {
    var cardsHtml = items.length
      ? items
          .map(function (p) {
            return premadeCardHtml(p, hashMap[p.id] || "");
          })
          .join("")
      : '<p class="app-muted premade-category-empty">No premade scripts in this category yet.</p>';
    return (
      '<div class="premade-category-detail">' +
      '  <div class="premade-category-detail-nav">' +
      '    <button type="button" class="app-btn app-btn-ghost premade-category-back-btn" data-premade-category-back="1">← Categories</button>' +
      "  </div>" +
      '  <h3 class="premade-category-detail-title">' +
      escapeHtml(categoryName) +
      "</h3>" +
      '  <div class="premade-category-detail-cards">' +
      cardsHtml +
      "  </div>" +
      "</div>"
    );
  }

  function closePremadeCategoryView() {
    activePremadeCategoryId = null;
    renderPremade();
  }

  function premadeIdsForExpandAllToggle() {
    if (!activePremadeCategoryId) return [];
    var displayPremade = filteredPremadesForDisplay(currentPremade);
    var grouped = groupPremadesByLibraryCategory(displayPremade);
    var items =
      activePremadeCategoryId === "__other__"
        ? grouped.other
        : grouped.byId[activePremadeCategoryId] || [];
    return items.map(function (p) {
      return p.id;
    });
  }

  function bindPremadeCategoryNavActions() {
    var list = document.getElementById("premade-list");
    if (!list) return;
    list.querySelectorAll("[data-premade-category-open]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var cid = btn.getAttribute("data-premade-category-open");
        if (!cid) return;
        activePremadeCategoryId = cid;
        renderPremade();
      });
    });
    list.querySelectorAll("[data-premade-category-back]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        closePremadeCategoryView();
      });
    });
  }

  function setScriptBusy(scriptId, busy) {
    generatingAudioByScriptId[scriptId] = busy;
    renderScripts(currentScripts);
  }

  function isScriptBusy(scriptId) {
    if (activeBackgroundAudioTask && activeBackgroundAudioTask.scriptId === scriptId) {
      return true;
    }
    return generatingAudioByScriptId[scriptId] === true;
  }

  function isScriptQueuedForBackgroundAudio(scriptId) {
    return backgroundAudioQueue.some(function (t) {
      return t.scriptId === scriptId;
    });
  }

  function backgroundAudioTaskCount() {
    return (activeBackgroundAudioTask ? 1 : 0) + backgroundAudioQueue.length;
  }

  function scriptHasPlayableAudio(script) {
    var url = script && script.audioURL ? String(script.audioURL).trim() : "";
    return !!url;
  }

  function showSplitEditGenerateOnCard(script, controlsReadOnly) {
    if (controlsReadOnly || isWebFreeTier()) return false;
    var text = (script.text || "").trim();
    if (!text) return false;
    if (!effectiveVoiceIdForScript(script)) return false;
    return !scriptHasPlayableAudio(script);
  }

  function updateBackgroundAudioBadge() {
    var wrap = document.getElementById("app-generation-badge-wrap");
    if (!wrap) return;
    var active = !!activeBackgroundAudioTask;
    wrap.hidden = !active;
    if (!active) {
      if (backgroundAudioBadgeTimerId) {
        clearInterval(backgroundAudioBadgeTimerId);
        backgroundAudioBadgeTimerId = null;
      }
      return;
    }
    var labelEl = document.getElementById("app-generation-badge-label");
    var elapsedEl = document.getElementById("app-generation-badge-elapsed");
    var queueEl = document.getElementById("app-generation-badge-queue");
    var count = backgroundAudioTaskCount();
    if (labelEl) {
      labelEl.textContent =
        activeBackgroundAudioTask.kind === "transcribe" ? "Transcribing" : "Generating";
    }
    if (queueEl) {
      if (count > 1) {
        queueEl.hidden = false;
        queueEl.textContent = String(count);
      } else {
        queueEl.hidden = true;
        queueEl.textContent = "";
      }
    }
    if (elapsedEl && activeBackgroundAudioTask.startedAt) {
      var secs = Math.max(0, Math.floor((Date.now() - activeBackgroundAudioTask.startedAt) / 1000));
      elapsedEl.textContent = formatGenerationElapsed(secs);
    }
    if (!backgroundAudioBadgeTimerId) {
      backgroundAudioBadgeTimerId = setInterval(function () {
        updateBackgroundAudioBadge();
      }, 1000);
    }
  }

  function enqueueBackgroundAudioGeneration(script, options) {
    options = options || {};
    var scriptId = script.id;
    if (
      (activeBackgroundAudioTask && activeBackgroundAudioTask.scriptId === scriptId) ||
      isScriptQueuedForBackgroundAudio(scriptId)
    ) {
      showAppBanner(
        "Already in Queue",
        '"' + (script.title || "Script") + '" is already generating or waiting.',
        "info",
        { duration: 4500 }
      );
      return;
    }
    var task = { scriptId: scriptId, script: script, kind: "generate", startedAt: 0 };
    if (!activeBackgroundAudioTask) {
      runBackgroundAudioTask(task, !!options.showStartingBanner);
      return;
    }
    if (backgroundAudioTaskCount() >= MAX_BACKGROUND_AUDIO_TASKS) {
      showAppBanner(
        "Queue Full",
        "You can have up to 3 audio jobs at a time. Wait for one to finish.",
        "info",
        { duration: 4500 }
      );
      return;
    }
    backgroundAudioQueue.push(task);
    showAppBanner(
      "Added to Queue",
      '"' +
        (script.title || "Script") +
        '" will run after the current job (' +
        backgroundAudioQueue.length +
        " waiting).",
      "info",
      { duration: 4500 }
    );
    updateBackgroundAudioBadge();
  }

  function runBackgroundAudioTask(task, showStartingBanner) {
    activeBackgroundAudioTask = {
      scriptId: task.scriptId,
      script: task.script,
      kind: task.kind || "generate",
      startedAt: Date.now(),
    };
    setScriptBusy(task.scriptId, true);
    updateBackgroundAudioBadge();
    if (showStartingBanner) {
      showAppBanner(
        "Generating audio",
        "Long scripts can take up to 5 minutes. You can keep using the app.",
        "info",
        { duration: 5500 }
      );
    } else {
      showAppBanner(
        "Generating Next",
        'Starting "' + (task.script.title || "Script") + '"…',
        "info",
        { duration: 3500 }
      );
    }
    executeBackgroundAudioGeneration(task.script)
      .then(function () {
        completeBackgroundAudioTask(true, task.script);
      })
      .catch(function (e) {
        completeBackgroundAudioTask(false, task.script, e);
      });
  }

  function completeBackgroundAudioTask(success, script, error) {
    setScriptBusy(script.id, false);
    activeBackgroundAudioTask = null;
    if (success) {
      showAppBanner("Audio Generated", "Your audio was generated and saved.", "success", { duration: 4500 });
    } else if (error) {
      var msg = (error && error.message) || "Audio generation failed.";
      reportClientError(msg, "audio_generation", { script_id: script.id });
      if (!handleQuotaLimitError(msg)) {
        showAppBanner("Generation Failed", msg, "error", { duration: 7000 });
      }
    }
    if (backgroundAudioQueue.length) {
      var next = backgroundAudioQueue.shift();
      runBackgroundAudioTask(next, false);
    } else {
      updateBackgroundAudioBadge();
    }
    renderScripts(currentScripts);
  }

  function executeBackgroundAudioGeneration(script) {
    if (!currentUser) return Promise.reject(new Error("Not signed in."));
    var text = (script.text || "").trim();
    if (!text) return Promise.reject(new Error("Script text is empty."));
    var genGuard = validateScriptForAudioGeneration(script);
    if (genGuard) return Promise.reject(new Error(genGuard));
    setMessage("", "");
    return currentUser
      .getIdToken(true)
      .then(function (token) {
        var localVoiceId = effectiveVoiceIdForScript(script);
        var payload = {
          scriptId: script.id,
          text: text,
          scriptTitle: script.title || "Untitled Script",
          voiceID: localVoiceId,
          backgroundID: effectiveBackgroundIdForScript(script),
          createdAt:
            script.createdAt && typeof script.createdAt.toDate === "function"
              ? script.createdAt.toDate().getTime() / 1000
              : Date.now() / 1000,
        };
        var vs = voiceSettingsForAudioJob(localVoiceId);
        if (vs) payload.voice_settings = vs;
        return backendRequest("/audio-jobs", token, payload).then(function (json) {
          if (!json || json.ok !== true || !json.jobId) {
            throw new Error("Audio job did not return a job id.");
          }
          return { token: token, jobId: json.jobId };
        });
      })
      .then(function (ctx) {
        return waitForAudioJob(script, ctx.jobId, effectiveBackgroundIdForScript(script), ctx.token);
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
                audioVoiceID: vId,
                audioBackgroundID: bId,
                audioContentHash: digest,
              },
              { merge: true }
            )
            .then(function () {
              setStoredGeneratedHash(script.id, digest);
              delete frozenAudioSettingsByScriptId[script.id];
            });
        });
      });
  }

  function normalizedWorkshopText(value) {
    return value == null ? "" : String(value);
  }

  function workshopHasAudioAffectingChanges() {
    if (!scriptWorkshopSnapshot || !scriptWorkshopDraft) return true;
    return (
      normalizedWorkshopText(scriptWorkshopDraft.text) !==
        normalizedWorkshopText(scriptWorkshopSnapshot.text) ||
      normalizedWorkshopText(scriptWorkshopDraft.voiceID).trim() !==
        normalizedWorkshopText(scriptWorkshopSnapshot.voiceID).trim() ||
      normalizedWorkshopText(scriptWorkshopDraft.backgroundID).trim() !==
        normalizedWorkshopText(scriptWorkshopSnapshot.backgroundID).trim()
    );
  }

  function workshopHasTitleChange() {
    if (!scriptWorkshopSnapshot || !scriptWorkshopDraft) return false;
    return (
      (scriptWorkshopDraft.title || "").trim() !== (scriptWorkshopSnapshot.title || "").trim()
    );
  }

  function getScriptWorkshopContextScript() {
    if (!scriptWorkshopDraft) return null;
    if (scriptWorkshopIsPremadeEditor) {
      return {
        id: scriptWorkshopPremadeId || "premade-draft",
        title: scriptWorkshopDraft.title || "",
        text: scriptWorkshopDraft.text || "",
        voiceID: scriptWorkshopDraft.voiceID || "",
        backgroundID: scriptWorkshopDraft.backgroundID || "",
        audioURL: scriptWorkshopDraft.audioURL || "",
        categoryID: scriptWorkshopDraft.categoryID || "",
      };
    }
    if (!scriptWorkshopOpenId) return null;
    return (
      currentScripts.find(function (s) {
        return s.id === scriptWorkshopOpenId;
      }) || null
    );
  }

  function resolvePremadeScriptText(premade) {
    if (
      typeof PremadeScriptTextsWeb !== "undefined" &&
      PremadeScriptTextsWeb &&
      typeof PremadeScriptTextsWeb.resolve === "function"
    ) {
      return PremadeScriptTextsWeb.resolve(premade);
    }
    return (premade && premade.scriptText) || "";
  }

  function premadeMyLibraryDraftFromPremade(premade) {
    return {
      title: premade.title || "",
      text: resolvePremadeScriptText(premade),
      voiceID: premadePublishedVoiceId(premade),
      backgroundID: premadePublishedBackgroundId(premade),
      audioURL: (premade.audioURL && String(premade.audioURL).trim()) || "",
      categoryID: premade.categoryID || "",
    };
  }

  function showScriptWorkshopBackdrop() {
    var backdrop = document.getElementById("script-workshop-backdrop");
    var body = document.getElementById("script-workshop-body");
    var footer = document.getElementById("script-workshop-footer");
    if (!backdrop || !body || !footer) return false;
    backdrop.hidden = false;
    backdrop.setAttribute("aria-hidden", "false");
    lockAppBodyScroll();
    return true;
  }

  function openPremadeWorkshop(premade) {
    if (!premade) return;
    if (!requireWebPaidTier(WEB_PAID_FEATURE_COPY.editScript)) return;
    scriptWorkshopOpenId = null;
    scriptWorkshopIsNewDraft = false;
    scriptWorkshopIsPremadeEditor = true;
    scriptWorkshopPremadeId = premade.id;
    scriptWorkshopDraft = premadeMyLibraryDraftFromPremade(premade);
    scriptWorkshopSnapshot = JSON.parse(JSON.stringify(scriptWorkshopDraft));
    if (!showScriptWorkshopBackdrop()) {
      setMessage("Could not open editor.", "error");
      return;
    }
    renderScriptWorkshop();
    if (!document.getElementById("script-workshop-primary")) {
      closeScriptWorkshop();
      setMessage("Could not open editor.", "error");
    }
  }

  function getWorkshopPrimaryAction(script) {
    var hasText = scriptWorkshopDraft && (scriptWorkshopDraft.text || "").trim();
    if (scriptWorkshopIsPremadeEditor) {
      if (workshopHasAudioAffectingChanges()) {
        return hasText ? "saveAndGenerate" : "none";
      }
      return hasText ? "saveOnly" : "none";
    }
    if (scriptWorkshopIsNewDraft) {
      return hasText ? "saveAndGenerate" : "none";
    }
    if (!scriptHasPlayableAudio(script)) {
      return hasText ? "saveAndGenerate" : "none";
    }
    if (workshopHasAudioAffectingChanges()) {
      return hasText ? "saveAndGenerate" : "none";
    }
    if (workshopHasTitleChange()) {
      return "saveOnly";
    }
    return "saveAs";
  }

  function workshopPrimaryButtonTitle(script, action) {
    if (scriptWorkshopIsPremadeEditor) {
      if (action === "saveOnly") return "Save to My Library";
      if (action === "saveAndGenerate") return "Save and Generate";
      return "Save to My Library";
    }
    if (action === "saveOnly") return "Save";
    if (action === "saveAs") return "Save as…";
    if (action === "saveAndGenerate") {
      return scriptHasPlayableAudio(script) ? "Save and Regenerate" : "Save and Generate";
    }
    return "Save";
  }

  function closeScriptWorkshop() {
    closeScriptWorkshopSaveMenu();
    closeScriptWorkshopSaveAsModal();
    scriptWorkshopOpenId = null;
    scriptWorkshopDraft = null;
    scriptWorkshopSnapshot = null;
    scriptWorkshopIsNewDraft = false;
    scriptWorkshopIsPremadeEditor = false;
    scriptWorkshopPremadeId = null;
    var backdrop = document.getElementById("script-workshop-backdrop");
    if (backdrop) {
      backdrop.hidden = true;
      backdrop.setAttribute("aria-hidden", "true");
    }
    unlockAppBodyScroll();
  }

  var scriptWorkshopSaveMenuCloseHandler = null;

  function closeScriptWorkshopSaveMenu() {
    var menu = document.getElementById("script-workshop-save-menu");
    if (menu) menu.hidden = true;
    if (scriptWorkshopSaveMenuCloseHandler) {
      document.removeEventListener("click", scriptWorkshopSaveMenuCloseHandler);
      scriptWorkshopSaveMenuCloseHandler = null;
    }
  }

  function getScriptWorkshopMenuItems(script) {
    if (scriptWorkshopIsPremadeEditor) return [];
    if (scriptWorkshopIsNewDraft) {
      return [{ action: "saveAsIs", label: "Save as is" }];
    }
    var items = [{ action: "saveAs", label: "Save as…" }];
    if (
      scriptHasPlayableAudio(script) &&
      workshopHasTitleChange() &&
      !workshopHasAudioAffectingChanges()
    ) {
      items.push({ action: "saveOnly", label: "Save only" });
    }
    return items;
  }

  function scriptWorkshopChevronHtml(script, primaryAction) {
    if (scriptWorkshopIsPremadeEditor) return "";
    if (primaryAction === "saveAs") return "";
    var items = getScriptWorkshopMenuItems(script);
    if (!items.length) return "";
    if (items.length === 1 && items[0].action === "saveAs") {
      return (
        '<button type="button" class="script-workshop-chevron" id="script-workshop-chevron" title="Save as…">▾</button>'
      );
    }
    var chevronTitle = scriptWorkshopIsNewDraft ? "Save as is" : "More save options";
    var menuItems = items
      .map(function (it) {
        return (
          '<button type="button" class="library-dropdown-item script-workshop-menu-item" data-workshop-menu-action="' +
          escapeHtml(it.action) +
          '">' +
          escapeHtml(it.label) +
          "</button>"
        );
      })
      .join("");
    return (
      '<div class="script-workshop-chevron-wrap">' +
      '<button type="button" class="script-workshop-chevron" id="script-workshop-chevron" title="' +
      escapeHtml(chevronTitle) +
      '">▾</button>' +
      '<div id="script-workshop-save-menu" class="script-workshop-save-menu library-create-dropdown" hidden>' +
      menuItems +
      "</div>" +
      "</div>"
    );
  }

  function runScriptWorkshopMenuAction(script, action) {
    closeScriptWorkshopSaveMenu();
    if (action === "saveAsIs" || action === "saveOnly") {
      persistScriptWorkshop(script, { closeAfter: true, generateAfter: false });
      return;
    }
    if (action === "saveAs") {
      openScriptWorkshopSaveAsModal(script);
    }
  }

  function toggleScriptWorkshopSaveMenu() {
    var menu = document.getElementById("script-workshop-save-menu");
    if (!menu) return;
    var willOpen = menu.hidden;
    closeScriptWorkshopSaveMenu();
    if (!willOpen) return;
    menu.hidden = false;
    scriptWorkshopSaveMenuCloseHandler = function () {
      closeScriptWorkshopSaveMenu();
    };
    setTimeout(function () {
      document.addEventListener("click", scriptWorkshopSaveMenuCloseHandler);
    }, 0);
  }

  function bindScriptWorkshopSaveMenu(script, primaryAction) {
    closeScriptWorkshopSaveMenu();
    var chev = document.getElementById("script-workshop-chevron");
    if (!chev) return;
    var items = getScriptWorkshopMenuItems(script);
    if (items.length === 1 && items[0].action === "saveAs") {
      chev.onclick = function (ev) {
        ev.stopPropagation();
        openScriptWorkshopSaveAsModal(script);
      };
      return;
    }
    chev.onclick = function (ev) {
      ev.stopPropagation();
      toggleScriptWorkshopSaveMenu();
    };
    document.querySelectorAll("[data-workshop-menu-action]").forEach(function (btn) {
      btn.onclick = function (ev) {
        ev.stopPropagation();
        runScriptWorkshopMenuAction(script, btn.getAttribute("data-workshop-menu-action"));
      };
    });
  }

  var scriptWorkshopSaveAsContext = null;

  function closeScriptWorkshopSaveAsModal() {
    var backdrop = document.getElementById("script-save-as-backdrop");
    if (backdrop) {
      backdrop.hidden = true;
      backdrop.setAttribute("aria-hidden", "true");
    }
    scriptWorkshopSaveAsContext = null;
  }

  function openScriptWorkshopSaveAsModal(script) {
    if (!script || !scriptWorkshopDraft) return;
    scriptWorkshopSaveAsContext = script;
    var backdrop = document.getElementById("script-save-as-backdrop");
    var input = document.getElementById("script-save-as-title-input");
    if (!backdrop || !input) return;
    var suggested = uniqueScriptTitle((scriptWorkshopDraft.title || script.title || "Script").trim());
    input.value = suggested;
    backdrop.hidden = false;
    backdrop.setAttribute("aria-hidden", "false");
    requestAnimationFrame(function () {
      try {
        input.focus();
        input.select();
      } catch (_e) {}
    });
  }

  function renderScriptWorkshop() {
    var body = document.getElementById("script-workshop-body");
    var footer = document.getElementById("script-workshop-footer");
    if (!body || !footer || !scriptWorkshopDraft) return;
    var script = getScriptWorkshopContextScript();
    if (!script) return;
    var showFmtPref = readShowAudioTagsFormattingPreference();
    var rawText = scriptWorkshopDraft.text || "";
    var hasAudioTagsInScript = containsAudioTagsForScript(rawText);
    var canEditTextBody = !(hasAudioTagsInScript && !showFmtPref);
    var bodyFieldHtml;
    if (hasAudioTagsInScript && !showFmtPref) {
      bodyFieldHtml =
        '<p class="app-muted" style="margin:0 0 0.4rem;">Turn on <strong>Show formatting</strong> to edit TTS tags.</p>' +
        '<div class="script-inline-preview-scroll"><pre class="script-inline-preview app-card-text">' +
        escapeHtml(stripAudioTagsForDisplay(rawText) || "(No text)") +
        "</pre></div>";
    } else {
      bodyFieldHtml =
        '<textarea id="script-workshop-text" class="script-workshop-textarea" rows="12" maxlength="50000">' +
        escapeHtml(rawText) +
        "</textarea>";
    }
    var formatToggleHtml = "";
    if (hasAudioTagsInScript) {
      formatToggleHtml =
        '<label class="script-inline-show-format">' +
        '<input type="checkbox" id="script-workshop-format-toggle"' +
        (showFmtPref ? " checked" : "") +
        '> Show formatting <span class="app-muted">(TTS tags)</span></label>';
    }
    var primaryAction = getWorkshopPrimaryAction(script);
    var primaryTitle = workshopPrimaryButtonTitle(script, primaryAction);
    var primaryDisabled = primaryAction === "none";
    var chevronHtml = scriptWorkshopChevronHtml(script, primaryAction);
    body.innerHTML =
      '<p class="script-workshop-section-label">How you\'ll listen</p>' +
      '<div class="script-workshop-media-row">' +
      '<button type="button" class="app-btn app-btn-secondary" id="script-workshop-voice">Voice: ' +
      escapeHtml(workshopVoiceLabelFromDraft(scriptWorkshopDraft)) +
      "</button>" +
      '<button type="button" class="app-btn app-btn-secondary" id="script-workshop-background">Background: ' +
      escapeHtml(workshopBackgroundLabelFromDraft(scriptWorkshopDraft)) +
      "</button>" +
      "</div>" +
      '<label class="script-inline-field-label" for="script-workshop-title">Title</label>' +
      '<input type="text" id="script-workshop-title" class="script-workshop-title-input" maxlength="120" value="' +
      escapeHtml(scriptWorkshopDraft.title || "") +
      '">' +
      '<div class="script-workshop-toolbar">' +
      formatToggleHtml +
      '<button type="button" class="app-btn app-btn-secondary" id="script-workshop-ai-edit">✨ Edit with AI</button>' +
      "</div>" +
      '<label class="script-inline-field-label">Script</label>' +
      bodyFieldHtml;
    footer.innerHTML =
      '<div class="script-workshop-save-row">' +
      '<button type="button" class="app-btn app-btn-primary script-workshop-primary' +
      (primaryAction === "saveAndGenerate" ? " script-workshop-primary-generate" : "") +
      '"' +
      (primaryDisabled ? " disabled" : "") +
      ' id="script-workshop-primary">' +
      escapeHtml(primaryTitle) +
      "</button>" +
      chevronHtml +
      "</div>";
    var titleInput = document.getElementById("script-workshop-title");
    var textInput = document.getElementById("script-workshop-text");
    if (titleInput) {
      titleInput.oninput = function () {
        scriptWorkshopDraft.title = titleInput.value;
        renderScriptWorkshopFooterOnly(script);
      };
    }
    if (textInput) {
      textInput.oninput = function () {
        scriptWorkshopDraft.text = textInput.value;
        renderScriptWorkshopFooterOnly(script);
      };
    }
    var fmtToggle = document.getElementById("script-workshop-format-toggle");
    if (fmtToggle) {
      fmtToggle.onchange = function () {
        try {
          localStorage.setItem(WEB_SHOW_AUDIO_TAGS_STORAGE_KEY, fmtToggle.checked ? "1" : "0");
        } catch (_e) {}
        renderScriptWorkshop();
      };
    }
    document.getElementById("script-workshop-voice").onclick = function () {
      openMediaPicker({ kind: "workshop", field: "voice" });
    };
    document.getElementById("script-workshop-background").onclick = function () {
      openMediaPicker({ kind: "workshop", field: "background" });
    };
    var aiBtn = document.getElementById("script-workshop-ai-edit");
    if (aiBtn) {
      aiBtn.disabled = !canEditTextBody;
      aiBtn.onclick = function () {
        openAITextEditModal(
          scriptWorkshopIsPremadeEditor ? scriptWorkshopPremadeId : scriptWorkshopOpenId
        );
      };
    }
    document.getElementById("script-workshop-primary").onclick = function () {
      runScriptWorkshopPrimaryAction(script);
    };
    bindScriptWorkshopSaveMenu(script, primaryAction);
  }

  function renderScriptWorkshopFooterOnly(script) {
    var footer = document.getElementById("script-workshop-footer");
    if (!footer || !scriptWorkshopDraft) return;
    var primaryAction = getWorkshopPrimaryAction(script);
    var primaryTitle = workshopPrimaryButtonTitle(script, primaryAction);
    var primaryDisabled = primaryAction === "none";
    var chevronHtml = scriptWorkshopChevronHtml(script, primaryAction);
    footer.innerHTML =
      '<div class="script-workshop-save-row">' +
      '<button type="button" class="app-btn app-btn-primary script-workshop-primary' +
      (primaryAction === "saveAndGenerate" ? " script-workshop-primary-generate" : "") +
      '"' +
      (primaryDisabled ? " disabled" : "") +
      ' id="script-workshop-primary">' +
      escapeHtml(primaryTitle) +
      "</button>" +
      chevronHtml +
      "</div>";
    document.getElementById("script-workshop-primary").onclick = function () {
      runScriptWorkshopPrimaryAction(script);
    };
    bindScriptWorkshopSaveMenu(script, primaryAction);
  }

  function openScriptWorkshop(scriptId, isNewDraft) {
    var script = currentScripts.find(function (s) {
      return s.id === scriptId;
    });
    if (!script || scriptIsSharedListenOnly(script)) return;
    if (isWebFreeReadOnlyLibraryScript(script)) {
      promptWebPaidUpgrade(WEB_PAID_FEATURE_COPY.editScript);
      return;
    }
    scriptWorkshopOpenId = scriptId;
    scriptWorkshopIsNewDraft = !!isNewDraft;
    scriptWorkshopIsPremadeEditor = false;
    scriptWorkshopPremadeId = null;
    scriptWorkshopDraft = {
      title: script.title || "",
      text: script.text || "",
      voiceID: script.voiceID || "",
      backgroundID: script.backgroundID || "",
    };
    scriptWorkshopSnapshot = JSON.parse(JSON.stringify(scriptWorkshopDraft));
    if (!showScriptWorkshopBackdrop()) {
      setMessage("Could not open editor.", "error");
      return;
    }
    renderScriptWorkshop();
    if (!document.getElementById("script-workshop-primary")) {
      closeScriptWorkshop();
      setMessage("Could not open editor.", "error");
    }
  }

  function runScriptWorkshopPrimaryAction(script) {
    var action = getWorkshopPrimaryAction(script);
    if (action === "none") return;
    if (scriptWorkshopIsPremadeEditor) {
      persistPremadeWorkshop({
        closeAfter: true,
        generateAfter: action === "saveAndGenerate",
      });
      return;
    }
    if (action === "saveAs") {
      openScriptWorkshopSaveAsModal(script);
      return;
    }
    persistScriptWorkshop(script, {
      closeAfter: true,
      generateAfter: action === "saveAndGenerate",
    });
  }

  function persistPremadeWorkshop(options) {
    options = options || {};
    if (!currentUser || !scriptWorkshopDraft) return;
    var title = (scriptWorkshopDraft.title || "").trim();
    if (!title) {
      setMessage("Enter a title.", "error");
      return;
    }
    var voiceID = (scriptWorkshopDraft.voiceID || "").trim();
    var backgroundID = (scriptWorkshopDraft.backgroundID || "").trim();
    var text = scriptWorkshopDraft.text || "";
    var audioURL = options.generateAfter ? "" : (scriptWorkshopDraft.audioURL || "").trim();
    var docRef = scriptCollection(currentUser.uid).doc();
    setMessage("Saving…", "");
    scriptCollection(currentUser.uid)
      .doc(docRef.id)
      .set({
        title: title,
        text: text,
        createdAt: firebase.firestore.Timestamp.now(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        audioURL: audioURL,
        voiceID: voiceID,
        backgroundID: backgroundID,
        audioCreatedAt: audioURL ? firebase.firestore.FieldValue.serverTimestamp() : null,
        categoryID: scriptWorkshopDraft.categoryID || "",
      })
      .then(function () {
        function finishSave() {
          if (options.closeAfter) closeScriptWorkshop();
          activeLibraryTab = "my-library";
          renderLibrarySubtab();
          if (options.generateAfter) {
            var saved = {
              id: docRef.id,
              title: title,
              text: text,
              voiceID: voiceID,
              backgroundID: backgroundID,
              audioURL: "",
              categoryID: scriptWorkshopDraft.categoryID || "",
            };
            enqueueBackgroundAudioGeneration(saved, { showStartingBanner: true });
            showAppBanner(
              "Saved to My Library",
              '"' + title + '" is saved. Generating audio in the background.',
              "success",
              { duration: 4500 }
            );
          } else {
            showAppBanner(
              "Saved to My Library",
              '"' + title + '" is now in My Library.',
              "success",
              { duration: 4500 }
            );
            renderScripts(currentScripts);
          }
        }
        if (audioURL && text) {
          return scriptContentSha256Hex({
            text: text,
            voiceID: voiceID,
            backgroundID: backgroundID,
          })
            .then(function (digest) {
              setStoredGeneratedHash(docRef.id, digest);
              return scriptCollection(currentUser.uid)
                .doc(docRef.id)
                .set({ audioContentHash: digest }, { merge: true });
            })
            .then(finishSave);
        }
        finishSave();
      })
      .catch(function (e) {
        setMessage(e.message || "Could not save to My Library.", "error");
      });
  }

  function confirmScriptWorkshopSaveAs() {
    var script = scriptWorkshopSaveAsContext;
    if (!script || !scriptWorkshopDraft || !currentUser) return;
    var input = document.getElementById("script-save-as-title-input");
    var newTitle = input ? String(input.value || "").trim() : "";
    if (!newTitle) {
      newTitle = uniqueScriptTitle((scriptWorkshopDraft.title || script.title || "Script").trim());
    }
    if (!newTitle) {
      setMessage("Enter a title for the new script.", "error");
      return;
    }
    var docRef = scriptCollection(currentUser.uid).doc();
    var payload = buildWorkshopFirestorePayload(scriptWorkshopDraft);
    payload.title = newTitle;
    payload.createdAt = firebase.firestore.Timestamp.now();
    closeScriptWorkshopSaveAsModal();
    setMessage("Saving…", "");
    scriptCollection(currentUser.uid)
      .doc(docRef.id)
      .set(payload)
      .then(function () {
        closeScriptWorkshop();
        setMessage('Saved as "' + newTitle + '".', "success");
      })
      .catch(function (e) {
        setMessage(e.message || "Could not save script.", "error");
      });
  }

  function buildWorkshopFirestorePayload(draft) {
    return {
      title: (draft.title || "").trim() || "Untitled Script",
      text: draft.text || "",
      voiceID: (draft.voiceID || "").trim(),
      backgroundID: (draft.backgroundID || "").trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
  }

  function persistScriptWorkshop(script, options) {
    options = options || {};
    if (!currentUser || !scriptWorkshopDraft) return;
    var title = (scriptWorkshopDraft.title || "").trim();
    if (!title) {
      setMessage("Enter a title.", "error");
      return;
    }
    var payload = buildWorkshopFirestorePayload(scriptWorkshopDraft);
    setMessage("Saving…", "");
    scriptCollection(currentUser.uid)
      .doc(script.id)
      .set(payload, { merge: true })
      .then(function () {
        var ix = currentScripts.findIndex(function (s) {
          return s.id === script.id;
        });
        if (ix >= 0) {
          currentScripts[ix].title = payload.title;
          currentScripts[ix].text = payload.text;
          currentScripts[ix].voiceID = payload.voiceID;
          currentScripts[ix].backgroundID = payload.backgroundID;
        }
        var updated = currentScripts[ix] || script;
        if (options.closeAfter) closeScriptWorkshop();
        if (options.generateAfter) {
          generateAudioForScript(updated, { skipHashCheck: true });
        } else {
          setMessage("Script saved.", "success");
          renderScripts(currentScripts);
        }
      })
      .catch(function (e) {
        setMessage(e.message || "Could not save script.", "error");
      });
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

  function formatGenerationElapsed(totalSeconds) {
    var m = Math.floor(totalSeconds / 60);
    var s = totalSeconds % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function ensureScriptWorkOverlay() {
    var overlay = document.getElementById("script-work-overlay");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "script-work-overlay";
    overlay.className = "script-work-overlay";
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
      '<div class="script-work-overlay-backdrop" aria-hidden="true"></div>' +
      '<div class="script-work-overlay-card" role="status">' +
      '<div class="script-work-overlay-spinner" aria-hidden="true"></div>' +
      '<p id="script-work-overlay-title" class="script-work-overlay-title">Generating your script...</p>' +
      '<p id="script-work-overlay-detail" class="script-work-overlay-detail">Long scripts can take up to 5 minutes.</p>' +
      '<p id="script-work-overlay-elapsed" class="script-work-overlay-elapsed">0:00</p>' +
      "</div>";
    document.body.appendChild(overlay);
    return overlay;
  }

  function updateScriptWorkOverlayElapsed() {
    var el = document.getElementById("script-work-overlay-elapsed");
    if (!el || !scriptWorkOverlayStartedAt) return;
    var secs = Math.max(0, Math.floor((Date.now() - scriptWorkOverlayStartedAt) / 1000));
    el.textContent = formatGenerationElapsed(secs);
  }

  /** Centered progress box (iOS SurveyView loadingOverlay parity). */
  function showScriptWorkOverlay(options) {
    options = options || {};
    var title = options.title || "Generating your script...";
    var detail =
      options.detail != null ? options.detail : "Long scripts can take up to 5 minutes.";
    var showTimer = options.showTimer !== false;

    var overlay = ensureScriptWorkOverlay();
    var titleEl = document.getElementById("script-work-overlay-title");
    var detailEl = document.getElementById("script-work-overlay-detail");
    var elapsedEl = document.getElementById("script-work-overlay-elapsed");
    if (titleEl) titleEl.textContent = title;
    if (detailEl) {
      detailEl.textContent = detail;
      detailEl.hidden = !detail;
    }
    if (elapsedEl) {
      elapsedEl.hidden = !showTimer;
      elapsedEl.textContent = "0:00";
    }

    scriptWorkOverlayStartedAt = Date.now();
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("script-work-overlay-open");

    updateScriptWorkOverlayElapsed();
    if (scriptWorkOverlayTimerId) clearInterval(scriptWorkOverlayTimerId);
    if (showTimer) {
      scriptWorkOverlayTimerId = setInterval(updateScriptWorkOverlayElapsed, 1000);
    }
  }

  function stopScriptWorkOverlay() {
    if (scriptWorkOverlayTimerId) {
      clearInterval(scriptWorkOverlayTimerId);
      scriptWorkOverlayTimerId = null;
    }
    scriptWorkOverlayStartedAt = 0;
    var overlay = document.getElementById("script-work-overlay");
    if (overlay) {
      overlay.hidden = true;
      overlay.setAttribute("aria-hidden", "true");
    }
    document.body.classList.remove("script-work-overlay-open");
  }

  function updateGenerationOverlayElapsed() {
    var el = document.getElementById("audio-generation-overlay-elapsed");
    if (!el || !generationOverlayStartedAt) return;
    var secs = Math.max(0, Math.floor((Date.now() - generationOverlayStartedAt) / 1000));
    el.textContent = "Elapsed: " + formatGenerationElapsed(secs);
  }

  function showAudioGenerationOverlay(displayTitle) {
    generationOverlayStartedAt = Date.now();
    var overlay = document.getElementById("audio-generation-overlay");
    var titleEl = document.getElementById("audio-generation-overlay-script");
    if (titleEl) {
      var t = (displayTitle && String(displayTitle).trim()) || "";
      titleEl.textContent = t ? "\u201c" + t + "\u201d" : "";
    }
    if (overlay) {
      overlay.hidden = false;
      overlay.setAttribute("aria-hidden", "false");
    }
    updateGenerationOverlayElapsed();
    if (generationOverlayTimerId) clearInterval(generationOverlayTimerId);
    generationOverlayTimerId = setInterval(updateGenerationOverlayElapsed, 1000);
  }

  function stopAudioGenerationOverlay() {
    if (generationOverlayTimerId) {
      clearInterval(generationOverlayTimerId);
      generationOverlayTimerId = null;
    }
    generationOverlayStartedAt = 0;
    var overlay = document.getElementById("audio-generation-overlay");
    if (overlay) {
      overlay.hidden = true;
      overlay.setAttribute("aria-hidden", "true");
    }
  }

  function refreshOneScriptFromCloud(scriptId) {
    if (!currentUser || !scriptId) return;
    var existing = currentScripts.find(function (s) {
      return s.id === scriptId;
    });
    if (existing && scriptIsSharedListenOnly(existing)) {
      var shareToken = existing.sharedFrom && existing.sharedFrom.shareToken;
      if (!shareToken) return;
      db.collection("users")
        .doc(currentUser.uid)
        .collection("incomingSharedScripts")
        .doc(shareToken)
        .get()
        .then(function (snap) {
          if (!snap.exists) {
            setMessage("Shared audio is no longer available.", "error");
            return;
          }
          setMessage("Shared script refreshed from the cloud.", "success");
        })
        .catch(function (e) {
          setMessage(e.message || "Could not refresh shared script.", "error");
        });
      return;
    }
    scriptCollection(currentUser.uid)
      .doc(scriptId)
      .get()
      .then(function (snap) {
        if (!snap.exists) {
          setMessage("Script not found in the cloud.", "error");
          return;
        }
        var data = snap.data() || {};
        var idx = currentScripts.findIndex(function (s) {
          return s.id === scriptId;
        });
        if (idx < 0) return;
        var cur = currentScripts[idx];
        currentScripts[idx] = {
          id: cur.id,
          title: data.title != null ? data.title : cur.title,
          text: data.text != null ? data.text : cur.text,
          audioURL: data.audioURL != null ? data.audioURL : cur.audioURL || "",
          voiceID: data.voiceID != null ? data.voiceID : cur.voiceID || "",
          backgroundID: data.backgroundID != null ? data.backgroundID : cur.backgroundID || "",
          categoryID: data.categoryID != null ? data.categoryID : cur.categoryID || "",
          createdAt: data.createdAt != null ? data.createdAt : cur.createdAt,
          updatedAt: data.updatedAt != null ? data.updatedAt : cur.updatedAt,
          audioContentHash:
            data.audioContentHash != null && String(data.audioContentHash).trim()
              ? String(data.audioContentHash).trim()
              : cur.audioContentHash || "",
          audioVoiceID:
            data.audioVoiceID != null && String(data.audioVoiceID).trim()
              ? String(data.audioVoiceID).trim()
              : cur.audioVoiceID || "",
          audioBackgroundID:
            data.audioBackgroundID != null && String(data.audioBackgroundID).trim()
              ? String(data.audioBackgroundID).trim()
              : cur.audioBackgroundID || "",
          audioCreatedAt: data.audioCreatedAt != null ? data.audioCreatedAt : cur.audioCreatedAt || null,
        };
        if (currentScripts[idx].audioContentHash && getStoredGeneratedHash(scriptId) !== currentScripts[idx].audioContentHash) {
          setStoredGeneratedHash(scriptId, currentScripts[idx].audioContentHash);
        }
        renderScripts(currentScripts);
        setMessage("Script refreshed from the cloud.", "");
      })
      .catch(function (e) {
        setMessage(e.message || "Could not refresh script.", "error");
      });
  }

  function scriptCardHtml(script, contentHashHex) {
    var isSharedListenOnly = scriptIsSharedListenOnly(script);
    var isFreeReadOnly = isWebFreeReadOnlyLibraryScript(script);
    var controlsReadOnly = isSharedListenOnly || isFreeReadOnly;
    var isBusy = isScriptBusy(script.id);
    var hasAudio = scriptHasPlayableAudio(script);
    var playingThis = activeAudioScriptId === script.id && activeAudio && !activeAudio.paused;
    var controlsExpanded = controlsExpandedForScript(script.id);
    var needsRegen = scriptNeedsAudioRegeneration(script, contentHashHex);
    var showSplit = showSplitEditGenerateOnCard(script, controlsReadOnly);
    var chevChar = controlsExpanded ? "▲" : "▼";
    var showShareLink = controlsExpanded && hasAudio && isWebCreatorTier() && !isSharedListenOnly;
    var audioMatchesCard = hasAudio && !needsRegen;
    var audioUrlStr = script.audioURL && String(script.audioURL).trim();
    var hostedAudio = !!(audioUrlStr && /^https?:\/\//i.test(audioUrlStr));
    var syncStatusLabel;
    var syncStatusClass = "script-card-sync-muted";
    if (isBusy) {
      syncStatusLabel = "Generating\u2026";
      syncStatusClass = "script-card-sync-busy";
    } else if (!hasAudio) {
      syncStatusLabel = "No audio yet";
    } else if (audioMatchesCard && hostedAudio) {
      syncStatusLabel = "Synced with cloud";
      syncStatusClass = "script-card-sync-ok";
    } else if (audioMatchesCard && !hostedAudio) {
      syncStatusLabel = "Audio on this device only";
    } else {
      syncStatusLabel = "Not synced with cloud \u2014 regeneration needed";
      syncStatusClass = "script-card-sync-warn";
    }
    var syncStatusHtml =
      '<div class="script-card-sync-row" role="status">' +
      '  <button type="button" class="script-card-sync-refresh" data-action="refresh-script" data-script-id="' +
      escapeHtml(script.id) +
      '" title="Reload this script from the cloud" aria-label="Refresh from cloud">\u21bb</button>' +
      '  <span class="' +
      syncStatusClass +
      '">' +
      (syncStatusClass === "script-card-sync-ok"
        ? '<span aria-hidden="true">\u2713</span> '
        : "") +
      escapeHtml(syncStatusLabel) +
      "</span>" +
      "</div>";
    var playPauseIcon = libraryTransportPlayPauseIconSvg(playingThis);
    var playlistIconSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15V6"/><path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/><path d="M12 12H3"/><path d="M16 6H3"/><path d="M12 18H3"/></svg>';

    var primaryActionsHtml = "";
    if (!controlsReadOnly) {
      if (showSplit) {
        if (isBusy) {
          primaryActionsHtml =
            '<button type="button" class="app-btn app-btn-secondary script-card-edit-primary" disabled>Generating\u2026</button>';
        } else {
          primaryActionsHtml =
            '<button type="button" class="app-btn app-btn-primary script-card-edit-primary" data-action="open-workshop" data-script-id="' +
            escapeHtml(script.id) +
            '">Edit</button>' +
            '<button type="button" class="app-btn script-card-generate-split" data-action="generate-audio" data-script-id="' +
            escapeHtml(script.id) +
            '">Generate</button>';
        }
      } else {
        primaryActionsHtml =
          '<button type="button" class="app-btn app-btn-primary script-card-edit-primary' +
          (isBusy ? " is-busy" : "") +
          '" data-action="open-workshop" data-script-id="' +
          escapeHtml(script.id) +
          '"' +
          (isBusy ? " disabled" : "") +
          ">Edit</button>";
      }
    }

    var audioSection = controlsExpanded
      ? '<div class="script-card-audio-section">' +
        (isSharedListenOnly
          ? '<p class="app-muted script-card-shared-note" style="margin:0 0 0.65rem;line-height:1.45;">Shared by ' +
            escapeHtml((script.sharedFrom && script.sharedFrom.senderDisplayName) || "someone") +
            ". Listen-only — you can play audio and add to playlists, but not edit or regenerate.</p>"
          : isFreeReadOnly
            ? '<p class="app-muted script-card-shared-note" style="margin:0 0 0.65rem;line-height:1.45;">Free plan: play and add to playlists. Upgrade to Starter or Creator to edit, change voice/background, or generate new audio.</p>'
            : "") +
        '<div class="script-card-voice-bg-grid script-card-voice-bg-readonly">' +
        '  <span class="script-card-media-chip"><span class="script-card-media-chip-label">Voice</span> ' +
        escapeHtml(storedVoiceDisplayNameForScript(script)) +
        "</span>" +
        '  <span class="script-card-media-chip"><span class="script-card-media-chip-label">Background</span> ' +
        escapeHtml(storedBackgroundDisplayNameForScript(script)) +
        "</span>" +
        "</div>" +
        '<div class="app-card-actions script-card-actions-bar">' +
        primaryActionsHtml +
        '  <button type="button" class="app-btn app-btn-secondary library-script-share-btn" data-action="add-to-playlist" data-script-id="' +
        escapeHtml(script.id) +
        '" title="Add to playlist"' +
        (!currentPlaylists.length ? " disabled" : "") +
        ' aria-label="Add to playlist">' +
        playlistIconSvg +
        "</button>" +
        (showShareLink
          ? '  <button type="button" class="app-btn app-btn-secondary library-script-share-btn" data-action="share-audio" data-script-id="' +
            escapeHtml(script.id) +
            '" title="Creator: share listen link">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></button>'
          : "") +
        "</div>" +
        "</div>"
      : "";
    var expandableHtml = '<div class="script-card-expandable">' + audioSection + "</div>";
    var footerHtml =
      '<div class="script-card-footer">' +
      syncStatusHtml +
      (controlsExpanded
        ? '  <button type="button" class="script-card-icon-btn script-card-icon-btn-delete script-card-footer-delete" data-action="delete" data-script-id="' +
          escapeHtml(script.id) +
          '" title="' +
          (isSharedListenOnly ? "Remove from library" : "Delete script") +
          '" aria-label="' +
          (isSharedListenOnly ? "Remove" : "Delete") +
          '">\u2715</button>'
        : "") +
      "</div>";
    var libraryChip = isSharedListenOnly
      ? '<span class="app-chip">Shared · ' +
        escapeHtml((script.sharedFrom && script.sharedFrom.senderDisplayName) || "Someone") +
        "</span>"
      : '<span class="app-chip">My Library</span>';
    var cardClass =
      "app-card library-script-card" + (controlsExpanded ? "" : " library-script-card--collapsed");
    return (
      '<article class="' +
      cardClass +
      '" data-script-id="' +
      escapeHtml(script.id) +
      '">' +
      '<div class="script-card-title-row">' +
      '  <div class="script-card-title-main">' +
      "    <h3>" +
      escapeHtml(script.title || "Untitled Script") +
      "</h3>" +
      '    <button type="button" class="script-card-play-btn"' +
      ' data-action="play-audio" data-script-id="' +
      escapeHtml(script.id) +
      '"' +
      (!hasAudio || isBusy ? " disabled" : "") +
      ' title="' +
      (playingThis ? "Pause" : "Play") +
      '" aria-label="' +
      (playingThis ? "Pause" : "Play") +
      '">' +
      playPauseIcon +
      "</button>" +
      "  </div>" +
      '  <div class="script-card-title-trail">' +
      '    <button type="button" class="library-card-chevron" data-action="toggle-controls" data-script-id="' +
      escapeHtml(script.id) +
      '" aria-expanded="' +
      (controlsExpanded ? "true" : "false") +
      '" title="' +
      (controlsExpanded ? "Collapse audio controls" : "Expand audio controls") +
      '">' +
      chevChar +
      "</button>" +
      "  </div>" +
      "</div>" +
      '<div class="app-card-meta-row">' +
      '<div class="app-card-meta">Created: ' +
      escapeHtml(formatDate(script.createdAt)) +
      "</div>" +
      libraryChip +
      "</div>" +
      expandableHtml +
      footerHtml +
      "</article>"
    );
  }

  function lockAppBodyScroll() {
    appBodyScrollLockCount += 1;
    if (appBodyScrollLockCount === 1) {
      appBodyScrollLockY = window.scrollY || window.pageYOffset || 0;
      document.documentElement.classList.add("fs-modal-scroll-lock");
      document.body.classList.add("fs-modal-scroll-lock");
      document.body.style.position = "fixed";
      document.body.style.top = "-" + appBodyScrollLockY + "px";
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
    }
  }

  function unlockAppBodyScroll() {
    appBodyScrollLockCount = Math.max(0, appBodyScrollLockCount - 1);
    if (appBodyScrollLockCount === 0) {
      document.documentElement.classList.remove("fs-modal-scroll-lock");
      document.body.classList.remove("fs-modal-scroll-lock");
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      window.scrollTo(0, appBodyScrollLockY);
    }
  }

  function isWebPaidTierForAI() {
    var tier = resolvedSubscriptionTier();
    return tier === "starter" || tier === "creator";
  }

  function catalogAccessTierFromData(data) {
    var raw =
      data && data.accessTier != null ? String(data.accessTier).trim().toLowerCase() : "";
    return raw === "paid" ? "paid" : "free";
  }

  function canAccessCatalogTier(accessTier) {
    if (!accessTier || accessTier === "free") return true;
    return isWebPaidTierForAI();
  }

  function filterPremadesByCatalogAccess(premades) {
    return (premades || []).filter(function (p) {
      return canAccessCatalogTier(p.accessTier || "free");
    });
  }

  function filterBackgroundsByCatalogAccess(backgrounds) {
    return (backgrounds || []).filter(function (b) {
      return canAccessCatalogTier(b.accessTier || "free");
    });
  }

  function bundledAppBackgroundTracks() {
    return availableBackgrounds
      .filter(function (b) {
        return b.id !== "bg-none";
      })
      .map(function (b) {
        return {
          id: b.id,
          name: b.name,
          categoryID: b.categoryID,
          file: b.file,
          accessTier: "free",
          isCloudCatalog: false,
        };
      });
  }

  function allAppBackgroundTracksIncludingCloud() {
    var bundled = bundledAppBackgroundTracks();
    var bundledIds = {};
    bundled.forEach(function (b) {
      bundledIds[b.id] = true;
    });
    var cloud = filterBackgroundsByCatalogAccess(currentBackgroundCatalog).filter(function (b) {
      return !bundledIds[b.id];
    });
    return bundled.concat(cloud);
  }

  var WEB_FREE_TIER_VOICE_IDS = {
    lnieQLGTodpbhjpZtg1k: true,
    "8LVfoRdkh4zgjr8v5ObE": true,
    YgzytRZyVmEux6PCtJYB: true,
  };

  function isWebFreeTier() {
    return resolvedSubscriptionTier() === "free";
  }

  function isWebVoiceAvailableForGeneration(voiceID) {
    if (!isWebFreeTier()) return true;
    return !!WEB_FREE_TIER_VOICE_IDS[(voiceID || "").trim()];
  }

  function isWebBackgroundAvailableForGeneration(backgroundID) {
    if (!isWebFreeTier()) return true;
    var id = (backgroundID || "").trim();
    return !id || id === "bg-none";
  }

  function isWebFreeReadOnlyLibraryScript(script) {
    if (!isWebFreeTier() || scriptIsSharedListenOnly(script)) return false;
    var text = (script && script.text && String(script.text).trim()) || "";
    return !!text;
  }

  function webGenerationGateMessage(field) {
    if (field === "voice") {
      return "This voice requires Starter or Creator when generating audio. Upgrade to unlock all voices.";
    }
    if (field === "background") {
      return "Using background audio when generating requires Starter or Creator. Upgrade to unlock all backgrounds.";
    }
    return "This feature requires Starter or Creator.";
  }

  var WEB_PAID_FEATURE_COPY = {
    voiceClone:
      "Voice cloning is available with Starter or Creator. Upgrade to clone your own voice.",
    voiceUpload:
      "Uploading custom voice audio is available with Starter or Creator. Upgrade to add your own voices.",
    bgImport:
      "Importing background audio is available with Starter or Creator. Upgrade to add your own sounds.",
    libraryImport:
      "Importing audio files is available with Starter or Creator. Upgrade to add your own audio.",
    myVoices:
      "My Voices is available with Starter or Creator. Upgrade to save app voices here.",
    myAudio:
      "My Audio is available with Starter or Creator. Upgrade to import or pin your own sounds.",
    generate:
      "Generating or customizing audio requires Starter or Creator. Upgrade to create new audio.",
    editScript:
      "Upgrade to Starter or Creator to edit scripts, change voices, or generate new audio.",
    setDefault:
      "Setting a default voice or background requires Starter or Creator. Upgrade to customize your generation defaults.",
    offlineDownload:
      "Downloading premade audio for offline listening requires Starter or Creator.",
  };

  function promptWebPaidUpgrade(detail) {
    showAppBanner("Paid feature", detail || "This feature requires Starter or Creator.", "info", {
      duration: 7000,
    });
    openAccountModal();
  }

  function requireWebPaidTier(detail) {
    if (isWebPaidTierForAI()) return true;
    promptWebPaidUpgrade(detail);
    return false;
  }

  function syncPaidFeatureControls() {
    var paid = isWebPaidTierForAI();
    var lockedClass = "is-tier-locked";
    var controls = [
      document.getElementById("btn-voice-clone"),
      document.getElementById("btn-voice-record"),
      document.getElementById("btn-audio-import"),
      document.getElementById("library-dropdown-import"),
      document.getElementById("voices-tab-my"),
      document.getElementById("audio-tab-my"),
    ];
    controls.forEach(function (el) {
      if (!el) return;
      el.classList.toggle(lockedClass, !paid);
      el.setAttribute("aria-disabled", paid ? "false" : "true");
      el.title = paid ? "" : "Starter or Creator required";
    });
    if (!paid) {
      if (activeVoicesTab === "my-voices") activeVoicesTab = "app-voices";
      if (activeAudioPageTab === "my-audio") activeAudioPageTab = "app-audio";
    }
    syncAccountDefaultMediaLabels();
    if (activeAdminTab === "library") renderPremade();
    if (activeAdminTab === "audio") renderAudioPage();
  }

  function setAITextEditError(message, kind) {
    var el = document.getElementById("ai-text-edit-error");
    if (!el) return;
    el.textContent = message || "";
    el.className = "app-inline-msg" + (kind ? " is-" + kind : "");
  }

  function syncAITextEditModalUi() {
    var busyEl = document.getElementById("ai-text-edit-busy");
    var setupPanel = document.getElementById("ai-text-edit-setup-panel");
    var resultWrap = document.getElementById("ai-text-edit-result-wrap");
    var resultEl = document.getElementById("ai-text-edit-result");
    var primary = document.getElementById("ai-text-edit-primary");
    var cancel = document.getElementById("ai-text-edit-cancel");
    var tryAgain = document.getElementById("ai-text-edit-try-again");
    var instructions = document.getElementById("ai-text-edit-instructions");
    var quickBtns = document.querySelectorAll(".ai-text-edit-quick");
    var hasResult = !!aiTextEditPreview;
    if (busyEl) busyEl.hidden = !aiTextEditProcessing;
    if (setupPanel) setupPanel.hidden = hasResult || aiTextEditProcessing;
    if (resultWrap) resultWrap.hidden = !hasResult;
    if (resultEl && hasResult && resultEl.getAttribute("data-ai-seeded") !== "1") {
      resultEl.value = aiTextEditPreview;
      resultEl.setAttribute("data-ai-seeded", "1");
    }
    if (instructions) instructions.disabled = aiTextEditProcessing || hasResult;
    quickBtns.forEach(function (btn) {
      btn.disabled = aiTextEditProcessing || hasResult;
    });
    if (resultEl) resultEl.disabled = aiTextEditProcessing;
    if (primary) {
      if (aiTextEditProcessing) {
        primary.textContent = "Processing…";
        primary.disabled = true;
      } else if (hasResult) {
        primary.textContent = "Save to Library";
        primary.disabled = false;
      } else {
        primary.textContent = "Edit with AI";
        primary.disabled = !instructions || !String(instructions.value || "").trim();
      }
    }
    if (cancel) cancel.textContent = hasResult ? "Discard" : "Cancel";
    if (tryAgain) tryAgain.hidden = !hasResult || aiTextEditProcessing;
    if (hasResult && !aiTextEditProcessing && resultEl) {
      requestAnimationFrame(function () {
        try {
          resultEl.focus();
          resultEl.setSelectionRange(0, 0);
        } catch (_e) {}
      });
    }
  }

  function resetAITextEditModalState() {
    aiTextEditPreview = null;
    aiTextEditProcessing = false;
    var instructions = document.getElementById("ai-text-edit-instructions");
    var resultEl = document.getElementById("ai-text-edit-result");
    if (instructions) instructions.value = "";
    if (resultEl) {
      resultEl.value = "";
      resultEl.removeAttribute("data-ai-seeded");
    }
    setAITextEditError("", "");
    syncAITextEditModalUi();
  }

  function getInlineScriptCard(scriptId) {
    var list = document.getElementById("scripts-list");
    if (!list || !scriptId) return null;
    var cards = list.querySelectorAll(".library-script-card");
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].getAttribute("data-script-id") === scriptId) return cards[i];
    }
    return null;
  }

  function captureInlineScriptDraftsFromDom() {
    var list = document.getElementById("scripts-list");
    if (!list) return;
    var cards = list.querySelectorAll(".library-script-card");
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var scriptId = card.getAttribute("data-script-id");
      if (!scriptId || inlineScriptEditorOpenById[scriptId] !== true) continue;
      var titleEl = card.querySelector(".script-inline-title-input");
      var ta = card.querySelector(".script-inline-textarea");
      var previewEl = card.querySelector(".script-inline-preview");
      if (!titleEl && !ta && !previewEl) continue;
      var capturedTitle = titleEl ? String(titleEl.value || "") : "";
      var capturedText = ta
        ? String(ta.value || "")
        : previewEl
          ? String(previewEl.textContent || "")
          : "";
      var prior = inlineScriptDraftById[scriptId];
      if (prior && prior.text && String(prior.text).trim() && !String(capturedText).trim()) {
        capturedText = String(prior.text);
      }
      if (prior && prior.title && String(prior.title).trim() && !String(capturedTitle).trim()) {
        capturedTitle = String(prior.title);
      }
      inlineScriptDraftById[scriptId] = {
        title: capturedTitle,
        text: capturedText,
      };
    }
  }

  function clearInlineScriptDraft(scriptId) {
    if (!scriptId) return;
    delete inlineScriptDraftById[scriptId];
  }

  function inlineScriptDraftForScript(script) {
    if (!script || !script.id) return null;
    var draft = inlineScriptDraftById[script.id];
    if (draft) return draft;
    if (inlineScriptEditorOpenById[script.id] !== true) return null;
    var card = getInlineScriptCard(script.id);
    if (!card) return null;
    var titleEl = card.querySelector(".script-inline-title-input");
    var ta = card.querySelector(".script-inline-textarea");
    if (!titleEl && !ta) return null;
    return {
      title: titleEl ? String(titleEl.value || "") : "",
      text: ta ? String(ta.value || "") : "",
    };
  }

  function inlineScriptHasUnsavedChanges(script) {
    if (!script || !script.id || inlineScriptEditorOpenById[script.id] !== true) return false;
    var draft = inlineScriptDraftForScript(script);
    if (!draft) return false;
    var savedTitle = String(script.title || "").trim();
    var savedText = String(script.text || "").trim();
    return (
      String(draft.title || "").trim() !== savedTitle ||
      String(draft.text || "").trim() !== savedText
    );
  }

  function getInlineScriptEditorText(scriptId) {
    if (
      scriptWorkshopDraft &&
      (scriptWorkshopOpenId === scriptId ||
        (scriptWorkshopIsPremadeEditor && scriptWorkshopPremadeId === scriptId))
    ) {
      return scriptWorkshopDraft.text != null ? String(scriptWorkshopDraft.text) : "";
    }
    var draft = inlineScriptDraftById[scriptId];
    if (draft && draft.text != null) return String(draft.text);
    var card = getInlineScriptCard(scriptId);
    if (!card) {
      var script = currentScripts.find(function (s) {
        return s.id === scriptId;
      });
      return script && script.text ? String(script.text) : "";
    }
    var ta = card.querySelector(".script-inline-textarea");
    if (ta) return ta.value || "";
    var scriptFallback = currentScripts.find(function (s) {
      return s.id === scriptId;
    });
    return scriptFallback && scriptFallback.text ? String(scriptFallback.text) : "";
  }

  function getInlineScriptTitle(scriptId) {
    if (
      scriptWorkshopDraft &&
      (scriptWorkshopOpenId === scriptId ||
        (scriptWorkshopIsPremadeEditor && scriptWorkshopPremadeId === scriptId))
    ) {
      return (scriptWorkshopDraft.title || "").trim();
    }
    var card = getInlineScriptCard(scriptId);
    if (card) {
      var titleEl = card.querySelector(".script-inline-title-input");
      if (titleEl) return String(titleEl.value || "").trim();
    }
    var script = currentScripts.find(function (s) {
      return s.id === scriptId;
    });
    return script && script.title ? String(script.title).trim() : "";
  }

  function getAITextEditResultText() {
    var resultEl = document.getElementById("ai-text-edit-result");
    if (resultEl) return String(resultEl.value || "");
    return aiTextEditPreview ? String(aiTextEditPreview) : "";
  }

  function saveAITextEditToLibrary() {
    if (!aiTextEditContext || !currentUser || !aiTextEditContext.scriptId) return;
    var scriptId = aiTextEditContext.scriptId;
    var text = getAITextEditResultText().trim();
    var title = getInlineScriptTitle(scriptId);
    if (!title) {
      setAITextEditError("Title is required. Add a title in the script editor first.", "error");
      return;
    }
    if (!text) {
      setAITextEditError("Script text is required.", "error");
      return;
    }
    if (
      scriptWorkshopIsPremadeEditor &&
      scriptWorkshopPremadeId === scriptId &&
      scriptWorkshopDraft
    ) {
      scriptWorkshopDraft.title = title;
      scriptWorkshopDraft.text = text;
      closeAITextEditModal();
      renderScriptWorkshop();
      return;
    }
    if (aiTextEditProcessing) return;
    aiTextEditProcessing = true;
    setAITextEditError("Saving to your library…", "");
    syncAITextEditModalUi();
    var uid = currentUser.uid;
    scriptCollection(uid)
      .doc(scriptId)
      .set(
        {
          title: title,
          text: text,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      .then(function () {
        var ix = currentScripts.findIndex(function (s) {
          return s.id === scriptId;
        });
        if (ix >= 0) {
          currentScripts[ix].title = title;
          currentScripts[ix].text = text;
        }
        if (
          scriptWorkshopDraft &&
          (scriptWorkshopOpenId === scriptId ||
            (scriptWorkshopIsPremadeEditor && scriptWorkshopPremadeId === scriptId))
        ) {
          scriptWorkshopDraft.title = title;
          scriptWorkshopDraft.text = text;
        }
        delete inlineScriptEditorOpenById[scriptId];
        clearInlineScriptDraft(scriptId);
        closeAITextEditModal();
        setMessage("Script updated.", "success");
        if (
          scriptWorkshopOpenId === scriptId ||
          (scriptWorkshopIsPremadeEditor && scriptWorkshopPremadeId === scriptId)
        ) {
          renderScriptWorkshop();
        } else {
          renderScripts(currentScripts);
        }
      })
      .catch(function (e) {
        aiTextEditProcessing = false;
        setAITextEditError(e.message || "Could not save script.", "error");
        syncAITextEditModalUi();
      });
  }

  function closeAITextEditModal() {
    var backdrop = document.getElementById("ai-text-edit-backdrop");
    if (backdrop) backdrop.hidden = true;
    unlockAppBodyScroll();
    aiTextEditContext = null;
    aiTextEditProcessing = false;
    resetAITextEditModalState();
  }

  function openAITextEditModal(scriptId) {
    if (!scriptId) return;
    var scriptGuard = currentScripts.find(function (s) {
      return s.id === scriptId;
    });
    if (scriptGuard && scriptIsSharedListenOnly(scriptGuard)) {
      setMessage("Shared audio is listen-only and cannot be edited.", "info");
      return;
    }
    if (scriptGuard && isWebFreeReadOnlyLibraryScript(scriptGuard)) {
      promptWebPaidUpgrade(WEB_PAID_FEATURE_COPY.editScript);
      return;
    }
    var text = getInlineScriptEditorText(scriptId);
    if (!String(text || "").trim()) {
      setMessage("Add script text before using AI edit.", "error");
      return;
    }
    aiTextEditContext = { scriptId: scriptId };
    resetAITextEditModalState();
    var backdrop = document.getElementById("ai-text-edit-backdrop");
    if (backdrop) backdrop.hidden = false;
    lockAppBodyScroll();
    var instructions = document.getElementById("ai-text-edit-instructions");
    if (instructions) {
      requestAnimationFrame(function () {
        try {
          instructions.focus();
        } catch (_e) {}
      });
    }
  }

  function runAITextEditRequest() {
    if (!aiTextEditContext || !currentUser) return;
    if (aiTextEditProcessing) return;
    if (aiTextEditPreview) {
      saveAITextEditToLibrary();
      return;
    }
    if (!isWebPaidTierForAI()) {
      setAITextEditError("AI text editing is available on Starter and Creator.", "error");
      return;
    }
    var instructionsEl = document.getElementById("ai-text-edit-instructions");
    var instructions = instructionsEl ? String(instructionsEl.value || "").trim() : "";
    if (!instructions) {
      setAITextEditError("Please provide instructions for how to edit the text.", "error");
      return;
    }
    var text = getInlineScriptEditorText(aiTextEditContext.scriptId);
    if (!String(text || "").trim()) {
      setAITextEditError("Script text is empty.", "error");
      return;
    }
    aiTextEditProcessing = true;
    setAITextEditError("", "");
    syncAITextEditModalUi();
    currentUser
      .getIdToken(true)
      .then(function (token) {
        return backendRequest("/edit-text", token, {
          text: text,
          instructions: instructions,
        });
      })
      .then(function (json) {
        var content = json && json.content ? String(json.content) : "";
        if (!content.trim()) throw new Error("AI returned empty text.");
        aiTextEditPreview = content;
        aiTextEditProcessing = false;
        syncAITextEditModalUi();
      })
      .catch(function (e) {
        aiTextEditProcessing = false;
        var msg = e.message || "Could not edit text.";
        if (msg.indexOf("Starter or Creator") >= 0 || msg.indexOf("requires a Starter") >= 0) {
          setAITextEditError("AI text editing is available on Starter and Creator.", "error");
        } else {
          setAITextEditError(msg, "error");
        }
        syncAITextEditModalUi();
      });
  }

  function retryAITextEdit() {
    var resultEl = document.getElementById("ai-text-edit-result");
    if (resultEl) {
      resultEl.value = "";
      resultEl.removeAttribute("data-ai-seeded");
    }
    aiTextEditPreview = null;
    setAITextEditError("", "");
    syncAITextEditModalUi();
    var instructions = document.getElementById("ai-text-edit-instructions");
    if (instructions) {
      try {
        instructions.focus();
      } catch (_e) {}
    }
  }

  function bindAITextEditModal() {
    var cancel = document.getElementById("ai-text-edit-cancel");
    var primary = document.getElementById("ai-text-edit-primary");
    var tryAgain = document.getElementById("ai-text-edit-try-again");
    var instructions = document.getElementById("ai-text-edit-instructions");
    var backdrop = document.getElementById("ai-text-edit-backdrop");
    if (cancel) cancel.addEventListener("click", closeAITextEditModal);
    if (primary) primary.addEventListener("click", runAITextEditRequest);
    if (tryAgain) tryAgain.addEventListener("click", retryAITextEdit);
    if (instructions) {
      instructions.addEventListener("input", function () {
        if (!aiTextEditPreview && !aiTextEditProcessing) syncAITextEditModalUi();
      });
    }
    document.querySelectorAll(".ai-text-edit-quick").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (aiTextEditProcessing) return;
        var next = btn.getAttribute("data-ai-instructions") || "";
        if (instructions) instructions.value = next;
        aiTextEditPreview = null;
        setAITextEditError("", "");
        syncAITextEditModalUi();
        try {
          instructions.focus();
        } catch (_e) {}
      });
    });
    if (backdrop) {
      backdrop.addEventListener("click", function (ev) {
        if (ev.target && ev.target.id === "ai-text-edit-backdrop") closeAITextEditModal();
      });
    }
  }

  function bindScriptListFormattingToggle() {
    var list = document.getElementById("scripts-list");
    if (!list || list.dataset.scriptFormatToggleBound === "1") return;
    list.dataset.scriptFormatToggleBound = "1";
    list.addEventListener("change", function (ev) {
      var tgt = ev.target;
      if (!tgt || tgt.getAttribute("data-role") !== "script-formatting-toggle") return;
      try {
        localStorage.setItem(WEB_SHOW_AUDIO_TAGS_STORAGE_KEY, tgt.checked ? "1" : "0");
      } catch (_e) {}
      renderScripts(currentScripts);
    });
  }

  var inlineScriptEditorInputDebounce = null;
  function bindScriptListInlineEditorInput() {
    var list = document.getElementById("scripts-list");
    if (!list || list.dataset.scriptInlineInputBound === "1") return;
    list.dataset.scriptInlineInputBound = "1";
    list.addEventListener("input", function (ev) {
      var tgt = ev.target;
      if (!tgt) return;
      var isTitle = tgt.getAttribute("data-script-inline-field") === "title";
      var isText = tgt.classList && tgt.classList.contains("script-inline-textarea");
      if (!isTitle && !isText) return;
      var card = tgt.closest(".library-script-card");
      if (!card) return;
      if (!card.getAttribute("data-script-id")) return;
      clearTimeout(inlineScriptEditorInputDebounce);
      inlineScriptEditorInputDebounce = setTimeout(function () {
        captureInlineScriptDraftsFromDom();
        renderScripts(currentScripts);
      }, 250);
    });
  }

  function saveInlineScript(script) {
    if (!currentUser || !script || !script.id) return;
    if (scriptIsSharedListenOnly(script)) {
      setMessage("Shared audio is listen-only and cannot be edited.", "info");
      return;
    }
    if (isWebFreeReadOnlyLibraryScript(script)) {
      promptWebPaidUpgrade(WEB_PAID_FEATURE_COPY.editScript);
      return;
    }
    var list = document.getElementById("scripts-list");
    if (!list) return;
    var card = null;
    var cards = list.querySelectorAll(".library-script-card");
    for (var ci = 0; ci < cards.length; ci++) {
      if (cards[ci].getAttribute("data-script-id") === script.id) {
        card = cards[ci];
        break;
      }
    }
    if (!card) return;
    var titleEl = card.querySelector(".script-inline-title-input");
    var ta = card.querySelector(".script-inline-textarea");
    var title = (titleEl && titleEl.value ? titleEl.value : "").trim();
    var text;
    if (ta) {
      text = (ta.value ? ta.value : "").trim();
    } else {
      text = ((script.text && String(script.text)) || "").trim();
    }
    if (!title) {
      setMessage("Title is required.", "error");
      return;
    }
    if (!text) {
      setMessage(
        "Script text is required. Turn on Show formatting to edit tags and spoken text.",
        "error"
      );
      return;
    }

    setMessage("Saving…", "");
    var uid = currentUser.uid;
    scriptCollection(uid)
      .doc(script.id)
      .set(
        {
          title: title,
          text: text,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      .then(function () {
        var ix = currentScripts.findIndex(function (s) {
          return s.id === script.id;
        });
        if (ix >= 0) {
          currentScripts[ix].title = title;
          currentScripts[ix].text = text;
        }
        delete inlineScriptEditorOpenById[script.id];
        clearInlineScriptDraft(script.id);
        setMessage("Script updated.", "success");
        renderScripts(currentScripts);
      })
      .catch(function (e) {
        setMessage(e.message || "Could not update script.", "error");
      });
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
        if (action === "open-workshop") {
          openScriptWorkshop(script.id, false);
        } else if (action === "ai-edit-script") {
          openAITextEditModal(script.id);
        } else if (action === "toggle-controls") {
          toggleScriptControlsExpanded(script.id);
        } else if (action === "delete") {
          deleteScript(script);
        } else if (action === "generate-audio") {
          if (!requireWebPaidTier(WEB_PAID_FEATURE_COPY.generate)) return;
          generateAudioForScript(script);
        } else if (action === "play-audio") {
          togglePlayScriptAudio(script);
        } else if (action === "add-to-playlist") {
          addScriptToPlaylistPrompt(script);
        } else if (action === "share-audio") {
          shareAudioFromScript(script);
        } else if (action === "refresh-script") {
          refreshOneScriptFromCloud(script.id);
        }
      });
    });
    list.querySelectorAll("[data-script-media-open]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var scriptId = btn.getAttribute("data-script-media-open");
        var field = btn.getAttribute("data-script-media-field");
        if (!scriptId || !field) return;
        if (isWebFreeReadOnlyLibraryScript(
          currentScripts.find(function (s) {
            return s.id === scriptId;
          })
        )) {
          promptWebPaidUpgrade(WEB_PAID_FEATURE_COPY.editScript);
          return;
        }
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
        var hadAudio = false;
        if (scriptId && currentScripts && currentScripts.length) {
          var sc = currentScripts.find(function (x) {
            return x.id === scriptId;
          });
          hadAudio = !!(sc && sc.audioURL && String(sc.audioURL).trim());
        }
        if (hadAudio && (patch.voiceID || patch.backgroundID)) {
          setMessage(
            "Listen settings updated. If you changed the script text, voice, or background, tap Generate to refresh your audio.",
            "success"
          );
        } else {
          setMessage("Script audio settings updated.", "success");
        }
      })
      .catch(function (e) {
        setMessage(e.message || "Could not update script settings.", "error");
      });
  }

  function openMediaPicker(target) {
    mediaPickerTarget = target || null;
    if (
      mediaPickerTarget &&
      mediaPickerTarget.kind === "account-default" &&
      !requireWebPaidTier(WEB_PAID_FEATURE_COPY.setDefault)
    ) {
      mediaPickerTarget = null;
      return;
    }
    var backdrop = document.getElementById("media-picker-backdrop");
    var title = document.getElementById("media-picker-title");
    var subtitle = document.getElementById("media-picker-subtitle");
    var list = document.getElementById("media-picker-list");
    var searchInput = document.getElementById("media-picker-search");
    if (!backdrop || !title || !subtitle || !list || !searchInput || !mediaPickerTarget) return;

    var isVoice = mediaPickerTarget.field === "voice";
    var options = isVoice ? allVoiceOptionsForSelection() : allBackgroundTracksForPicker();
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
    } else if (mediaPickerTarget.kind === "premade") {
      var premade = currentPremade.find(function (p) {
        return p.id === mediaPickerTarget.id;
      });
      if (!premade) return;
      currentValue = isVoice
        ? premadeVoiceOverrideById[premade.id] || selectedVoiceId
        : premadeBackgroundOverrideById[premade.id] || selectedBackgroundId;
      title.textContent = isVoice ? "Select Voice Override" : "Select Background Override";
      subtitle.textContent = premade.title || "Premade";
    } else if (mediaPickerTarget.kind === "account-default") {
      currentValue = isVoice ? selectedVoiceId : selectedBackgroundId;
      title.textContent = isVoice ? "Default Voice" : "Default Background";
      subtitle.textContent =
        "Saved to your account — used for new scripts and when a script has no voice or background set.";
    } else if (mediaPickerTarget.kind === "workshop") {
      if (!scriptWorkshopDraft) return;
      currentValue = isVoice
        ? (scriptWorkshopDraft.voiceID || "").trim()
        : (scriptWorkshopDraft.backgroundID || "").trim();
      title.textContent = isVoice ? "Select Voice" : "Select Background";
      subtitle.textContent = (scriptWorkshopDraft.title || "").trim() || "Script";
    } else {
      return;
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
    } else if (mediaPickerTarget.kind === "premade") {
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
      if (includeBgPreview && backgroundRowCanPreview(opt)) {
        return (
          '<div class="app-picker-option-row">' +
          mainBtn +
          '<button type="button" class="app-btn app-btn-ghost app-picker-preview-btn" data-preview-background="' +
          escapeHtml(opt.id) +
          '" aria-label="' +
          (isBgPreview ? "Pause background audio" : "Play background audio") +
          '">' +
          (isBgPreview ? "Pause" : "Play") +
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
          if (mediaPickerTarget.field === "voice" && !isWebVoiceAvailableForGeneration(selectedID)) {
            promptWebPaidUpgrade(webGenerationGateMessage("voice"));
            return;
          }
          if (mediaPickerTarget.field === "background" && !isWebBackgroundAvailableForGeneration(selectedID)) {
            promptWebPaidUpgrade(webGenerationGateMessage("background"));
            return;
          }
          if (mediaPickerTarget.kind === "account-default") {
            var accField = mediaPickerTarget.field;
            if (accField === "voice") {
              selectedVoiceId = selectedID;
            } else {
              selectedBackgroundId = selectedID;
            }
            saveUserDefaults()
              .then(function () {
                syncAccountDefaultMediaLabels();
                renderVoices();
                renderAudioPage();
                renderScripts(currentScripts);
                setAccountMessage(
                  accField === "voice" ? "Default voice saved." : "Default background saved.",
                  "success"
                );
              })
              .catch(function (e) {
                setAccountMessage(e.message || "Could not save defaults.", "error");
              });
            closeMediaPicker();
            return;
          }
          if (mediaPickerTarget.kind === "script") {
            var patch = mediaPickerTarget.field === "voice" ? { voiceID: selectedID } : { backgroundID: selectedID };
            updateScriptMediaSettings(mediaPickerTarget.id, patch);
            closeMediaPicker();
            return;
          }
          if (mediaPickerTarget.kind === "workshop") {
            if (!scriptWorkshopDraft) return;
            if (mediaPickerTarget.field === "voice") {
              scriptWorkshopDraft.voiceID = selectedID;
            } else {
              scriptWorkshopDraft.backgroundID = selectedID;
            }
            renderScriptWorkshop();
            closeMediaPicker();
            return;
          }
          if (mediaPickerTarget.kind !== "premade") return;
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

  function rerenderMyLibraryCardsIfNeeded() {
    if (!currentScripts.length) return;
    if (activeAdminTab !== "library" || activeLibraryTab !== "my-library") return;
    renderScripts(currentScripts);
  }

  function renderScripts(scripts, scrollScriptIdIntoView) {
    var list = document.getElementById("scripts-list");
    if (!list) return;
    captureInlineScriptDraftsFromDom();
    bindScriptListFormattingToggle();
    bindScriptListInlineEditorInput();
    var displayScripts = scripts;
    if (scripts === currentScripts && activeLibraryTab === "my-library") {
      displayScripts = filteredScriptsForDisplay(scripts);
    }
    if (!displayScripts.length) {
      list.innerHTML = scripts.length && normalizeSectionSearchQuery(sectionSearchQuery.library) && activeLibraryTab === "my-library"
        ? '<div class="app-empty-hint">No scripts match your search.</div>'
        : '<div class="app-empty-hint">No scripts yet. Use <strong>New</strong> or <strong>Import Audio</strong> in the toolbar, or use the <strong>Home</strong> tab flow to generate a personalized mental script and auto-save it here.</div>';
      updateLibraryExpandAllToggleUi();
      return;
    }
    var gen = ++scriptsRenderGeneration;
    Promise.all(
      displayScripts.map(function (s) {
        return scriptContentSha256Hex(scriptDigestSourceForScriptCard(s));
      })
    ).then(function (hashes) {
      if (gen !== scriptsRenderGeneration) return;
      list.innerHTML = displayScripts
        .map(function (s, i) {
          return scriptCardHtml(s, hashes[i]);
        })
        .join("");
      bindScriptCardActions(displayScripts);
      updateLibraryExpandAllToggleUi();
      if (scrollScriptIdIntoView) {
        var sid = scrollScriptIdIntoView;
        requestAnimationFrame(function () {
          var found = null;
          var nc = list.querySelectorAll(".library-script-card");
          for (var j = 0; j < nc.length; j++) {
            if (nc[j].getAttribute("data-script-id") === sid) {
              found = nc[j];
              break;
            }
          }
          if (found) {
            try {
              found.scrollIntoView({ block: "nearest", behavior: "smooth" });
            } catch (_e) {
              found.scrollIntoView({ block: "nearest" });
            }
          }
        });
      }
    });
  }

  function openInlineScriptEditorForScript(scriptId, isNewDraft) {
    if (!scriptId) return;
    closeEditor();
    activeLibraryTab = "my-library";
    setAdminTab("library");
    setScriptControlsExpanded(scriptId, true);
    openScriptWorkshop(scriptId, !!isNewDraft);
  }

  function createBlankScriptAndOpenEditor() {
    if (!currentUser) return;
    var title = uniqueScriptTitle("New Script");
    var docRef = scriptCollection(currentUser.uid).doc();
    var now = firebase.firestore.Timestamp.now();
    setMessage("", "");
    showScriptWorkOverlay({
      title: "Creating script...",
      detail: "Saving to your library.",
    });
    scriptCollection(currentUser.uid)
      .doc(docRef.id)
      .set({
        title: title,
        text: "",
        createdAt: now,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        audioURL: "",
        backgroundID: selectedBackgroundId,
        voiceID: selectedVoiceId,
        audioCreatedAt: null,
        categoryID: "",
      })
      .then(function () {
        if (
          !currentScripts.some(function (s) {
            return s.id === docRef.id;
          })
        ) {
          currentScripts = [
            {
              id: docRef.id,
              title: title,
              text: "",
              audioURL: "",
              voiceID: selectedVoiceId,
              backgroundID: selectedBackgroundId,
              categoryID: "",
              createdAt: now,
              updatedAt: null,
              audioCreatedAt: null,
              audioContentHash: "",
              audioVoiceID: "",
              audioBackgroundID: "",
            },
          ].concat(currentScripts);
          updateTabCounts();
        }
        setMessage("New script created — tap Edit to customize.", "success");
        openInlineScriptEditorForScript(docRef.id, true);
      })
      .catch(function (e) {
        setMessage(e.message || "Could not create script.", "error");
      })
      .finally(function () {
        stopScriptWorkOverlay();
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
        openInlineScriptEditorForScript(docRef.id);
      })
      .catch(function (e) {
        setMessage(e.message || "Could not create script.", "error");
      });
  }

  function deleteScript(script) {
    if (!currentUser) return;
    if (scriptIsSharedListenOnly(script)) {
      var token = script.sharedFrom && script.sharedFrom.shareToken;
      if (!token) return;
      var okShared = window.confirm(
        'Remove "' + (script.title || "Shared audio") + '" from your library? This does not affect the sender’s copy.'
      );
      if (!okShared) return;
      setMessage("Removing shared audio…", "");
      db.collection("users")
        .doc(currentUser.uid)
        .collection("incomingSharedScripts")
        .doc(token)
        .delete()
        .then(function () {
          setMessage("Shared audio removed from your library.", "success");
        })
        .catch(function (e) {
          setMessage(e.message || "Could not remove shared audio.", "error");
        });
      return;
    }
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
    activeVoicePreviewId = "";
    if (resetQueue) {
      activePlaylistQueue = [];
      activePlaylistIndex = -1;
      activePlaylistLoopForQueue = false;
      clearPlaylistTimer();
    }
    activeAudioTitle = "";
    updateMiniPlayer();
    refreshHomeDailySparkTransportIfVisible();
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
          reportClientError("Could not play audio in browser.", "playback", {
            script_id: script.id,
          });
          setMessage("Could not play audio in browser.", "error");
        });
      } else {
        activeAudio.pause();
      }
      updateMiniPlayer();
      renderScripts(currentScripts);
      refreshHomeDailySparkTransportIfVisible();
      return;
    }

    stopActiveAudio();
    var playKind = script.isPremade ? "premade_play" : "user_audio_play";
    reportCatalogStorageCostFromUrl(audioURL, playKind);
    activeAudio = new Audio(audioURL);
    applyPlaybackVolumeToActiveAudio();
    activeAudioScriptId = script.id;
    activeAudioTitle = script.title || "Audio";
    bindAudioLifecycle();
    activeAudio
      .play()
      .then(function () {
        updateMiniPlayer();
        renderScripts(currentScripts);
        refreshHomeDailySparkTransportIfVisible();
        recordWebListen(activeAudioTitle, audioURL);
      })
      .catch(function () {
        reportClientError("Could not play audio in browser.", "playback", {
          script_id: script.id,
        });
        setMessage("Could not play audio in browser.", "error");
        stopActiveAudio();
        renderScripts(currentScripts);
        refreshHomeDailySparkTransportIfVisible();
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
    reportCatalogStorageCostFromUrl(audioURL, script.isPremade ? "premade_play" : "user_audio_play");
    activeAudio = new Audio(audioURL);
    applyPlaybackVolumeToActiveAudio();
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
        recordWebListen(activeAudioTitle, audioURL);
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

  function togglePlaylistTrackPlayback(playlist, scriptId) {
    if (!playlist || !scriptId) return;
    var scripts = resolvePlaylistScripts(playlist);
    var track = scripts.find(function (s) {
      return s.id === scriptId;
    });
    if (!track || !(track.audioURL && String(track.audioURL).trim())) return;
    var idSet = {};
    (playlist.scriptIDs || []).forEach(function (id) {
      idSet[id] = true;
    });
    var isPlayingThisQueue =
      activePlaylistQueue.length > 0 &&
      activePlaylistQueue.every(function (s) {
        return !!idSet[s.id];
      });
    if (isPlayingThisQueue && activeAudioScriptId === scriptId && activeAudio) {
      if (activeAudio.paused) {
        activeAudio.play().catch(function () {
          setPlaylistsMessage("Could not resume in browser.", "error");
        });
      } else {
        activeAudio.pause();
      }
      updateMiniPlayer();
      renderSelectedPlaylistDetail();
      renderScripts(currentScripts);
      return;
    }
    startPlaylistPlayback(playlist, scriptId);
  }

  function bindAudioLifecycle(onEnded) {
    if (!activeAudio) return;
    function onTransportStateChange() {
      updateMiniPlayer();
      refreshHomeDailySparkTransportIfVisible();
    }
    activeAudio.addEventListener("play", onTransportStateChange);
    activeAudio.addEventListener("pause", onTransportStateChange);
    activeAudio.addEventListener("timeupdate", updateMiniPlayer);
    activeAudio.addEventListener("loadedmetadata", updateMiniPlayer);
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
      refreshHomeDailySparkTransportIfVisible();
    });
  }

  function formatTime(sec) {
    var s = Math.max(0, Math.floor(sec));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  var MINI_PLAYER_PLAY_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  var MINI_PLAYER_PAUSE_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>';

  function updateMiniPlayer() {
    var shell = document.getElementById("mini-player");
    if (!shell) return;
    shell.hidden = false;
    var titleEl = document.getElementById("mini-player-title");
    var toggleEl = document.getElementById("mini-player-toggle");
    var iconWrap = toggleEl ? toggleEl.querySelector(".mini-player-toggle-icon") : null;
    var timeEl = document.getElementById("mini-player-time");
    var volEl = document.getElementById("mini-player-volume");
    if (volEl && document.activeElement !== volEl) {
      volEl.value = String(readPlaybackVolume());
    }
    if (!activeAudio) {
      shell.classList.add("mini-player-is-idle");
      if (titleEl) titleEl.textContent = "Nothing playing";
      if (toggleEl) {
        toggleEl.disabled = true;
        toggleEl.setAttribute("aria-label", "Play");
        if (iconWrap) iconWrap.innerHTML = MINI_PLAYER_PLAY_SVG;
      }
      if (timeEl) timeEl.textContent = "—";
      return;
    }
    shell.classList.remove("mini-player-is-idle");
    if (titleEl) titleEl.textContent = activeAudioTitle || "Now playing";
    if (toggleEl) {
      toggleEl.disabled = false;
      if (activeAudio.paused) {
        toggleEl.setAttribute("aria-label", "Play");
        if (iconWrap) iconWrap.innerHTML = MINI_PLAYER_PLAY_SVG;
      } else {
        toggleEl.setAttribute("aria-label", "Pause");
        if (iconWrap) iconWrap.innerHTML = MINI_PLAYER_PAUSE_SVG;
      }
    }
    if (timeEl) {
      var cur = formatTime(activeAudio.currentTime || 0);
      var d = activeAudio.duration;
      if (typeof d === "number" && isFinite(d) && d > 0) {
        timeEl.textContent = cur + " / " + formatTime(d);
      } else {
        timeEl.textContent = cur;
      }
    }
  }

  function backendGet(path, token) {
    return fetch(backendBaseURL() + path, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
      },
    }).then(function (resp) {
      return resp.text().then(function (text) {
        var json = null;
        if (text) {
          try {
            json = JSON.parse(text);
          } catch (_e) {
            json = null;
          }
        }
        if (!resp.ok) {
          throw new Error((json && json.error) || text || "Request failed (" + resp.status + ")");
        }
        if (json == null && text) {
          throw new Error("Could not parse JSON from server.");
        }
        return json != null ? json : {};
      });
    }).catch(function (err) {
      if (isNetworkFetchFailure(err)) {
        throw new Error(networkFetchErrorMessage("API"));
      }
      throw err;
    });
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
      return resp.text().then(function (text) {
        var json = null;
        if (text) {
          try {
            json = JSON.parse(text);
          } catch (_e) {
            json = null;
          }
        }
        if (!resp.ok) {
          throw new Error((json && json.error) || text || "Request failed (" + resp.status + ")");
        }
        if (json == null && text) {
          throw new Error("Could not parse JSON from server.");
        }
        return json != null ? json : {};
      });
    }).catch(function (err) {
      if (isNetworkFetchFailure(err)) {
        throw new Error(networkFetchErrorMessage("API"));
      }
      throw err;
    });
  }

  function postStripeCheckoutTier(tier, billingInterval) {
    if (!currentUser) return;
    setAccountMessage("Opening Stripe checkout…", "");
    currentUser
      .getIdToken(true)
      .then(function (token) {
        return backendRequest("/stripe/create-checkout-session", token, {
          tier: tier,
          billingInterval: billingInterval || "month",
        });
      })
      .then(function (json) {
        if (json && json.ok && json.url) {
          window.location.assign(json.url);
          return;
        }
        throw new Error((json && json.error) || "Checkout failed");
      })
      .catch(function (err) {
        setAccountMessage(err.message || "Could not start checkout.", "error");
      });
  }

  function postStripeStepUpCheckout() {
    if (!currentUser) return;
    setAccountMessage("Opening Stripe checkout for usage add-on…", "");
    currentUser
      .getIdToken(true)
      .then(function (token) {
        return backendRequest("/stripe/create-stepup-checkout-session", token, {});
      })
      .then(function (json) {
        if (json && json.ok && json.url) {
          window.location.assign(json.url);
          return;
        }
        throw new Error((json && json.error) || "Checkout failed");
      })
      .catch(function (err) {
        setAccountMessage(err.message || "Could not start usage add-on checkout.", "error");
      });
  }

  function postStripeBillingPortal() {
    if (!currentUser) return;
    setAccountMessage("Opening Stripe billing portal…", "");
    currentUser
      .getIdToken(true)
      .then(function (token) {
        return backendRequest("/stripe/create-portal-session", token, {});
      })
      .then(function (json) {
        if (json && json.ok && json.url) {
          window.location.assign(json.url);
          return;
        }
        throw new Error((json && json.error) || "Billing portal failed");
      })
      .catch(function (err) {
        setAccountMessage(err.message || "Could not open billing portal.", "error");
      });
  }

  function handleStripeAndAccountQueryParams() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      var changed = false;

      var stripeCheckout = params.get("stripe_checkout");
      if (
        stripeCheckout === "success" ||
        stripeCheckout === "cancel" ||
        stripeCheckout === "stepup_success" ||
        stripeCheckout === "stepup_cancel"
      ) {
        params.delete("stripe_checkout");
        changed = true;
        if (stripeCheckout === "success") {
          setMessage(
            "Stripe checkout finished. Your plan updates when the webhook runs (usually within a minute). Refresh if quotas do not change.",
            "success"
          );
        } else if (stripeCheckout === "stepup_success") {
          setMessage(
            "Usage add-on payment received. Your word and TTS limits should increase within a minute.",
            "success"
          );
          showAppBanner(
            "Usage add-on purchased",
            "Refresh Account → Usage if your limits do not update right away.",
            "success"
          );
          refreshAccountInsightsFromCloud();
        } else if (stripeCheckout === "stepup_cancel") {
          setMessage("Usage add-on checkout was canceled — no charge.", "");
        } else {
          setMessage("Checkout was canceled — no billing changes.", "");
        }
      }

      var portalReturn = params.get("stripe_portal");
      if (portalReturn === "return") {
        params.delete("stripe_portal");
        changed = true;
        setMessage("Billing portal closed. Your plan may take a moment to update.", "success");
        if (currentUser) {
          db.collection("users")
            .doc(currentUser.uid)
            .get()
            .then(function (snap) {
              currentUserProfile = snap.exists ? snap.data() || {} : currentUserProfile;
              syncAccountSubscriptionHeadline();
            })
            .catch(function () {});
        }
      }

      var openParam = params.get("open");
      if (openParam === "account") {
        params.delete("open");
        changed = true;
        setTimeout(function () {
          openAccountModal();
          setAccountModalTab("settings");
        }, 0);
      }

      if (changed) {
        var qs = params.toString();
        var path = window.location.pathname + (qs ? "?" + qs : "") + (window.location.hash || "");
        window.history.replaceState({}, "", path);
      }
    } catch (_e) {}
  }

  function generateAudioForScript(script, options) {
    options = options || {};
    if (!currentUser) return;
    if (!requireWebPaidTier(WEB_PAID_FEATURE_COPY.generate)) return;
    if (scriptIsSharedListenOnly(script)) {
      setMessage("Shared audio is listen-only — playback uses the sender’s hosted file.", "info");
      return;
    }
    var text = (script.text || "").trim();
    if (!text) {
      setMessage("Script text is empty. Add text before generating audio.", "error");
      return;
    }
    var genGuard = validateScriptForAudioGeneration(script);
    if (genGuard) {
      setMessage(genGuard, "error");
      return;
    }
    if (options.skipHashCheck) {
      enqueueBackgroundAudioGeneration(script, { showStartingBanner: true });
      return;
    }
    scriptContentSha256Hex(scriptDigestSourceFromScript(script))
      .then(function (hex) {
        if (!shouldEnableGenerateFromHash(script, hex)) {
          setMessage("Audio already matches this script, voice, and background.", "");
          return;
        }
        enqueueBackgroundAudioGeneration(script, { showStartingBanner: true });
      })
      .catch(function (e) {
        setMessage((e && e.message) || "Could not verify script state.", "error");
      });
  }

  function importScriptAudioFromFile(file) {
    if (!currentUser || !file) return;
    if (!requireWebPaidTier(WEB_PAID_FEATURE_COPY.libraryImport)) return;
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
            return docRef.set({ audioContentHash: digest }, { merge: true });
          }).then(function () {
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
    if (!requireWebPaidTier(WEB_PAID_FEATURE_COPY.generate)) return;
    var text = resolvePremadeScriptText(premade).trim();
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
      showAudioGenerationOverlay(premade.title || "App Library");
      setPremadeMessage("", "");

      currentUser
        .getIdToken(true)
        .then(function (token) {
          var premadeVoiceId = resolvePremadeVoiceSelection(premade);
          var payload = {
            scriptId: jobScriptId,
            text: text,
            scriptTitle: premade.title || "Premade",
            voiceID: premadeVoiceId,
            backgroundID: resolvePremadeBackgroundSelection(premade) || "",
            createdAt:
              premade.createdAt && typeof premade.createdAt.toMillis === "function"
                ? premade.createdAt.toMillis() / 1000
                : Date.now() / 1000,
          };
          var premadeVs = voiceSettingsForAudioJob(premadeVoiceId);
          if (premadeVs) payload.voice_settings = premadeVs;
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
            String(resolvePremadeBackgroundSelection(premade) || "").trim(),
            ctx.token
          );
        })
        .then(function (result) {
          var vId = String(resolvePremadeVoiceSelection(premade) || "").trim();
          var bId = String(resolvePremadeBackgroundSelection(premade) || "").trim();
          var digestSource = {
            text: resolvePremadeScriptText(premade),
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
          var msg = e.message || "Audio generation failed.";
          if (!handleQuotaLimitError(msg)) setPremadeMessage(msg, "error");
        })
        .finally(function () {
          setPremadeBusy(premade.id, false);
          stopAudioGenerationOverlay();
        });
    }).catch(function (e) {
      setPremadeMessage((e && e.message) || "Could not verify premade state.", "error");
    });
  }

  function waitForAudioJob(script, jobId, backgroundIdForMix, authToken) {
    return new Promise(function (resolve, reject) {
      var mixStarted = false;
      var timeout = setTimeout(function () {
        cleanup();
        reject(
          new Error(
            "Audio generation is taking longer than expected. The job may still finish — check your library in a moment, or try again with a shorter script."
          )
        );
      }, AUDIO_JOB_WAIT_MS);
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
              if (!authToken) {
                cleanup();
                reject(new Error("Not signed in — refresh and try again."));
                return;
              }
              var bgMix = (backgroundIdForMix && String(backgroundIdForMix).trim()) || "";
              if (!bgMix || bgMix === "bg-none") {
                cleanup();
                reject(new Error("Background mix was requested but no background is selected."));
                return;
              }
              finalizeAwaitingClientMix(currentUser.uid, script.id, jobId, bgMix, authToken)
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
    var backBtn = document.getElementById("btn-playlist-back");
    if (backBtn) backBtn.hidden = !showDetail;
  }

  function openPlaylistDetailView(playlistId) {
    selectedPlaylistId = playlistId;
    playlistDetailVisible = true;
    updatePlaylistSectionVisibility();
    syncScreenHelpButtonLabel();
    renderPlaylists(currentPlaylists);
    renderSelectedPlaylistDetail();
  }

  function closePlaylistDetailView() {
    playlistDetailVisible = false;
    updatePlaylistSectionVisibility();
    syncScreenHelpButtonLabel();
    var h = document.getElementById("playlist-detail-heading");
    if (h) h.textContent = "Playlist";
    var ha = document.getElementById("playlist-detail-head-actions");
    if (ha) ha.innerHTML = "";
    var ht = document.getElementById("playlist-detail-head-toolbar");
    if (ht) ht.innerHTML = "";
    var el = document.getElementById("playlist-detail");
    if (el) el.innerHTML = "";
    closePlaylistEditModal();
  }

  function setPlaylistEditMessage(text, kind) {
    postScreenMessage("playlist-edit-message", text, kind);
  }

  function closePlaylistEditModal() {
    var bd = document.getElementById("playlist-edit-backdrop");
    if (bd) bd.hidden = true;
    playlistEditOrderIds = [];
    setPlaylistEditMessage("", "");
  }

  function renderPlaylistEditOrderList() {
    var listEl = document.getElementById("playlist-edit-order-list");
    if (!listEl) return;
    if (!playlistEditOrderIds.length) {
      listEl.innerHTML = '<p class="app-muted">No tracks in this playlist yet.</p>';
      return;
    }
    var byId = {};
    currentScripts.forEach(function (s) {
      byId[s.id] = s;
    });
    listEl.innerHTML = playlistEditOrderIds
      .map(function (sid, idx) {
        var s = byId[sid];
        var title = (s && s.title) || "Untitled";
        return (
          '<div class="playlist-edit-order-row">' +
          '<span class="playlist-edit-order-title">' +
          escapeHtml(title) +
          "</span>" +
          '<span class="playlist-edit-order-btns">' +
          '<button type="button" class="app-btn app-btn-secondary app-btn-iconish" data-edit-move="' +
          idx +
          '" data-edit-delta="-1"' +
          (idx === 0 ? " disabled" : "") +
          ' title="Move up">↑</button>' +
          '<button type="button" class="app-btn app-btn-secondary app-btn-iconish" data-edit-move="' +
          idx +
          '" data-edit-delta="1"' +
          (idx === playlistEditOrderIds.length - 1 ? " disabled" : "") +
          ' title="Move down">↓</button>' +
          "</span>" +
          "</div>"
        );
      })
      .join("");
    listEl.querySelectorAll("[data-edit-move]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.disabled) return;
        var i = parseInt(btn.getAttribute("data-edit-move"), 10);
        var d = parseInt(btn.getAttribute("data-edit-delta"), 10);
        var j = i + d;
        if (j < 0 || j >= playlistEditOrderIds.length) return;
        var t = playlistEditOrderIds[i];
        playlistEditOrderIds[i] = playlistEditOrderIds[j];
        playlistEditOrderIds[j] = t;
        renderPlaylistEditOrderList();
      });
    });
  }

  function openPlaylistEditModal() {
    var p = currentPlaylists.find(function (x) {
      return x.id === selectedPlaylistId;
    });
    if (!p || !currentUser) return;
    playlistEditOrderIds = (p.scriptIDs || []).slice();
    var nameInput = document.getElementById("playlist-edit-name-input");
    var bd = document.getElementById("playlist-edit-backdrop");
    if (!nameInput || !bd) return;
    nameInput.value = p.name || "";
    setPlaylistEditMessage("", "");
    renderPlaylistEditOrderList();
    bd.hidden = false;
  }

  function savePlaylistEditFromModal() {
    var p = currentPlaylists.find(function (x) {
      return x.id === selectedPlaylistId;
    });
    if (!p || !currentUser) return;
    var nameInput = document.getElementById("playlist-edit-name-input");
    var name = ((nameInput && nameInput.value) || "").trim();
    if (!name) {
      setPlaylistEditMessage("Enter a playlist name.", "error");
      return;
    }
    var ids = playlistEditOrderIds.slice();
    var items = ids.map(function (id) {
      return { type: "script", id: id };
    });
    setPlaylistEditMessage("Saving...", "");
    playlistCollection(currentUser.uid)
      .doc(p.id)
      .set(
        {
          name: name,
          scriptIDs: ids,
          items: items,
        },
        { merge: true }
      )
      .then(function () {
        p.name = name;
        p.scriptIDs = ids;
        var h = document.getElementById("playlist-detail-heading");
        if (h) h.textContent = name;
        closePlaylistEditModal();
        setPlaylistsMessage("Playlist updated.", "success");
        renderPlaylists(currentPlaylists);
        renderSelectedPlaylistDetail();
      })
      .catch(function (e) {
        setPlaylistEditMessage(e.message || "Could not save playlist.", "error");
      });
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
    postScreenMessage("playlist-timer-modal-msg", text, kind);
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
    var displayPlaylists = filteredPlaylistsForDisplay(playlists);
    if (!displayPlaylists.length) {
      list.innerHTML = playlists.length && normalizeSectionSearchQuery(sectionSearchQuery.playlists)
        ? '<div class="app-empty-hint">No playlists match your search.</div>'
        : '<div class="app-empty-hint">No playlists yet. Tap <strong>+ New Playlist</strong>, then open a playlist to add audio, or add from <strong>My Library</strong> with <em>Add to Playlist</em>.</div>';
      updatePlaylistSectionVisibility();
      renderSelectedPlaylistDetail();
      return;
    }
    list.innerHTML = displayPlaylists
      .map(function (p) {
        var selected = p.id === selectedPlaylistId && playlistDetailVisible;
        return (
          '<article class="app-card playlist-card-tappable" tabindex="0" aria-label="Open playlist" data-playlist-card="' +
          escapeHtml(p.id) +
          '" style="' +
          (selected ? "border-color:#2563eb;" : "") +
          (selected ? "" : "cursor:pointer;") +
          '">' +
          '<div class="playlist-card-head">' +
          "<h3 class=\"playlist-card-title\">" +
          escapeHtml(p.name || "Untitled Playlist") +
          "</h3>" +
          '<div class="playlist-card-head-actions" role="toolbar" aria-label="Playlist actions">' +
          '  <button type="button" class="playlist-card-icon-btn" data-playlist-action="rename" data-playlist-id="' +
          escapeHtml(p.id) +
          '" title="Rename playlist" aria-label="Rename playlist">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
          "</button>" +
          '  <button type="button" class="playlist-card-icon-btn playlist-card-icon-btn--danger" data-playlist-action="delete" data-playlist-id="' +
          escapeHtml(p.id) +
          '" title="Delete playlist" aria-label="Delete playlist">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>' +
          "</button>" +
          "</div>" +
          "</div>" +
          '<div class="app-card-meta">' +
          (p.scriptIDs ? p.scriptIDs.length : 0) +
          " item(s)</div>" +
          "</article>"
        );
      })
      .join("");

    list.querySelectorAll(".playlist-card-head-actions").forEach(function (row) {
      row.addEventListener("click", function (ev) {
        ev.stopPropagation();
      });
    });
    list.querySelectorAll("[data-playlist-card]").forEach(function (card) {
      card.addEventListener("click", function (ev) {
        if (ev.target.closest && ev.target.closest(".playlist-card-head-actions")) return;
        openPlaylistDetailView(card.getAttribute("data-playlist-card"));
      });
      card.addEventListener("keydown", function (ev) {
        if (ev.key !== "Enter" && ev.key !== " ") return;
        if (ev.target.closest && ev.target.closest(".playlist-card-head-actions")) return;
        ev.preventDefault();
        openPlaylistDetailView(card.getAttribute("data-playlist-card"));
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

  function playlistTimerToolbarSvg() {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 3h6"/><path d="M12 3v2"/></svg>'
    );
  }

  function playlistModeChipSvg(kind, on) {
    var sw = on ? "2.35" : "2";
    if (kind === "loop") {
      return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' +
        sw +
        '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        (on
          ? '<path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>'
          : '<path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/>') +
        "</svg>"
      );
    }
    if (kind === "shuffle") {
      return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' +
        sw +
        '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M3 7h6.5l3.5 10H21"/><path d="M3 17h6.5l3.5-10H21"/><path d="M17 3l4 4-4 4"/><path d="M7 21l-4-4 4-4"/>' +
        "</svg>"
      );
    }
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' +
      sw +
      '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M3 7h6.5l3.5 10H21"/><path d="M3 17h6.5l3.5-10H21"/><path d="M17 3l4 4-4 4"/><path d="M7 21l-4-4 4-4"/>' +
      "</svg>"
    );
  }

  function playlistPlaybackIconToolbar(loopOn, shuffleOn) {
    function iconToggle(id, kind, on, tip) {
      return (
        '<button type="button" class="playlist-mode-icon-btn' +
        (on ? " is-on" : "") +
        '" id="' +
        id +
        '" aria-pressed="' +
        (on ? "true" : "false") +
        '" title="' +
        escapeHtml(tip) +
        '">' +
        '<span class="playlist-mode-icon-inner">' +
        playlistModeChipSvg(kind, on) +
        "</span></button>"
      );
    }
    return (
      '<div class="playlist-detail-icon-toolbar playlist-head-inline-toolbar" role="toolbar" aria-label="Playlist controls">' +
      '<button type="button" class="playlist-mode-icon-btn playlist-timer-toolbar-btn" id="btn-playlist-timer" title="Sleep timer — countdown shows in the header">' +
      '<span class="playlist-mode-icon-inner">' +
      playlistTimerToolbarSvg() +
      "</span></button>" +
      iconToggle("toggle-playlist-loop", "loop", loopOn, "Loop — repeat this playlist when it ends") +
      iconToggle("toggle-playlist-shuffle", "shuffle", shuffleOn, "Shuffle — random order when you play") +
      "</div>"
    );
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
      var haClear = document.getElementById("playlist-detail-head-actions");
      if (haClear) haClear.innerHTML = "";
      var htClear = document.getElementById("playlist-detail-head-toolbar");
      if (htClear) htClear.innerHTML = "";
      return;
    }
    if (heading) heading.textContent = p.name || "Playlist";
    var headToolbar = document.getElementById("playlist-detail-head-toolbar");
    var headActions = document.getElementById("playlist-detail-head-actions");
    var loopOn = !!p.loop;
    var shuffleOn = !!p.shuffle;
    if (headToolbar) {
      headToolbar.innerHTML = playlistPlaybackIconToolbar(loopOn, shuffleOn);
    }
    if (headActions) {
      headActions.innerHTML =
        '<div class="library-dual-btn playlist-add-dual playlist-head-dual" role="group" aria-label="Add tracks or edit playlist">' +
        '  <button type="button" class="library-dual-btn-main" id="btn-playlist-add-audio">Add audio</button>' +
        '  <button type="button" class="library-dual-btn-menu playlist-dual-edit" id="btn-playlist-edit" title="Edit name and track order">Edit</button>' +
        "</div>";
    }
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
    el.innerHTML =
      '<article class="app-card playlist-detail-card">' +
      (scripts.length
        ? '<ul class="playlist-track-list">' +
          scripts
            .map(function (s) {
              var hasAudio = !!(s.audioURL && String(s.audioURL).trim());
              var isCurrentTrack =
                hasAudio &&
                isPlayingThisQueue &&
                activePlaylistQueue[activePlaylistIndex] &&
                activePlaylistQueue[activePlaylistIndex].id === s.id;
              var rowPaused = !!(isCurrentTrack && activeAudio && activeAudio.paused);
              var rowClasses = "playlist-track-row";
              if (hasAudio) rowClasses += " playlist-track-row--tappable";
              if (isCurrentTrack) rowClasses += rowPaused ? " is-current is-paused" : " is-current";
              var rowLabel =
                hasAudio
                  ? escapeHtml((rowPaused ? "Resume: " : isCurrentTrack ? "Pause: " : "Play: ") + (s.title || "Untitled"))
                  : "";
              var transportHint = "";
              if (isCurrentTrack && activeAudio) {
                transportHint = rowPaused
                  ? '<span class="playlist-track-transport" aria-hidden="true">' +
                    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>'
                  : '<span class="playlist-track-transport" aria-hidden="true">' +
                    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="4" height="14"/><rect x="13" y="5" width="4" height="14"/></svg></span>';
              } else if (hasAudio) {
                transportHint =
                  '<span class="playlist-track-transport" aria-hidden="true">' +
                  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>';
              }
              return (
                '<li class="' +
                rowClasses +
                '" data-playlist-track-id="' +
                escapeHtml(s.id) +
                '"' +
                (hasAudio ? ' role="button" tabindex="0" aria-label="' + rowLabel + '"' : "") +
                ">" +
                '<span class="playlist-track-title">' +
                transportHint +
                escapeHtml(s.title || "Untitled") +
                (hasAudio ? "" : ' <span class="app-muted">(no audio)</span>') +
                "</span>" +
                '<span class="playlist-track-actions">' +
                '<button type="button" class="playlist-track-remove" data-playlist-remove-script="' +
                escapeHtml(s.id) +
                '" title="Remove from playlist" aria-label="Remove from playlist">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>' +
                "</button>" +
                "</span>" +
                "</li>"
              );
            })
            .join("") +
          "</ul>"
        : '<p class="app-muted">No scripts in this playlist yet. Use <strong>Add audio</strong> or add from My Library.</p>') +
      "</article>";

    function bindPlaylistModeChip(btnId, field) {
      var btn = document.getElementById(btnId);
      if (!btn) return;
      btn.addEventListener("click", function () {
        var pl = currentPlaylists.find(function (x) {
          return x.id === selectedPlaylistId;
        });
        if (!pl) return;
        var next = !pl[field];
        persistPlaylistPlaybackField(pl.id, (function () {
          var o = {};
          o[field] = next;
          return o;
        })());
        pl[field] = next;
        renderSelectedPlaylistDetail();
      });
    }
    bindPlaylistModeChip("toggle-playlist-loop", "loop");
    bindPlaylistModeChip("toggle-playlist-shuffle", "shuffle");
    document.getElementById("btn-playlist-timer").addEventListener("click", function () {
      openPlaylistTimerModal();
    });
    var addBtn = document.getElementById("btn-playlist-add-audio");
    if (addBtn) {
      addBtn.addEventListener("click", function () {
        openPlaylistAddAudioModal();
      });
    }
    var editBtn = document.getElementById("btn-playlist-edit");
    if (editBtn) {
      editBtn.addEventListener("click", function () {
        openPlaylistEditModal();
      });
    }
    el.querySelectorAll(".playlist-track-row--tappable").forEach(function (row) {
      function activateFromRow() {
        var sid = row.getAttribute("data-playlist-track-id");
        if (sid) togglePlaylistTrackPlayback(p, sid);
      }
      row.addEventListener("click", function (ev) {
        if (ev.target.closest && ev.target.closest(".playlist-track-remove")) return;
        activateFromRow();
      });
      row.addEventListener("keydown", function (ev) {
        if (ev.key !== "Enter" && ev.key !== " ") return;
        ev.preventDefault();
        if (ev.target.closest && ev.target.closest(".playlist-track-remove")) return;
        activateFromRow();
      });
    });
    el.querySelectorAll("[data-playlist-remove-script]").forEach(function (btn) {
      btn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        var sid = btn.getAttribute("data-playlist-remove-script");
        removeScriptFromPlaylist(p, sid).then(function () {
          setPlaylistsMessage("Removed from playlist.", "success");
        });
      });
    });
    el.querySelectorAll(".playlist-track-row[data-playlist-track-id]").forEach(function (row) {
      var touchStartX = null;
      var touchStartY = null;
      row.addEventListener(
        "touchstart",
        function (e) {
          if (e.touches.length !== 1) return;
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        },
        { passive: true }
      );
      row.addEventListener(
        "touchend",
        function (e) {
          if (touchStartX == null || !e.changedTouches.length) return;
          var dx = e.changedTouches[0].clientX - touchStartX;
          var dy = e.changedTouches[0].clientY - touchStartY;
          touchStartX = null;
          if (dx > -72 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
          var sid = row.getAttribute("data-playlist-track-id");
          if (!sid) return;
          var tr = scripts.find(function (x) {
            return x.id === sid;
          });
          var tlab = (tr && tr.title) || "this track";
          if (window.confirm('Remove "' + tlab + '" from this playlist?')) {
            removeScriptFromPlaylist(p, sid).then(function () {
              setPlaylistsMessage("Removed from playlist.", "success");
            });
          }
        },
        { passive: true }
      );
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
      text: resolvePremadeScriptText(premade),
      audioURL: premadeOfflinePlaybackURL(premade.id, premade.audioURL || ""),
      voiceID: selectedVoiceId,
      backgroundID: "",
      createdAt: null,
      isPremade: true,
    };
  }

  var PREMADE_DEFAULT_VOICE_ID = "lnieQLGTodpbhjpZtg1k";

  function resolvePremadeVoiceSelection(premade) {
    if (!premade) return selectedVoiceId;
    if (premadeVoiceOverrideById[premade.id]) return premadeVoiceOverrideById[premade.id];
    var published = (premade.voiceID && String(premade.voiceID).trim()) || "";
    if (published) return published;
    return selectedVoiceId || PREMADE_DEFAULT_VOICE_ID;
  }

  function resolvePremadeBackgroundSelection(premade) {
    if (!premade) return selectedBackgroundId;
    if (premadeBackgroundOverrideById[premade.id]) return premadeBackgroundOverrideById[premade.id];
    var published = (premade.backgroundID && String(premade.backgroundID).trim()) || "";
    if (published && published !== "bg-none") return published;
    return selectedBackgroundId;
  }

  function premadePublishedVoiceId(premade) {
    var published = (premade && premade.voiceID && String(premade.voiceID).trim()) || "";
    return published || PREMADE_DEFAULT_VOICE_ID || selectedVoiceId || "";
  }

  function premadePublishedBackgroundId(premade) {
    var published = (premade && premade.backgroundID && String(premade.backgroundID).trim()) || "";
    if (published === "bg-none") published = "";
    return published || selectedBackgroundId || "";
  }

  function premadeHasVoiceOrBackgroundDrift(premade) {
    var currentVoice = String(resolvePremadeVoiceSelection(premade) || "").trim();
    var currentBg = String(resolvePremadeBackgroundSelection(premade) || "").trim();
    return (
      currentVoice !== premadePublishedVoiceId(premade) ||
      currentBg !== premadePublishedBackgroundId(premade)
    );
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
        text: resolvePremadeScriptText(premade),
        createdAt: firebase.firestore.Timestamp.now(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        audioURL: premade.audioURL || "",
        backgroundID: backgroundID,
        voiceID: voiceID,
        audioCreatedAt: premade.audioURL ? firebase.firestore.FieldValue.serverTimestamp() : null,
        categoryID: premade.categoryID || "",
      })
      .then(function () {
        var audio = (premade.audioURL || "").trim();
        if (!audio) {
          setPremadeMessage('Saved "' + title + '" to My Library.', "success");
          return;
        }
        return scriptContentSha256Hex({
          text: resolvePremadeScriptText(premade),
          voiceID: voiceID,
          backgroundID: backgroundID,
        }).then(function (digest) {
          setStoredGeneratedHash(docRef.id, digest);
          return scriptCollection(currentUser.uid).doc(docRef.id).set({ audioContentHash: digest }, { merge: true });
        }).then(function () {
          setPremadeMessage('Saved "' + title + '" to My Library.', "success");
        });
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
        var audioUrl = (s.audioURL || "").trim();
        function openPickerForSaved() {
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
        }
        if (!audioUrl) {
          openPickerForSaved();
          return;
        }
        return scriptContentSha256Hex({
          text: s.text || "",
          voiceID: voiceID,
          backgroundID: backgroundID,
        }).then(function (digest) {
          setStoredGeneratedHash(docRef.id, digest);
          return scriptCollection(currentUser.uid).doc(docRef.id).set({ audioContentHash: digest }, { merge: true });
        }).then(function () {
          openPickerForSaved();
        });
      })
      .catch(function (e) {
        setPremadeMessage(e.message || "Could not save premade script.", "error");
      });
  }

  function premadeCardHtml(p, contentHashHex) {
    var paid = isWebPaidTierForAI();
    var isExpanded = !paid && expandedPremadeTextById[p.id] === true;
    var hasAudio = !!(p.audioURL && String(p.audioURL).trim());
    var playingThis = activeAudioScriptId === p.id && activeAudio && !activeAudio.paused;
    var publishedVoiceID = premadePublishedVoiceId(p);
    var publishedBackgroundID = premadePublishedBackgroundId(p);
    var isBusy = isPremadeBusy(p.id);
    var playlistIconSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15V6"/><path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/><path d="M12 12H3"/><path d="M16 6H3"/><path d="M12 18H3"/></svg>';
    var showSyncRow = paid && hasAudio && isStreamableCloudPremade(p);
    var syncMessage = showSyncRow && !isBusy ? "Synced with cloud" : "";
    var syncColor = "#22c55e";
    var offlineIconHtml = "";
    if (paid && isStreamableCloudPremade(p)) {
      if (premadeOfflineObjectUrlCache[p.id]) {
        offlineIconHtml =
          '<button type="button" class="premade-offline-icon-btn" data-premade-action="remove-offline" data-premade-id="' +
          escapeHtml(p.id) +
          '" title="Remove offline download" aria-label="Remove offline download">✓☁️</button>';
      } else {
        offlineIconHtml =
          '<button type="button" class="premade-offline-icon-btn" data-premade-action="download-offline" data-premade-id="' +
          escapeHtml(p.id) +
          '" title="Download for offline" aria-label="Download for offline">☁️↓</button>';
      }
    }
    var syncFooterHtml = showSyncRow
      ? '<div class="premade-sync-row" style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;margin:0.45rem 0 0;">' +
        '<span class="app-muted" style="margin:0;font-size:0.78rem;line-height:1.4;color:' +
        syncColor +
        ';">' +
        escapeHtml(syncMessage) +
        "</span>" +
        offlineIconHtml +
        "</div>"
      : "";
    var audioControlsExpanded = controlsExpandedForPremade(p.id);
    var chevChar = audioControlsExpanded ? "▲" : "▼";
    var chipLabel = premadeLibraryCategoryDisplayName((p.categoryID || "").trim());
    var paidActionsHtml =
      '<button type="button" class="app-btn app-btn-primary script-card-edit-primary" data-premade-action="open-workshop" data-premade-id="' +
      escapeHtml(p.id) +
      '">Edit</button>' +
      '  <button type="button" class="app-btn app-btn-secondary" data-premade-action="play" data-premade-id="' +
      escapeHtml(p.id) +
      '"' +
      (!hasAudio || isBusy ? " disabled" : "") +
      ">" +
      (playingThis ? "Pause" : "Play") +
      "</button>" +
      '  <button type="button" class="app-btn app-btn-secondary library-script-share-btn" data-premade-action="add-playlist" data-premade-id="' +
      escapeHtml(p.id) +
      '" title="Save and add to playlist"' +
      (!currentPlaylists.length ? " disabled" : "") +
      ' aria-label="Save and add to playlist">' +
      playlistIconSvg +
      "</button>";
    var freeActionsHtml =
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
      (!hasAudio || isBusy ? " disabled" : "") +
      ">" +
      (playingThis ? "Pause" : "Play") +
      "</button>" +
      '  <button type="button" class="app-btn app-btn-ghost" data-premade-action="add-playlist" data-premade-id="' +
      escapeHtml(p.id) +
      '"' +
      (!currentPlaylists.length ? " disabled" : "") +
      ">Save + Add to Playlist</button>";
    var audioSection = audioControlsExpanded
      ? '<div class="premade-card-audio-section">' +
        (!paid
          ? '<p class="app-muted" style="margin:0 0 0.55rem;line-height:1.45;">Free plan: play, save to My Library, or add to a playlist. Upgrade to customize voice/background or generate new audio.</p>'
          : "") +
        '<div class="script-card-voice-bg-grid script-card-voice-bg-readonly">' +
        '  <span class="script-card-media-chip"><span class="script-card-media-chip-label">Voice</span> ' +
        escapeHtml(voiceNameById(publishedVoiceID)) +
        "</span>" +
        '  <span class="script-card-media-chip"><span class="script-card-media-chip-label">Background</span> ' +
        escapeHtml(backgroundNameById(publishedBackgroundID)) +
        "</span>" +
        "</div>" +
        '<div class="app-card-actions script-card-actions-bar">' +
        (paid ? paidActionsHtml : freeActionsHtml) +
        (adminModeEnabled && isStreamableCloudPremade(p)
          ? '  <button type="button" class="app-btn app-btn-secondary" data-premade-action="hide" data-premade-id="' +
            escapeHtml(p.id) +
            '">Hide</button>'
          : "") +
        (adminModeEnabled
          ? '  <button type="button" class="app-btn app-btn-secondary" data-premade-action="edit" data-premade-id="' +
            escapeHtml(p.id) +
            '">Edit</button>'
          : "") +
        "</div>" +
        syncFooterHtml +
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
          escapeHtml(resolvePremadeScriptText(p).trim() || "(No script text)") +
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
        } else if (action === "open-workshop") {
          openPremadeWorkshop(premade);
        } else if (action === "generate-audio") {
          if (!requireWebPaidTier(WEB_PAID_FEATURE_COPY.generate)) return;
          generateAudioForPremade(premade);
        } else if (action === "save") {
          savePremadeToMyLibrary(premade);
        } else if (action === "add-playlist") {
          addPremadeToPlaylist(premade);
        } else if (action === "edit") {
          openEditPremadeModal(premade);
        } else if (action === "hide") {
          if (!adminModeEnabled || !isStreamableCloudPremade(premade)) return;
          if (
            !window.confirm(
              'Hide "' +
                (premade.title || "this premade") +
                '" from the App Library?\n\nYou can restore it later from Hidden premades.'
            )
          ) {
            return;
          }
          btn.disabled = true;
          hidePremadeById(premade.id)
            .then(function () {
              showAppBanner("Premade hidden", "Removed from the live App Library.", "success", { duration: 5000 });
            })
            .catch(function (e) {
              showAppBanner("Hide failed", e.message || "Could not hide premade.", "error", { duration: 7000 });
            })
            .finally(function () {
              btn.disabled = false;
            });
        } else if (action === "play") {
          togglePlayScriptAudio(premadeToScript(premade));
        } else if (action === "download-offline") {
          if (!requireWebPaidTier(WEB_PAID_FEATURE_COPY.offlineDownload)) return;
          btn.disabled = true;
          downloadPremadeForOffline(premade)
            .then(function () {
              showAppBanner("Downloaded", "You can play this premade offline in this browser.", "success", {
                duration: 5000,
              });
              renderPremade();
            })
            .catch(function (e) {
              showAppBanner("Download failed", e.message || "Could not download premade.", "error", {
                duration: 7000,
              });
            })
            .finally(function () {
              btn.disabled = false;
            });
        } else if (action === "remove-offline") {
          removePremadeOfflineDownload(premade.id)
            .then(function () {
              renderPremade();
            })
            .catch(function () {
              showAppBanner("Could not remove download", "Try again.", "error", { duration: 5000 });
            });
        }
      });
    });
    list.querySelectorAll("[data-premade-media-open]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var pid = btn.getAttribute("data-premade-media-open");
        var field = btn.getAttribute("data-premade-media-field");
        if (!pid || !field) return;
        if (!requireWebPaidTier(WEB_PAID_FEATURE_COPY.generate)) return;
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
    var displayPremade = filteredPremadesForDisplay(currentPremade);
    var grouped = groupPremadesByLibraryCategory(displayPremade);
    var hasSearch = !!normalizeSectionSearchQuery(sectionSearchQuery.library);

    function finishListHtml(html) {
      list.innerHTML = renderHiddenPremadesAdminSection() + html;
      bindPremadeCategoryNavActions();
      bindHiddenPremadeAdminActions();
      updatePremadeExpandAllToggleUi();
    }

    function finishDetailHtml(html) {
      list.innerHTML = renderHiddenPremadesAdminSection() + html;
      bindPremadeCardActions();
      bindPremadeCategoryNavActions();
      bindHiddenPremadeAdminActions();
      updatePremadeExpandAllToggleUi();
    }

    if (activePremadeCategoryId) {
      var catName = premadeLibraryCategoryDisplayName(activePremadeCategoryId);
      var items =
        activePremadeCategoryId === "__other__"
          ? grouped.other
          : grouped.byId[activePremadeCategoryId] || [];
      if (!items.length) {
        finishDetailHtml(premadeCategoryDetailHtml(activePremadeCategoryId, catName, [], {}));
        return;
      }
      var gen = ++premadeRenderGeneration;
      Promise.all(
        items.map(function (p) {
          return scriptContentSha256Hex(premadeDigestSourceFromPremade(p));
        })
      ).then(function (hashes) {
        if (gen !== premadeRenderGeneration) return;
        var hashMap = {};
        items.forEach(function (p, i) {
          hashMap[p.id] = hashes[i];
        });
        finishDetailHtml(premadeCategoryDetailHtml(activePremadeCategoryId, catName, items, hashMap));
      });
      return;
    }

    if (!currentPremade.length) {
      finishListHtml(
        '<p class="app-muted" style="margin:0 0 0.85rem;">No premade items in Firestore yet. iOS can also read bundled premade audio; web lists published docs from <code>premadeAudio</code>. Pick a category below to browse.</p>' +
          premadeCategoryListHtml(groupPremadesByLibraryCategory([]))
      );
      return;
    }

    if (hasSearch && !displayPremade.length) {
      finishListHtml(
        '<p class="app-muted" style="margin:0 0 0.85rem;">No premade scripts match your search.</p>'
      );
      return;
    }

    finishListHtml(premadeCategoryListHtml(grouped));
  }

  function subscribeBackgroundCatalog() {
    teardownBackgroundCatalogListener();
    backgroundCatalogUnsubscribe = backgroundCatalogCollection()
      .where("active", "==", true)
      .onSnapshot(
        function (snap) {
          currentBackgroundCatalog = snap.docs
            .map(function (doc) {
              var data = doc.data() || {};
              return {
                id: doc.id,
                name: data.name || "Background",
                categoryID: (data.categoryID && String(data.categoryID).trim()) || "general",
                file: "",
                audioURL: (data.audioURL && String(data.audioURL).trim()) || "",
                accessTier: catalogAccessTierFromData(data),
                isCloudCatalog: true,
              };
            })
            .sort(function (a, b) {
              return String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
            });
          applyUserProfileDefaults({ onlyIfNewer: true });
          if (activeAdminTab === "audio") renderAudioPage();
          if (activeAdminTab === "library") renderPremade();
          rerenderMyLibraryCardsIfNeeded();
        },
        function () {
          currentBackgroundCatalog = [];
          if (activeAdminTab === "audio") renderAudioPage();
          rerenderMyLibraryCardsIfNeeded();
        }
      );
  }

  function parsePremadeFirestoreDoc(doc) {
    var data = doc.data() || {};
    var premade = {
      id: doc.id,
      title: data.title || "",
      categoryID: data.categoryID || "",
      description: data.description || "",
      scriptText: data.scriptText || "",
      audioURL: (data.audioURL && String(data.audioURL).trim()) || resolvePremadeStaticAudioURLFromData(data),
      accessTier: catalogAccessTierFromData(data),
      isCloudCatalog: true,
      storagePath: data.storagePath || "",
      voiceID: (data.voiceID && String(data.voiceID).trim()) || "",
      backgroundID: (data.backgroundID && String(data.backgroundID).trim()) || "",
      sourceScriptID: data.sourceScriptID || "",
      createdByUID: data.createdByUID || "",
      createdByEmail: data.createdByEmail || "",
      createdByName: data.createdByName || "",
      createdAt: data.createdAt || null,
      active: data.active !== false,
    };
    premade.scriptText = resolvePremadeScriptText(premade);
    return premade;
  }

  function sortPremadeByCreatedAtDesc(list) {
    return list.slice().sort(function (a, b) {
      var at = a.createdAt && typeof a.createdAt.toMillis === "function" ? a.createdAt.toMillis() : 0;
      var bt = b.createdAt && typeof b.createdAt.toMillis === "function" ? b.createdAt.toMillis() : 0;
      return bt - at;
    });
  }

  function renderHiddenPremadesAdminSection() {
    if (!adminModeEnabled) return "";
    var count = currentHiddenPremade.length;
    var intro =
      '<p class="app-muted" style="margin:0.5rem 0 0.65rem;font-size:0.88rem;line-height:1.45;">Removed from the live App Library but kept in Firestore and Storage. Restore or delete permanently.</p>';
    if (!count) {
      return (
        '<details class="admin-hidden-premades-panel" style="margin:0 0 1rem;padding:0.75rem;border:1px solid var(--border-subtle,#e5e7eb);border-radius:0.6rem;">' +
        '<summary style="cursor:pointer;font-weight:600;">Hidden premades (0)</summary>' +
        intro +
        '<p class="app-muted" style="margin:0.35rem 0 0;">No hidden premades yet.</p>' +
        "</details>"
      );
    }
    var rows = currentHiddenPremade
      .map(function (p) {
        return (
          '<div class="admin-hidden-premade-row" style="display:flex;align-items:center;gap:0.5rem;padding:0.45rem 0;border-bottom:1px solid var(--border-subtle,#e5e7eb);">' +
          '<div style="flex:1;min-width:0;"><strong>' +
          escapeHtml(p.title || "Untitled") +
          '</strong><br><span class="app-muted" style="font-size:0.82rem;">' +
          escapeHtml(premadeLibraryCategoryDisplayName((p.categoryID || "").trim())) +
          "</span></div>" +
          '<button type="button" class="app-btn app-btn-secondary" data-hidden-premade-action="restore" data-hidden-premade-id="' +
          escapeHtml(p.id) +
          '">Restore</button>' +
          '<button type="button" class="app-btn app-btn-danger" data-hidden-premade-action="delete" data-hidden-premade-id="' +
          escapeHtml(p.id) +
          '">Delete</button>' +
          "</div>"
        );
      })
      .join("");
    return (
      '<details class="admin-hidden-premades-panel" open style="margin:0 0 1rem;padding:0.75rem;border:1px solid var(--border-subtle,#e5e7eb);border-radius:0.6rem;">' +
      '<summary style="cursor:pointer;font-weight:600;">Hidden premades (' +
      count +
      ")</summary>" +
      intro +
      rows +
      "</details>"
    );
  }

  function bindHiddenPremadeAdminActions() {
    var list = document.getElementById("premade-list");
    if (!list) return;
    list.querySelectorAll("[data-hidden-premade-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!adminModeEnabled) return;
        var action = btn.getAttribute("data-hidden-premade-action");
        var pid = btn.getAttribute("data-hidden-premade-id");
        if (!pid) return;
        var premade = currentHiddenPremade.find(function (x) {
          return x.id === pid;
        });
        var title = (premade && premade.title) || "this premade";
        if (action === "restore") {
          btn.disabled = true;
          restorePremadeById(pid)
            .then(function () {
              showAppBanner("Premade restored", '"' + title + '" is live again.', "success", { duration: 5000 });
            })
            .catch(function (e) {
              showAppBanner("Restore failed", e.message || "Could not restore premade.", "error", { duration: 7000 });
            })
            .finally(function () {
              btn.disabled = false;
            });
        } else if (action === "delete") {
          if (
            !window.confirm(
              'Permanently delete "' +
                title +
                '"?\n\nThis removes the Firestore record and Storage audio. This cannot be undone.'
            )
          ) {
            return;
          }
          btn.disabled = true;
          deletePremadePermanentlyById(pid)
            .then(function () {
              showAppBanner("Premade deleted", '"' + title + '" was permanently removed.', "success", {
                duration: 5000,
              });
            })
            .catch(function (e) {
              showAppBanner("Delete failed", e.message || "Could not delete premade.", "error", { duration: 7000 });
            })
            .finally(function () {
              btn.disabled = false;
            });
        }
      });
    });
  }

  function subscribePremade() {
    teardownPremadeListener();
    premadeUnsubscribe = premadeCollection().onSnapshot(
      function (snap) {
        var parsed = snap.docs.map(parsePremadeFirestoreDoc);
        var cloudPremade = sortPremadeByCreatedAtDesc(
          parsed.filter(function (p) {
            return p.active !== false;
          })
        );
        currentHiddenPremade = sortPremadeByCreatedAtDesc(
          parsed.filter(function (p) {
            return p.active === false;
          })
        );
        currentPremade = mergeCloudAndStaticPremades(cloudPremade);
        var nextExpanded = {};
        currentPremade.forEach(function (p) {
          if (expandedPremadeTextById[p.id] === true) nextExpanded[p.id] = true;
        });
        expandedPremadeTextById = nextExpanded;
        updateTabCounts();
        Promise.all(currentPremade.map(seedPremadeContentHashIfNeeded))
          .then(function () {
            renderPremade();
            var offlineIds = currentPremade.filter(isStreamableCloudPremade).map(function (p) {
              return p.id;
            });
            return hydratePremadeOfflineCacheFromIdb(offlineIds);
          })
          .then(function () {
            if (activeAdminTab === "library") renderPremade();
          });
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
            settings: data.settings || null,
          };
        });
        applyUserProfileDefaults({ onlyIfNewer: true });
        if (activeAdminTab === "voices") renderVoices();
        rerenderMyLibraryCardsIfNeeded();
      },
      function (_e) {
        currentClonedVoices = [];
        if (activeAdminTab === "voices") renderVoices();
        rerenderMyLibraryCardsIfNeeded();
      }
    );
  }

  function subscribeIncomingSharedScripts(uid) {
    if (typeof incomingSharedUnsubscribe === "function") {
      incomingSharedUnsubscribe();
      incomingSharedUnsubscribe = null;
    }
    incomingSharedUnsubscribe = db
      .collection("users")
      .doc(uid)
      .collection("incomingSharedScripts")
      .onSnapshot(
        function (snap) {
          var incoming = snap.docs
            .map(scriptFromIncomingDocument)
            .filter(function (x) {
              return !!x;
            });
          filterEntitledIncomingScripts(uid, incoming).then(function (entitled) {
            incomingSharedScripts = entitled;
            rebuildCurrentScriptsFromSources();
          });
        },
        function (e) {
          incomingSharedScripts = [];
          rebuildCurrentScriptsFromSources();
          setMessage(e.message || "Could not load shared scripts.", "error");
        }
      );
  }

  function subscribeScripts(uid) {
    if (typeof scriptsUnsubscribe === "function") {
      scriptsUnsubscribe();
      scriptsUnsubscribe = null;
    }
    ownedScripts = [];
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
              audioCreatedAt: data.audioCreatedAt || null,
              audioContentHash: (data.audioContentHash && String(data.audioContentHash).trim()) || "",
              audioVoiceID: (data.audioVoiceID && String(data.audioVoiceID).trim()) || "",
              audioBackgroundID: (data.audioBackgroundID && String(data.audioBackgroundID).trim()) || "",
            };
          });
          scripts.forEach(function (s) {
            if (s.audioContentHash && getStoredGeneratedHash(s.id) !== s.audioContentHash) {
              setStoredGeneratedHash(s.id, s.audioContentHash);
            }
            ensureFrozenAudioSettingsCached(s);
          });
          ownedScripts = scripts;
          rebuildCurrentScriptsFromSources();
        },
        function (e) {
          ownedScripts = [];
          rebuildCurrentScriptsFromSources();
          setMessage(e.message || "Could not load scripts.", "error");
        }
      );
    subscribeIncomingSharedScripts(uid);
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
          } else if (savedTab === "backgrounds") {
            activeAdminTab = "audio";
            try {
              localStorage.setItem(ADMIN_TAB_STORAGE_KEY, "audio");
            } catch (_eTabm) {}
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
        applyUserProfileDefaults({ forceVersion: true });
        var isAdmin = snap.exists && snap.data().isAdmin === true;
        if (isAdmin) {
          adminModeEnabled = readAdminModeEnabled();
          renderAdminShell(user.email, user.displayName);
          handleStripeAndAccountQueryParams();
          subscribeUserProfile(user.uid);
          subscribeScripts(user.uid);
          subscribePlaylists(user.uid);
          subscribePremade();
          subscribeBackgroundCatalog();
          subscribeClonedVoices(user.uid);
          subscribeUserBackgrounds(user.uid);
          subscribeListeningStats(user.uid);
          maybePresentPendingShareClaim();
        } else {
          renderNonAdmin(user.email, user.displayName);
        }
      })
      .catch(function () {
        renderNonAdmin(user.email, user.displayName);
      });
  });
})();
