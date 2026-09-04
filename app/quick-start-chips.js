(function (global) {
  function modeOf(mode) {
    var v = String(mode || "").toLowerCase();
    if (v === "getting-ready" || v === "in-the-moment" || v === "after") return v;
    return "getting-ready";
  }

  function topicPrompt(categoryId) {
    switch (categoryId) {
      case "confidence":
        return "What's the confidence piece, really?";
      case "relationships":
        return "What's this about in your relationships?";
      case "success-prosperity":
        return "What's this about in work, money, or a goal?";
      case "mental-wellbeing":
        return "What's the mental piece you want this for?";
      case "health-fitness":
        return "What's this about for your body?";
      case "sports-performance":
        return "What's this about in sport or training?";
      case "sleep-rest":
        return "What kind of rest is this for?";
      case "i-am":
        return "What do you want to claim?";
      default:
        return "What's this actually about?";
    }
  }

  function topicChips(categoryId) {
    switch (categoryId) {
      case "confidence":
        return [
          "How I see myself",
          "Speaking up",
          "Walking into a room or moment",
          "Handling pressure or criticism",
          "Not one event — how I want to feel in general",
        ];
      case "relationships":
        return [
          "A relationship I want to feel better in",
          "A conversation I need to have",
          "A boundary I want to hold",
          "How I show up with people",
          "Not one event — how I want to feel with people",
        ];
      case "success-prosperity":
        return [
          "Work I'm in the middle of",
          "Money or a decision",
          "A goal I'm building toward",
          "How I show up professionally",
          "Not one event — how I want to work in general",
        ];
      case "mental-wellbeing":
        return [
          "Feeling more steady in general",
          "A hard stretch of the day",
          "My mind is loud",
          "Coming down from something",
          "Not one event — I want to feel more like myself",
        ];
      case "health-fitness":
        return [
          "Movement or a workout",
          "Food or how I treat my body",
          "Rest and recovery",
          "A habit I want to live",
          "How I feel in my body overall",
        ];
      case "sports-performance":
        return [
          "A game or competition",
          "Practice or training",
          "How I compete in general",
          "Recovering after",
          "Who I am as an athlete",
        ];
      case "sleep-rest":
        return [
          "Falling asleep",
          "Staying asleep / resting",
          "Winding down at night",
          "Waking up gently",
          "Rest in general — not one night",
        ];
      case "i-am":
        return [
          "Who I already am",
          "Who I'm becoming",
          "A few truths I want to live",
          "How I want to show up today",
          "A quality I want to claim",
        ];
      default:
        return [
          "Something specific going on",
          "How I want to feel in general",
          "A change I want to live",
          "A part of my day",
          "A quality I want more of",
        ];
    }
  }

  function scenePrompt(mode, categoryId) {
    var m = modeOf(mode);
    if (categoryId === "sleep-rest") {
      if (m === "in-the-moment") return "Where are you while this plays?";
      if (m === "after") return "Where are you as you wake?";
      return "Where are you as you wind down?";
    }
    if (m === "in-the-moment") return "What's going on around you while this plays?";
    if (m === "after") return "Where are you when you press play afterward?";
    return "Where are you when you press play?";
  }

  function sceneChips(categoryId, mode) {
    var m = modeOf(mode);
    if (categoryId === "sleep-rest") {
      if (m === "in-the-moment") {
        return ["Lying in bed", "Resting with my eyes closed", "Falling asleep", "Not a specific place"];
      }
      if (m === "after") {
        return ["Just waking up", "A slow morning", "Still in bed", "Not a specific place"];
      }
      return ["On the sofa or winding down", "Starting bedtime", "After a bath or shower", "Not a specific place"];
    }
    if (m === "in-the-moment") {
      return [
        "I'm in the middle of it",
        "I'm with other people",
        "I'm on my own",
        "A regular stretch of the day",
        "Not a specific scene — stay with the feeling",
      ];
    }
    if (m === "after") {
      return [
        "It just ended",
        "I'm coming down",
        "Closing the day",
        "I'm alone with it now",
        "Not a specific scene — stay with the feeling",
      ];
    }
    return [
      "Getting ready at home",
      "In the car or on the way",
      "Right before I walk in",
      "Starting a part of my day",
      "Not a specific place or event",
    ];
  }

  function feelingChips(categoryId, mode) {
    var m = modeOf(mode);
    if (categoryId === "sleep-rest") {
      return m === "after"
        ? ["Unhurried and light", "Softly awake", "At ease in my body", "No pep talk"]
        : ["Heavy and safe", "Quiet in my mind", "Warm and sinking", "Done with the day"];
    }
    switch (categoryId) {
      case "confidence":
        return ["Steady and sure of myself", "Calm in my body", "Clear and myself", "Ready without performing"];
      case "relationships":
        return ["Open and at ease", "Clear and kind", "Connected without losing me", "Warm and grounded"];
      case "success-prosperity":
        return ["Capable and in motion", "Clear and focused", "Calm and decisive", "Forward without strain"];
      case "mental-wellbeing":
        return m === "after"
          ? ["Quieter and safer", "More myself", "Settled in my body", "Soft and steady"]
          : ["Steady in my body", "Clear and present", "Safe enough to continue", "Quiet and myself"];
      case "health-fitness":
        return ["Strong and at ease", "Present in my body", "Energized without forcing", "Kind with myself"];
      case "sports-performance":
        if (m === "in-the-moment") {
          return ["Locked in", "Loose and aggressive", "Trusting my training", "Here, this breath"];
        }
        if (m === "after") {
          return ["Complete, not still spinning", "Proud of how I competed", "Ready to recover", "Clear and reset"];
        }
        return ["Ready and locked in", "Loose and confident", "Trusting my work", "Sharp and calm"];
      case "i-am":
        return ["Solid in who I am", "Clear and claimed", "At home in myself", "True without proving"];
      default:
        return ["Steady and present", "Calm in my body", "Clear and myself", "Ready for this"];
    }
  }

  function jobChips(mode, categoryId) {
    var m = modeOf(mode);
    if (categoryId === "sleep-rest") {
      if (m === "in-the-moment") {
        return ["Keep me with rest", "Help me fall asleep", "Stay quiet and close", "Don't stir me up"];
      }
      if (m === "after") {
        return ["Wake me gently", "No rush to start", "Keep it light", "Let the day arrive slowly"];
      }
      return ["Help me put the day down", "Settle my body", "Get me ready for rest", "Quiet my mind"];
    }
    if (m === "in-the-moment") {
      return ["Keep me here", "Keep me steady while it's happening", "Help me stay with it", "Don't let me spin"];
    }
    if (m === "after") {
      return ["Help me let it complete", "Keep what I want from it", "Help me come down", "Close this part of the day"];
    }
    return [
      "Walk me in already being that person",
      "Get me ready without hype",
      "Remind me who I am",
      "Quiet the noise so I can start",
    ];
  }

  global.QuickStartChips = {
    QUESTION_COUNT: 4,
    questions: function (categoryId, mode) {
      return [
        {
          id: "topic",
          prompt: topicPrompt(categoryId),
          shortLabel: "What this is about",
          chips: topicChips(categoryId),
        },
        {
          id: "scene",
          prompt: scenePrompt(mode, categoryId),
          shortLabel: "When this plays",
          chips: sceneChips(categoryId, mode),
        },
        {
          id: "feeling",
          prompt: "How do you want to feel while it plays?",
          shortLabel: "How they want to feel",
          chips: feelingChips(categoryId, mode),
        },
        {
          id: "job",
          prompt: "What should this audio do for you?",
          shortLabel: "What the audio should do",
          chips: jobChips(mode, categoryId),
        },
      ];
    },
  };
})(window);
