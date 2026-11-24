/* Generated from FocuShift functions/writer/personal-questions.json (questionsFor). Do not edit the table by hand. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PersonalQuestions = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var HINT = "We'll size the listen to what you share";
  var OPTIONAL_HEADING = "Add more if you like (makes it more personal and can make it longer)";
  var TABLE = {
  "confidence|moment|getting-ready": [
    {
      "slot": "situation",
      "required": true,
      "text": "What's coming up, and when? (presenting to my director Monday, a hard call, walking into a room)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "As you walk into it, how do you want to feel, and how do you want to carry yourself?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "pastProof",
      "required": false,
      "text": "Have you handled something like this well before? A sentence or two is plenty.",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "firstStep",
      "required": false,
      "text": "What's the first thing you'll do or say when it starts?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "obstacle",
      "required": false,
      "text": "What usually gets in the way right before? (optional: the script won't repeat it)",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "confidence|moment|in-the-moment": [
    {
      "slot": "situation",
      "required": true,
      "text": "Where are you while this plays, and what's happening? (presenting to my director Monday, a hard call, walking into a room)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel and act right now, in the middle of it?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "cue",
      "required": false,
      "text": "A word or short phrase you can come back to while you're in it?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "pastProof",
      "required": false,
      "text": "A time you've been in this before and it went well?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "obstacle",
      "required": false,
      "text": "What tends to pull you out of it?",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "confidence|moment|after": [
    {
      "slot": "situation",
      "required": true,
      "text": "What just finished? (presenting to my director Monday, a hard call, walking into a room)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel now that it's done?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "keepLetGo",
      "required": false,
      "text": "One thing you did that you want to remember, even a small one?",
      "placeholder": "",
      "help": "",
      "part": "keep"
    },
    {
      "slot": "keepLetGo",
      "required": false,
      "text": "Anything you'd like to set down from it?",
      "placeholder": "",
      "help": "",
      "part": "release"
    }
  ],
  "confidence|repeat|getting-ready": [
    {
      "slot": "situation",
      "required": true,
      "text": "What kind of moment is this for? No date needed. (presenting to my director Monday, a hard call, walking into a room)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel heading into them?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "beliefs",
      "required": false,
      "text": "What do you want to believe about yourself on those days? One per line.",
      "placeholder": "One idea per line",
      "help": "",
      "part": ""
    },
    {
      "slot": "pastProof",
      "required": false,
      "text": "A time you already felt that way?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "obstacle",
      "required": false,
      "text": "What usually gets in the way? (optional)",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "confidence|repeat|in-the-moment": [
    {
      "slot": "situation",
      "required": true,
      "text": "What are you usually doing while this plays? (presenting to my director Monday, a hard call, walking into a room)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel while you're in it?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "cue",
      "required": false,
      "text": "A word or short phrase that brings you back?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "beliefs",
      "required": false,
      "text": "What do you want to believe while you're in it? One per line.",
      "placeholder": "One idea per line",
      "help": "",
      "part": ""
    },
    {
      "slot": "obstacle",
      "required": false,
      "text": "What usually pulls you out?",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "confidence|repeat|after": [
    {
      "slot": "situation",
      "required": true,
      "text": "What part of your day does this close out? (presenting to my director Monday, a hard call, walking into a room)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel once it's done?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "keepLetGo",
      "required": false,
      "text": "What do you want to keep from days like this?",
      "placeholder": "",
      "help": "",
      "part": "keep"
    },
    {
      "slot": "keepLetGo",
      "required": false,
      "text": "What would you like to leave behind at the end of it?",
      "placeholder": "",
      "help": "",
      "part": "release"
    },
    {
      "slot": "beliefs",
      "required": false,
      "text": "Anything you want to believe about yourself at the end of the day? One per line.",
      "placeholder": "One idea per line",
      "help": "",
      "part": ""
    }
  ],
  "relationships|moment|getting-ready": [
    {
      "slot": "situation",
      "required": true,
      "text": "What's coming up, and when? (a hard talk, dinner with my sister, the school pickup)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "people",
      "required": true,
      "text": "Who is it with? A first name is fine.",
      "placeholder": "A first name",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "As you walk into it, how do you want to feel, and how do you want to carry yourself?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "whyItMatters",
      "required": false,
      "text": "What do you want them to feel from you?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "obstacle",
      "required": false,
      "text": "What tends to happen between you that you'd like to go differently?",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "relationships|moment|in-the-moment": [
    {
      "slot": "situation",
      "required": true,
      "text": "Where are you while this plays, and what's happening? (a hard talk, dinner with my sister, the school pickup)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "people",
      "required": true,
      "text": "Who is it with? A first name is fine.",
      "placeholder": "A first name",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel and act right now, in the middle of it?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "cue",
      "required": false,
      "text": "A word or short phrase you can come back to while you're in it?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "obstacle",
      "required": false,
      "text": "What tends to happen between you that you'd like to go differently?",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "relationships|moment|after": [
    {
      "slot": "situation",
      "required": true,
      "text": "What just finished? (a hard talk, dinner with my sister, the school pickup)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "people",
      "required": true,
      "text": "Who is it with? A first name is fine.",
      "placeholder": "A first name",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel now that it's done?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "keepLetGo",
      "required": false,
      "text": "One thing you did that you want to remember, even a small one?",
      "placeholder": "",
      "help": "",
      "part": "keep"
    },
    {
      "slot": "keepLetGo",
      "required": false,
      "text": "Anything you'd like to set down from it?",
      "placeholder": "",
      "help": "",
      "part": "release"
    }
  ],
  "relationships|repeat|getting-ready": [
    {
      "slot": "situation",
      "required": true,
      "text": "What kind of conversations or time with someone is this for? No date needed. (a hard talk, dinner with my sister, the school pickup)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "people",
      "required": true,
      "text": "Who is it with? A first name is fine.",
      "placeholder": "A first name",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel heading into them?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "beliefs",
      "required": false,
      "text": "What do you want to believe about yourself on those days? One per line.",
      "placeholder": "One idea per line",
      "help": "",
      "part": ""
    },
    {
      "slot": "obstacle",
      "required": false,
      "text": "What tends to happen between you that you'd like to go differently?",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "relationships|repeat|in-the-moment": [
    {
      "slot": "situation",
      "required": true,
      "text": "What are you usually doing while this plays? (a hard talk, dinner with my sister, the school pickup)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "people",
      "required": true,
      "text": "Who is it with? A first name is fine.",
      "placeholder": "A first name",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel while you're in it?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "cue",
      "required": false,
      "text": "A word or short phrase that brings you back?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "obstacle",
      "required": false,
      "text": "What tends to happen between you that you'd like to go differently?",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "relationships|repeat|after": [
    {
      "slot": "situation",
      "required": true,
      "text": "What part of your day does this close out? (a hard talk, dinner with my sister, the school pickup)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "people",
      "required": true,
      "text": "Who is it with? A first name is fine.",
      "placeholder": "A first name",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel once it's done?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "keepLetGo",
      "required": false,
      "text": "What do you want to keep from days like this?",
      "placeholder": "",
      "help": "",
      "part": "keep"
    },
    {
      "slot": "keepLetGo",
      "required": false,
      "text": "What would you like to leave behind at the end of it?",
      "placeholder": "",
      "help": "",
      "part": "release"
    }
  ],
  "success-prosperity|moment|getting-ready": [
    {
      "slot": "situation",
      "required": true,
      "text": "What's coming up, and when? (the proposal, Monday's call, the next page of the work)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "As you walk into it, how do you want to feel, and how do you want to carry yourself?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "firstStep",
      "required": true,
      "text": "What's the next concrete step, and when/where will you do it?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "whyItMatters",
      "required": false,
      "text": "What will it make possible?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "obstacle",
      "required": false,
      "text": "What usually stops that step?",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "success-prosperity|moment|in-the-moment": [
    {
      "slot": "situation",
      "required": true,
      "text": "Where are you while this plays, and what's happening? (the proposal, Monday's call, the next page of the work)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel and act right now, in the middle of it?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "cue",
      "required": false,
      "text": "A word or short phrase you can come back to while you're in it?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "whyItMatters",
      "required": false,
      "text": "What will it make possible?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "obstacle",
      "required": false,
      "text": "What usually stops that step?",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "success-prosperity|moment|after": [
    {
      "slot": "situation",
      "required": true,
      "text": "What just finished? (the proposal, Monday's call, the next page of the work)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel now that it's done?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "keepLetGo",
      "required": false,
      "text": "One thing you did that you want to remember, even a small one?",
      "placeholder": "",
      "help": "",
      "part": "keep"
    },
    {
      "slot": "keepLetGo",
      "required": false,
      "text": "Anything you'd like to set down from it?",
      "placeholder": "",
      "help": "",
      "part": "release"
    },
    {
      "slot": "whyItMatters",
      "required": false,
      "text": "What will it make possible?",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "success-prosperity|repeat|getting-ready": [
    {
      "slot": "situation",
      "required": true,
      "text": "What kind of moment is this for? No date needed. (the proposal, Monday's call, the next page of the work)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel heading into them?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "firstStep",
      "required": true,
      "text": "What's the next concrete step, and when/where will you do it?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "whyItMatters",
      "required": false,
      "text": "What will it make possible?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "obstacle",
      "required": false,
      "text": "What usually stops that step?",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "success-prosperity|repeat|in-the-moment": [
    {
      "slot": "situation",
      "required": true,
      "text": "What are you usually doing while this plays? (the proposal, Monday's call, the next page of the work)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel while you're in it?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "cue",
      "required": false,
      "text": "A word or short phrase that brings you back?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "beliefs",
      "required": false,
      "text": "What do you want to believe while you're in it? One per line.",
      "placeholder": "One idea per line",
      "help": "",
      "part": ""
    },
    {
      "slot": "whyItMatters",
      "required": false,
      "text": "What will it make possible?",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "success-prosperity|repeat|after": [
    {
      "slot": "situation",
      "required": true,
      "text": "What part of your day does this close out? (the proposal, Monday's call, the next page of the work)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel once it's done?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "keepLetGo",
      "required": false,
      "text": "What do you want to keep from days like this?",
      "placeholder": "",
      "help": "",
      "part": "keep"
    },
    {
      "slot": "keepLetGo",
      "required": false,
      "text": "What would you like to leave behind at the end of it?",
      "placeholder": "",
      "help": "",
      "part": "release"
    },
    {
      "slot": "whyItMatters",
      "required": false,
      "text": "What will it make possible?",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "mental-wellbeing|moment|getting-ready": [
    {
      "slot": "situation",
      "required": true,
      "text": "What's coming up, and when? (a heavy afternoon, the commute home, sitting with it)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "As you walk into it, how do you want to feel, and how do you want to carry yourself?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "firstStep",
      "required": false,
      "text": "What helps you, even a little, when it gets heavy?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "cue",
      "required": false,
      "text": "Something kind you'd say to a friend in this spot?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "obstacle",
      "required": false,
      "text": "What usually gets in the way right before? (optional: the script won't repeat it)",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "mental-wellbeing|moment|in-the-moment": [
    {
      "slot": "situation",
      "required": true,
      "text": "Where are you while this plays, and what's happening? (a heavy afternoon, the commute home, sitting with it)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel and act right now, in the middle of it?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "firstStep",
      "required": false,
      "text": "What helps you, even a little, when it gets heavy?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "cue",
      "required": false,
      "text": "Something kind you'd say to a friend in this spot?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "obstacle",
      "required": false,
      "text": "What tends to pull you out of it?",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "mental-wellbeing|moment|after": [
    {
      "slot": "situation",
      "required": true,
      "text": "What just finished? (a heavy afternoon, the commute home, sitting with it)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel now that it's done?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "firstStep",
      "required": false,
      "text": "What helps you, even a little, when it gets heavy?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "cue",
      "required": false,
      "text": "Something kind you'd say to a friend in this spot?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "keepLetGo",
      "required": false,
      "text": "One thing you did that you want to remember, even a small one?",
      "placeholder": "",
      "help": "",
      "part": "keep"
    }
  ],
  "mental-wellbeing|repeat|getting-ready": [
    {
      "slot": "situation",
      "required": true,
      "text": "What kind of moment is this for? No date needed. (a heavy afternoon, the commute home, sitting with it)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel heading into them?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "firstStep",
      "required": false,
      "text": "What helps you, even a little, when it gets heavy?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "cue",
      "required": false,
      "text": "Something kind you'd say to a friend in this spot?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "beliefs",
      "required": false,
      "text": "What do you want to believe about yourself on those days? One per line.",
      "placeholder": "One idea per line",
      "help": "",
      "part": ""
    }
  ],
  "mental-wellbeing|repeat|in-the-moment": [
    {
      "slot": "situation",
      "required": true,
      "text": "What are you usually doing while this plays? (a heavy afternoon, the commute home, sitting with it)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel while you're in it?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "firstStep",
      "required": false,
      "text": "What helps you, even a little, when it gets heavy?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "cue",
      "required": false,
      "text": "Something kind you'd say to a friend in this spot?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "beliefs",
      "required": false,
      "text": "What do you want to believe while you're in it? One per line.",
      "placeholder": "One idea per line",
      "help": "",
      "part": ""
    }
  ],
  "mental-wellbeing|repeat|after": [
    {
      "slot": "situation",
      "required": true,
      "text": "What part of your day does this close out? (a heavy afternoon, the commute home, sitting with it)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel once it's done?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "firstStep",
      "required": false,
      "text": "What helps you, even a little, when it gets heavy?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "cue",
      "required": false,
      "text": "Something kind you'd say to a friend in this spot?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "beliefs",
      "required": false,
      "text": "Anything you want to believe about yourself at the end of the day? One per line.",
      "placeholder": "One idea per line",
      "help": "",
      "part": ""
    }
  ],
  "health-fitness|moment|getting-ready": [
    {
      "slot": "situation",
      "required": true,
      "text": "What's coming up, and when? (a walk, a meal, the workout, a stretch)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "As you walk into it, how do you want to feel, and how do you want to carry yourself?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "whyItMatters",
      "required": false,
      "text": "Why does it matter to you, in your words?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "firstStep",
      "required": false,
      "text": "What's the first thing you'll do or say when it starts?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "obstacle",
      "required": false,
      "text": "What usually gets in the way right before? (optional: the script won't repeat it)",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "health-fitness|moment|in-the-moment": [
    {
      "slot": "situation",
      "required": true,
      "text": "Where are you while this plays, and what's happening? (a walk, a meal, the workout, a stretch)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel and act right now, in the middle of it?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "whyItMatters",
      "required": false,
      "text": "Why does it matter to you, in your words?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "cue",
      "required": false,
      "text": "A word or short phrase you can come back to while you're in it?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "obstacle",
      "required": false,
      "text": "What tends to pull you out of it?",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "health-fitness|moment|after": [
    {
      "slot": "situation",
      "required": true,
      "text": "What just finished? (a walk, a meal, the workout, a stretch)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel now that it's done?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "whyItMatters",
      "required": false,
      "text": "Why does it matter to you, in your words?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "keepLetGo",
      "required": false,
      "text": "One thing you did that you want to remember, even a small one?",
      "placeholder": "",
      "help": "",
      "part": "keep"
    },
    {
      "slot": "keepLetGo",
      "required": false,
      "text": "Anything you'd like to set down from it?",
      "placeholder": "",
      "help": "",
      "part": "release"
    }
  ],
  "health-fitness|repeat|getting-ready": [
    {
      "slot": "situation",
      "required": true,
      "text": "What kind of moment is this for? No date needed. (a walk, a meal, the workout, a stretch)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel heading into them?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "whyItMatters",
      "required": false,
      "text": "Why does it matter to you, in your words?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "firstStep",
      "required": false,
      "text": "What's a version you can do even on a busy day?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "obstacle",
      "required": false,
      "text": "What usually gets in the way? (optional)",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "health-fitness|repeat|in-the-moment": [
    {
      "slot": "situation",
      "required": true,
      "text": "What are you usually doing while this plays? (a walk, a meal, the workout, a stretch)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel while you're in it?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "whyItMatters",
      "required": false,
      "text": "Why does it matter to you, in your words?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "firstStep",
      "required": false,
      "text": "What's a version you can do even on a busy day?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "beliefs",
      "required": false,
      "text": "What do you want to believe while you're in it? One per line.",
      "placeholder": "One idea per line",
      "help": "",
      "part": ""
    }
  ],
  "health-fitness|repeat|after": [
    {
      "slot": "situation",
      "required": true,
      "text": "What part of your day does this close out? (a walk, a meal, the workout, a stretch)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel once it's done?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "whyItMatters",
      "required": false,
      "text": "Why does it matter to you, in your words?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "firstStep",
      "required": false,
      "text": "What's a version you can do even on a busy day?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "beliefs",
      "required": false,
      "text": "Anything you want to believe about yourself at the end of the day? One per line.",
      "placeholder": "One idea per line",
      "help": "",
      "part": ""
    }
  ],
  "sports-performance|moment|getting-ready": [
    {
      "slot": "situation",
      "required": true,
      "text": "What's coming up, and when? (swim practice, Saturday's race, penalty kicks)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "As you walk into it, how do you want to feel, and how do you want to carry yourself?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "cue",
      "required": false,
      "text": "Your cue words, the short things you say to yourself (one per line).",
      "placeholder": "One cue per line",
      "help": "",
      "part": ""
    },
    {
      "slot": "firstStep",
      "required": false,
      "text": "Which part of your game is this for?",
      "placeholder": "The start, a play, the finish",
      "help": "",
      "part": ""
    },
    {
      "slot": "pastProof",
      "required": false,
      "text": "Have you handled something like this well before? A sentence or two is plenty.",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "sports-performance|moment|in-the-moment": [
    {
      "slot": "situation",
      "required": true,
      "text": "Where are you while this plays, and what's happening? (swim practice, Saturday's race, penalty kicks)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel and act right now, in the middle of it?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "cue",
      "required": false,
      "text": "Your cue words, the short things you say to yourself (one per line).",
      "placeholder": "One cue per line",
      "help": "",
      "part": ""
    },
    {
      "slot": "firstStep",
      "required": false,
      "text": "Which part of your game is this for?",
      "placeholder": "The start, a play, the finish",
      "help": "",
      "part": ""
    },
    {
      "slot": "obstacle",
      "required": false,
      "text": "What tends to pull you out of it?",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "sports-performance|moment|after": [
    {
      "slot": "situation",
      "required": true,
      "text": "What just finished? (swim practice, Saturday's race, penalty kicks)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel now that it's done?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "cue",
      "required": false,
      "text": "Your cue words, the short things you say to yourself (one per line).",
      "placeholder": "One cue per line",
      "help": "",
      "part": ""
    },
    {
      "slot": "firstStep",
      "required": false,
      "text": "Which part of your game is this for?",
      "placeholder": "The start, a play, the finish",
      "help": "",
      "part": ""
    },
    {
      "slot": "keepLetGo",
      "required": false,
      "text": "One thing you did that you want to remember, even a small one?",
      "placeholder": "",
      "help": "",
      "part": "keep"
    }
  ],
  "sports-performance|repeat|getting-ready": [
    {
      "slot": "situation",
      "required": true,
      "text": "What kind of practices, games, or races is this for? No date needed. (swim practice, Saturday's race, penalty kicks)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel heading into them?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "cue",
      "required": false,
      "text": "Your cue words, the short things you say to yourself (one per line).",
      "placeholder": "One cue per line",
      "help": "",
      "part": ""
    },
    {
      "slot": "firstStep",
      "required": false,
      "text": "Which part of your game is this for?",
      "placeholder": "The start, a play, the finish",
      "help": "",
      "part": ""
    },
    {
      "slot": "beliefs",
      "required": false,
      "text": "What do you want to believe about yourself on those days? One per line.",
      "placeholder": "One idea per line",
      "help": "",
      "part": ""
    }
  ],
  "sports-performance|repeat|in-the-moment": [
    {
      "slot": "situation",
      "required": true,
      "text": "What are you usually doing while this plays? (swim practice, Saturday's race, penalty kicks)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel while you're in it?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "cue",
      "required": false,
      "text": "Your cue words, the short things you say to yourself (one per line).",
      "placeholder": "One cue per line",
      "help": "",
      "part": ""
    },
    {
      "slot": "firstStep",
      "required": false,
      "text": "Which part of your game is this for?",
      "placeholder": "The start, a play, the finish",
      "help": "",
      "part": ""
    },
    {
      "slot": "beliefs",
      "required": false,
      "text": "What do you want to believe while you're in it? One per line.",
      "placeholder": "One idea per line",
      "help": "",
      "part": ""
    }
  ],
  "sports-performance|repeat|after": [
    {
      "slot": "situation",
      "required": true,
      "text": "What part of your day does this close out? (swim practice, Saturday's race, penalty kicks)",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel once it's done?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "cue",
      "required": false,
      "text": "Your cue words, the short things you say to yourself (one per line).",
      "placeholder": "One cue per line",
      "help": "",
      "part": ""
    },
    {
      "slot": "firstStep",
      "required": false,
      "text": "Which part of your game is this for?",
      "placeholder": "The start, a play, the finish",
      "help": "",
      "part": ""
    },
    {
      "slot": "beliefs",
      "required": false,
      "text": "Anything you want to believe about yourself at the end of the day? One per line.",
      "placeholder": "One idea per line",
      "help": "",
      "part": ""
    }
  ],
  "sleep-rest|moment|getting-ready": [
    {
      "slot": "situation",
      "required": true,
      "text": "What's still with you from this night?",
      "placeholder": "e.g. Work still looping; on the couch, lights dim, phone in the other room",
      "help": "You don't need to solve the day. Name what's still with you. This one is a specific night.",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want your body and mind to feel as you get ready for rest?",
      "placeholder": "e.g. Shoulders dropping, breath slower, room getting quieter",
      "help": "Sensory detail: jaw, shoulders, breath, the room. How rest starts to feel as you get ready.",
      "part": ""
    },
    {
      "slot": "cue",
      "required": false,
      "text": "Your wind-down setup?",
      "placeholder": "e.g. Couch, lights dim, phone in the other room",
      "help": "You don't need to solve the day. Name where you're winding down (couch, lights, phone).",
      "part": ""
    },
    {
      "slot": "keepLetGo",
      "required": false,
      "text": "What would you like to set down for tonight?",
      "placeholder": "",
      "help": "",
      "part": "release"
    }
  ],
  "sleep-rest|moment|in-the-moment": [
    {
      "slot": "situation",
      "required": true,
      "text": "Where are you as you rest — in bed, on the couch, taking a nap — and what's the room like?",
      "placeholder": "e.g. In bed, lights off, fan on, eyes closed",
      "help": "Where you are matters — bed, couch, nap. Mention light, sound, and whether your eyes are closed.",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "Describe the body and mind feeling you want: heavy, slow breath, quiet, safe, drowsy.",
      "placeholder": "e.g. Slow breath, shoulders dropped, legs heavy, mind finally quiet and safe",
      "help": "Name what you want in your body and mind: heavy eyelids, unclenched jaw, slow exhale, limbs sinking, mind quiet like still water.",
      "part": ""
    }
  ],
  "sleep-rest|moment|after": [
    {
      "slot": "situation",
      "required": true,
      "text": "How do your mornings usually begin?",
      "placeholder": "e.g. I usually wake already rushing — I want a slower first ten minutes",
      "help": "Mornings vary. Say how you usually wake and how you want this one to feel — unhurried, not a rally.",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "What does a gentle, unhurried start feel like in your body?",
      "placeholder": "e.g. Soft light, unhurried breath, body waking without a jolt",
      "help": "Gentle body detail: light, breath, no rush. Waking, not winding down.",
      "part": ""
    }
  ],
  "sleep-rest|repeat|getting-ready": [
    {
      "slot": "situation",
      "required": true,
      "text": "What's still with you from the day?",
      "placeholder": "e.g. Work still looping; on the couch, lights dim, phone in the other room",
      "help": "You don't need to solve the day. Name what's still with you, and where you're winding down (couch, lights, phone).",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel as the day settles?",
      "placeholder": "e.g. Shoulders dropping, breath slower, room getting quieter",
      "help": "Sensory detail: jaw, shoulders, breath, the room. How rest starts to feel as you get ready.",
      "part": ""
    },
    {
      "slot": "cue",
      "required": false,
      "text": "Your wind-down setup?",
      "placeholder": "e.g. Couch, lights dim, phone in the other room",
      "help": "You don't need to solve the day. Name where you're winding down (couch, lights, phone).",
      "part": ""
    },
    {
      "slot": "keepLetGo",
      "required": false,
      "text": "What would you like to set down for tonight?",
      "placeholder": "",
      "help": "",
      "part": "release"
    }
  ],
  "sleep-rest|repeat|in-the-moment": [
    {
      "slot": "situation",
      "required": true,
      "text": "Where are you while you rest — bed, couch, a quiet room?",
      "placeholder": "e.g. In bed, lights off, fan on, eyes closed",
      "help": "Where you are matters — bed, couch, nap. Mention light, sound, and whether your eyes are closed.",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel as you rest?",
      "placeholder": "e.g. Slow breath, shoulders dropped, legs heavy, mind finally quiet and safe",
      "help": "Name what you want in your body and mind: heavy eyelids, unclenched jaw, slow exhale, limbs sinking, mind quiet like still water.",
      "part": ""
    }
  ],
  "sleep-rest|repeat|after": [
    {
      "slot": "situation",
      "required": true,
      "text": "How do your mornings usually begin?",
      "placeholder": "e.g. I usually wake already rushing — I want a slower first ten minutes",
      "help": "Mornings vary. Say how you usually wake and how you want this one to feel — unhurried, not a rally.",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel as you wake?",
      "placeholder": "e.g. Soft light, unhurried breath, body waking without a jolt",
      "help": "Gentle body detail: light, breath, no rush. Waking, not winding down.",
      "part": ""
    }
  ],
  "i-am|moment|getting-ready": [
    {
      "slot": "beliefs",
      "required": true,
      "text": "What do you most want to believe or embody about yourself right now? Add everything — one idea per line. (e.g., I am confident, I am worthy of love, I am strong and resilient)",
      "placeholder": "Share as much as you like—the more specific, the better your script.",
      "help": "Add everything you want in your script—who you're becoming.\n\n• Easiest: one idea per line\n• If an idea is longer and has commas inside it, end that idea with a period so it stays one thought (commas won't be mistaken for a new idea)\n• Short lists can stay simple: a few words or phrases per line are fine (e.g. honor, courage, patient with myself)\n• You don't need to type \"I am\" before every line\n\nYour script will weave these into smooth, spoken lines and include each idea.",
      "part": ""
    },
    {
      "slot": "situation",
      "required": true,
      "text": "You're about to step into something. How would it feel in your body to already be that person walking in?",
      "placeholder": "e.g. Steady in my chest, shoulders back, already belonging as I walk in",
      "help": "Name how it feels in your body to already be that person before you walk in — chest, breath, posture, warmth.",
      "part": ""
    },
    {
      "slot": "pastProof",
      "required": false,
      "text": "A time you were already that person?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "whyItMatters",
      "required": false,
      "text": "What matters to you that these come from?",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "i-am|moment|in-the-moment": [
    {
      "slot": "beliefs",
      "required": true,
      "text": "What do you most want to believe or embody about yourself right now? Add everything — one idea per line. (e.g., I am confident, I am worthy of love, I am strong and resilient)",
      "placeholder": "Share as much as you like—the more specific, the better your script.",
      "help": "Add everything you want in your script—who you're becoming.\n\n• Easiest: one idea per line\n• If an idea is longer and has commas inside it, end that idea with a period so it stays one thought (commas won't be mistaken for a new idea)\n• Short lists can stay simple: a few words or phrases per line are fine (e.g. honor, courage, patient with myself)\n• You don't need to type \"I am\" before every line\n\nYour script will weave these into smooth, spoken lines and include each idea.",
      "part": ""
    },
    {
      "slot": "situation",
      "required": true,
      "text": "You're in it right now. Where are you, and how does living these truths feel in your body in this moment?",
      "placeholder": "e.g. At my desk — warm, grounded, these words true in my body right now",
      "help": "Name where you are and how these truths feel in your body right now — not someday. Honest fragments are enough.",
      "part": ""
    },
    {
      "slot": "pastProof",
      "required": false,
      "text": "A time you were already that person?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "whyItMatters",
      "required": false,
      "text": "What matters to you that these come from?",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "i-am|moment|after": [
    {
      "slot": "beliefs",
      "required": true,
      "text": "What do you most want to believe or embody about yourself right now? Add everything — one idea per line. (e.g., I am confident, I am worthy of love, I am strong and resilient)",
      "placeholder": "Share as much as you like—the more specific, the better your script.",
      "help": "Add everything you want in your script—who you're becoming.\n\n• Easiest: one idea per line\n• If an idea is longer and has commas inside it, end that idea with a period so it stays one thought (commas won't be mistaken for a new idea)\n• Short lists can stay simple: a few words or phrases per line are fine (e.g. honor, courage, patient with myself)\n• You don't need to type \"I am\" before every line\n\nYour script will weave these into smooth, spoken lines and include each idea.",
      "part": ""
    },
    {
      "slot": "situation",
      "required": true,
      "text": "The moment is done. How do you want these truths to feel as you settle — in your body and in who you are?",
      "placeholder": "e.g. Quiet pride, still myself, the moment complete",
      "help": "Name how you want these truths to feel as you settle — after the moment, still you.",
      "part": ""
    },
    {
      "slot": "pastProof",
      "required": false,
      "text": "A time you were already that person?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "whyItMatters",
      "required": false,
      "text": "What matters to you that these come from?",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "i-am|repeat|getting-ready": [
    {
      "slot": "beliefs",
      "required": true,
      "text": "What do you most want to believe or embody about yourself right now? Add everything — one idea per line. (e.g., I am confident, I am worthy of love, I am strong and resilient)",
      "placeholder": "Share as much as you like—the more specific, the better your script.",
      "help": "Add everything you want in your script—who you're becoming.\n\n• Easiest: one idea per line\n• If an idea is longer and has commas inside it, end that idea with a period so it stays one thought (commas won't be mistaken for a new idea)\n• Short lists can stay simple: a few words or phrases per line are fine (e.g. honor, courage, patient with myself)\n• You don't need to type \"I am\" before every line\n\nYour script will weave these into smooth, spoken lines and include each idea.",
      "part": ""
    },
    {
      "slot": "situation",
      "required": true,
      "text": "You're about to step into something. How would it feel in your body to already be that person walking in?",
      "placeholder": "e.g. Steady in my chest, shoulders back, already belonging as I walk in",
      "help": "Name how it feels in your body to already be that person before you walk in — chest, breath, posture, warmth.",
      "part": ""
    },
    {
      "slot": "pastProof",
      "required": false,
      "text": "A time you were already that person?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "whyItMatters",
      "required": false,
      "text": "What matters to you that these come from?",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "i-am|repeat|in-the-moment": [
    {
      "slot": "beliefs",
      "required": true,
      "text": "What do you most want to believe or embody about yourself right now? Add everything — one idea per line. (e.g., I am confident, I am worthy of love, I am strong and resilient)",
      "placeholder": "Share as much as you like—the more specific, the better your script.",
      "help": "Add everything you want in your script—who you're becoming.\n\n• Easiest: one idea per line\n• If an idea is longer and has commas inside it, end that idea with a period so it stays one thought (commas won't be mistaken for a new idea)\n• Short lists can stay simple: a few words or phrases per line are fine (e.g. honor, courage, patient with myself)\n• You don't need to type \"I am\" before every line\n\nYour script will weave these into smooth, spoken lines and include each idea.",
      "part": ""
    },
    {
      "slot": "situation",
      "required": true,
      "text": "You're in it right now. Where are you, and how does living these truths feel in your body in this moment?",
      "placeholder": "e.g. At my desk — warm, grounded, these words true in my body right now",
      "help": "Name where you are and how these truths feel in your body right now — not someday. Honest fragments are enough.",
      "part": ""
    },
    {
      "slot": "pastProof",
      "required": false,
      "text": "A time you were already that person?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "whyItMatters",
      "required": false,
      "text": "What matters to you that these come from?",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "i-am|repeat|after": [
    {
      "slot": "beliefs",
      "required": true,
      "text": "What do you most want to believe or embody about yourself right now? Add everything — one idea per line. (e.g., I am confident, I am worthy of love, I am strong and resilient)",
      "placeholder": "Share as much as you like—the more specific, the better your script.",
      "help": "Add everything you want in your script—who you're becoming.\n\n• Easiest: one idea per line\n• If an idea is longer and has commas inside it, end that idea with a period so it stays one thought (commas won't be mistaken for a new idea)\n• Short lists can stay simple: a few words or phrases per line are fine (e.g. honor, courage, patient with myself)\n• You don't need to type \"I am\" before every line\n\nYour script will weave these into smooth, spoken lines and include each idea.",
      "part": ""
    },
    {
      "slot": "situation",
      "required": true,
      "text": "The moment is done. How do you want these truths to feel as you settle — in your body and in who you are?",
      "placeholder": "e.g. Quiet pride, still myself, the moment complete",
      "help": "Name how you want these truths to feel as you settle — after the moment, still you.",
      "part": ""
    },
    {
      "slot": "pastProof",
      "required": false,
      "text": "A time you were already that person?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "whyItMatters",
      "required": false,
      "text": "What matters to you that these come from?",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "other|moment|getting-ready": [
    {
      "slot": "situation",
      "required": true,
      "text": "What's this about?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "As you walk into it, how do you want to feel, and how do you want to carry yourself?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "pastProof",
      "required": false,
      "text": "Have you handled something like this well before? A sentence or two is plenty.",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "firstStep",
      "required": false,
      "text": "What's the first thing you'll do or say when it starts?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "obstacle",
      "required": false,
      "text": "What usually gets in the way right before? (optional: the script won't repeat it)",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "other|moment|in-the-moment": [
    {
      "slot": "situation",
      "required": true,
      "text": "What's this about?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel and act right now, in the middle of it?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "cue",
      "required": false,
      "text": "A word or short phrase you can come back to while you're in it?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "pastProof",
      "required": false,
      "text": "A time you've been in this before and it went well?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "obstacle",
      "required": false,
      "text": "What tends to pull you out of it?",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "other|moment|after": [
    {
      "slot": "situation",
      "required": true,
      "text": "What's this about?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel now that it's done?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "keepLetGo",
      "required": false,
      "text": "One thing you did that you want to remember, even a small one?",
      "placeholder": "",
      "help": "",
      "part": "keep"
    },
    {
      "slot": "keepLetGo",
      "required": false,
      "text": "Anything you'd like to set down from it?",
      "placeholder": "",
      "help": "",
      "part": "release"
    }
  ],
  "other|repeat|getting-ready": [
    {
      "slot": "situation",
      "required": true,
      "text": "What's this about?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel heading into them?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "beliefs",
      "required": false,
      "text": "What do you want to believe about yourself on those days? One per line.",
      "placeholder": "One idea per line",
      "help": "",
      "part": ""
    },
    {
      "slot": "pastProof",
      "required": false,
      "text": "A time you already felt that way?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "obstacle",
      "required": false,
      "text": "What usually gets in the way? (optional)",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "other|repeat|in-the-moment": [
    {
      "slot": "situation",
      "required": true,
      "text": "What's this about?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel while you're in it?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "cue",
      "required": false,
      "text": "A word or short phrase that brings you back?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "beliefs",
      "required": false,
      "text": "What do you want to believe while you're in it? One per line.",
      "placeholder": "One idea per line",
      "help": "",
      "part": ""
    },
    {
      "slot": "obstacle",
      "required": false,
      "text": "What usually pulls you out?",
      "placeholder": "",
      "help": "",
      "part": ""
    }
  ],
  "other|repeat|after": [
    {
      "slot": "situation",
      "required": true,
      "text": "What's this about?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "feeling",
      "required": true,
      "text": "How do you want to feel once it's done?",
      "placeholder": "",
      "help": "",
      "part": ""
    },
    {
      "slot": "keepLetGo",
      "required": false,
      "text": "What do you want to keep from days like this?",
      "placeholder": "",
      "help": "",
      "part": "keep"
    },
    {
      "slot": "keepLetGo",
      "required": false,
      "text": "What would you like to leave behind at the end of it?",
      "placeholder": "",
      "help": "",
      "part": "release"
    },
    {
      "slot": "beliefs",
      "required": false,
      "text": "Anything you want to believe about yourself at the end of the day? One per line.",
      "placeholder": "One idea per line",
      "help": "",
      "part": ""
    }
  ]
};

  function copyQuestion(question) {
    return {
      slot: question.slot,
      required: !!question.required,
      text: question.text,
      placeholder: question.placeholder || "",
      help: question.help || "",
      part: question.part || "",
    };
  }

  function questions(categoryId, intention, when) {
    var rows = TABLE[String(categoryId || "") + "|" + String(intention || "") + "|" + String(when || "")] || [];
    return rows.map(copyQuestion);
  }

  function answerKey(question) {
    return question.part ? question.slot + ":" + question.part : question.slot;
  }

  function keepLetGoAnswer(answers) {
    var keep = String((answers && answers["keepLetGo:keep"]) || "").trim();
    var release = String((answers && answers["keepLetGo:release"]) || "").trim();
    var lines = [];
    if (keep) lines.push("Keep: " + keep);
    if (release) lines.push("Release: " + release);
    return lines.join("\n");
  }

  function slotText(slots, key) {
    var raw = slots && slots[key];
    if (!raw) return "";
    if (typeof raw === "string") return raw.trim();
    return String(raw.answer || raw.text || raw.value || "").trim();
  }

  function slotAnswer(question, slots, flat) {
    if (question.part) {
      var fromFlat = String((flat && flat[answerKey(question)]) || "").trim();
      if (fromFlat) return fromFlat;
      var combined = slotText(slots, "keepLetGo");
      var label = question.part === "keep" ? "Keep:" : "Release:";
      var line = combined.split("\n").find(function (item) { return item.indexOf(label) === 0; });
      return line ? line.slice(label.length).trim() : "";
    }
    var direct = String((flat && flat[question.slot]) || "").trim();
    if (direct) return direct;
    return slotText(slots, question.slot);
  }

  function legacyAnswers(categoryId, intention, questions, flat) {
    function value(slot, part) {
      var question = questions.find(function (item) {
        return item.slot === slot && (item.part || "") === (part || "");
      });
      return question ? slotAnswer(question, null, flat) : String((flat && flat[part ? slot + ":" + part : slot]) || "").trim();
    }
    if (categoryId === "i-am") return [value("beliefs"), value("situation")].filter(Boolean);
    if (intention === "repeat") {
      var first = value("beliefs") || value("situation") || value("topic");
      return [first, value("feeling")].filter(Boolean);
    }
    return [value("situation") || value("topic"), value("feeling")].filter(Boolean);
  }

  function buildPersonal(categoryId, intention, when, flat, length) {
    var asked = questions(categoryId, intention, when);
    var slots = {};
    var keep = false;
    asked.forEach(function (question) {
      var answer = slotAnswer(question, null, flat);
      if (!answer) return;
      if (question.slot === "keepLetGo") {
        keep = true;
        return;
      }
      slots[question.slot] = { question: question.text, answer: answer };
    });
    if (keep) {
      var answer = keepLetGoAnswer(flat);
      if (answer) {
        var prompts = asked.filter(function (question) { return question.slot === "keepLetGo"; }).map(function (question) { return question.text; });
        slots.keepLetGo = { question: prompts.join(" / "), answer: answer };
      }
    }
    return {
      personal: {
        version: 1,
        categoryId: categoryId,
        intention: intention,
        when: when,
        length: length || "Auto",
        slots: slots,
      },
      legacy: legacyAnswers(categoryId, intention, asked, flat),
      obstacle: (slots.obstacle && slots.obstacle.answer) || "",
      context: (slots.situation && slots.situation.answer) || "",
      feeling: (slots.feeling && slots.feeling.answer) || "",
    };
  }

  return {
    HINT: HINT,
    OPTIONAL_HEADING: OPTIONAL_HEADING,
    TABLE: TABLE,
    questions: questions,
    answerKey: answerKey,
    legacyAnswers: legacyAnswers,
    buildPersonal: buildPersonal,
  };
});
