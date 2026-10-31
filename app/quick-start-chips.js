(function (global) {
  var TITLES = {
    intention: "Is this for a specific moment, or something you can listen to over and over?",
    length: "How long should it be?",
    when: "When is it?",
    moment: "What's the moment?",
    belief: "What do you want to believe?",
    feeling: "How do you want to feel?",
  };

  function screens(intention) {
    var list = ["intention"];
    if (intention === "repeat" || intention === "moment") list.push("when", "moment");
    return list;
  }

  function directionQuestion(categoryId, mode, intention) {
    var m = mode === "in-the-moment" || mode === "after" ? mode : "getting-ready";
    var ordinary = intention === "repeat";
    var detail = categoryId === "sports-performance"
      ? (m === "in-the-moment"
        ? "Name the sport and/or the practice. A few words."
        : "Name the sport and/or the game. A few words.")
      : ordinary
        ? "The kind of thing it is on an ordinary day. A few words."
        : "Name the real thing. A few words. The listen uses it at the start.";
    var table = {
      "sports-performance": {
        "getting-ready": ["What are you getting ready for?", "Friday's basketball game and/or every soccer game"],
        "in-the-moment": ["What are you practicing?", "Friday's basketball practice"],
        after: ["What will you have just come out of?", "Today's soccer practice"],
      },
      confidence: {
        "getting-ready": ["What are you about to walk into?", "Monday's meeting"],
        "in-the-moment": ["What will you be in the middle of?", "Speaking in the meeting"],
        after: ["What will you have just finished?", "The meeting"],
      },
      relationships: {
        "getting-ready": ["Who are you about to be with?", "Dinner with Alex"],
        "in-the-moment": ["Who will you be with?", "The talk with my sister"],
        after: ["Who will you have just been with?", "After I see them"],
      },
      "success-prosperity": {
        "getting-ready": ["What work are you about to start?", "The proposal"],
        "in-the-moment": ["What work will you be in?", "The client call"],
        after: ["What work will you have just finished?", "The pitch"],
      },
      "mental-wellbeing": {
        "getting-ready": ["What are you heading into?", "A full day"],
        "in-the-moment": ["What will you be in the middle of?", "The busy stretch"],
        after: ["What will you be coming down from?", "The day"],
      },
      "health-fitness": {
        "getting-ready": ["What are you about to do?", "The workout, or a walk"],
        "in-the-moment": ["What will you be in the middle of?", "This session"],
        after: ["What will you have just finished?", "The workout"],
      },
      "sleep-rest": {
        "getting-ready": ["What will this wind-down be?", "On the sofa, lights low"],
        "in-the-moment": ["Where will you be resting?", "In bed"],
        after: ["What will this wake-up be?", "A slow morning"],
      },
    };
    var row = (table[categoryId] || {
      "getting-ready": ["What are you getting ready for?", "The thing I'm walking into"],
      "in-the-moment": ["What will you be in the middle of?", "This part of the day"],
      after: ["What will you have just finished?", "The thing I just did"],
    })[m];
    return { title: row[0], detail: detail, placeholder: row[1] };
  }

  function sceneChips(categoryId) {
    switch (categoryId) {
      case "relationships":
        return ["Sitting with them", "When they walk in", "After we talk", "When I tell the truth", "A quiet evening", "When I ask for what I need", "When I stay myself", "A message from them"];
      case "confidence":
        return ["Walking in", "Before I speak", "After I said it", "A quiet minute", "When I take my time", "When I stay steady", "The moment I decide", "When I know I belong"];
      case "success-prosperity":
        return ["Opening the work", "On a call", "After I send it", "At my desk", "When I start", "A clear decision", "The next step", "Closing the day"];
      case "mental-wellbeing":
        return ["A quiet morning", "After a walk", "When I slow down", "On my own", "After it got loud", "A steady breath", "Later in the day", "When I come back"];
      case "health-fitness":
        return ["On a walk", "After I move", "At a meal", "When I rest", "Getting dressed to move", "A slow morning", "After the session", "When my body feels easy"];
      case "sleep-rest":
        return ["In bed", "After a shower", "Lights low", "On the sofa", "When the house is quiet", "Eyes closed", "A slow morning", "When the day is done"];
      case "i-am":
        return ["Starting the day", "A quiet minute", "After something hard", "With people I trust", "On my own", "When I tell the truth", "Walking outside", "Before I sleep"];
      default:
        return ["A quiet minute", "Starting the day", "With someone I trust", "On my own", "After I begin", "When I tell the truth", "Walking outside", "Closing the day"];
    }
  }

  function sportsParts(mode) {
    if (mode === "in-the-moment") {
      return {
        title: "What do you want with you in practice?",
        hint: "Choose the part of practice you want to walk through.",
        chips: [
          "This rep", "The next rep", "My routine", "Getting loose",
          "Seeing the target", "One rep at a time", "Warming up", "The first rep",
          "After a miss", "Resetting", "Staying with it", "The hard rep",
          "Trusting the work", "Finishing the rep", "A new rep", "The last rep",
        ],
      };
    }
    if (mode === "after") {
      return {
        title: "What do you want after the game?",
        hint: "Choose how you want to come off it.",
        chips: [
          "The last play", "Walking off", "Letting it go", "Cooling down",
          "What went well", "The ride home", "Leaving it here", "Ready for the next one",
        ],
      };
    }
    return {
      title: "What do you want to take into the game?",
      hint: "Choose what gets you ready for the game.",
      chips: [
        "Walking in", "Warming up", "My routine", "Getting loose",
        "Seeing the game", "Trusting my preparation", "The first play", "One play at a time",
        "When it gets hard", "After a mistake", "Resetting", "Staying in it",
        "A big moment", "The finish", "Letting the last game go", "Waiting to start",
      ],
    };
  }

  function blockSet(categoryId, mode) {
    var id = categoryId || "";
    if (id === "sports-performance") {
      var parts = sportsParts(mode);
      return {
        kind: "sports",
        work: parts.title,
        feel: "How do you want to feel there?",
        scene: "In that moment, what do you do or tell yourself?",
        workHint: parts.hint,
        feelHint: "The feeling you want while you are in it.",
        sceneHint: "A short cue, or the action you take.",
        workChips: parts.chips,
        feelChips: [
          "Calm", "Sharp", "Loose", "Ready", "Trusting", "Free", "Strong", "Locked in",
          "Confident", "Focused", "Patient", "Fierce", "Light", "Certain", "Brave", "Playful",
          "Composed", "Explosive", "Present", "Hungry", "Aggressive", "Steady", "Smooth", "Easy",
        ],
        sceneChips: [
          "See the target", "Next play", "Loose and ready", "One breath", "Trust this rep", "Eyes up", "Let the last one go", "Smooth and simple",
          "Breathe and go", "Play my game", "Attack this one", "Trust the work", "Finish it", "I've got this", "Next rep", "Quiet mind",
          "Reset", "Head up", "Let it fly", "Own this one", "One job", "Full effort", "On time", "Through the finish",
        ],
      };
    }
    var work = "What do you want to work on?";
    var workHint = "One thing. Say what you want, not what you want to stop.";
    if (id === "sleep-rest") {
      work = "What do you want from this rest?";
      workHint = "One thing you want as you rest.";
    } else if (id === "i-am") {
      work = "What do you want to be true about you?";
      workHint = "One statement you want to live with.";
    }
    return {
      kind: "life",
      work: work,
      feel: "How do you want to feel?",
      scene: "When is a time you already feel this, even a little?",
      workHint: workHint,
      feelHint: "The feeling you want, as if it is already here.",
      sceneHint: "A real moment, even a small one. The script uses that.",
      workChips: beliefs(id).slice(0, 8),
      feelChips: feelings(id),
      sceneChips: sceneChips(id),
    };
  }

  function beliefPickCount(length) {
    if (length === "Long") return 6;
    if (length === "Medium") return 4;
    return 2;
  }

  function feelingPickCount(length) {
    if (length === "Long") return 3;
    if (length === "Medium") return 2;
    return 1;
  }

  function whenTitle(mode) {
    if (mode === "in-the-moment") return "While it's happening";
    if (mode === "after") return "After";
    return "Before";
  }

  function beliefs(categoryId) {
    switch (categoryId) {
      case "confidence":
        return ["I belong", "What I say matters", "I can stay steady", "I trust myself", "I am enough", "I can handle a big moment", "I can take my time", "I am on my own side", "I can speak up", "I am allowed to be seen"];
      case "relationships":
        return ["I can be myself with them", "I am worthy of love", "I can hold a boundary", "I can stay kind and clear", "I matter in this relationship", "I can ask for what I need", "I am safe to be close", "I can love without losing myself", "I show up honestly", "I am enough for the people I love"];
      case "success-prosperity":
        return ["I can do the work in front of me", "I am allowed to succeed", "I make clear decisions", "I can ask to be paid what it's worth", "I follow through", "I trust my judgment", "I belong in the room", "I can start", "My work has value", "I can take the next step"];
      case "mental-wellbeing":
        return ["I can feel steady", "I am safe in this moment", "I can let my mind quiet", "I come back to myself", "I can get through this stretch", "I am more than this feeling", "I can be gentle with myself", "I can continue", "I am allowed to rest my mind", "I return to what is true"];
      case "health-fitness":
        return ["I take care of my body", "I can move", "I can rest", "I treat my body kindly", "I have energy for what matters", "I listen to my body", "I can keep this habit", "I am strong and at ease", "I nourish myself", "My body is on my side"];
      case "sports-performance":
        return ["I trust my training", "I compete as myself", "I stay with this play", "I can be calm and sharp", "I recover well", "I belong here", "I do the next rep", "I let the last play go", "I am ready", "I play free"];
      case "sleep-rest":
        return ["I can put the day down", "My body knows how to rest", "I am safe to sleep", "I can let my mind quiet", "Rest is allowed", "I wake gently", "The day can wait", "I sink into rest", "Morning can arrive slowly", "I am done for tonight"];
      case "i-am":
        return ["I am enough", "I am steady", "I am worthy", "I am strong", "I am at peace", "I am clear", "I am loved", "I am capable", "I am present", "I am becoming who I am"];
      default:
        return ["A truth I want to keep", "Who I am in this", "How I want to show up", "A quality I'm growing", "What matters to me", "The person I'm becoming", "I can stay with it", "I trust myself here", "I am allowed to want this", "I come back to myself"];
    }
  }

  function feelings(categoryId) {
    switch (categoryId) {
      case "sleep-rest":
        return ["Heavy and safe", "Quiet", "Warm", "Unhurried", "Soft", "At ease", "Done with the day", "Slow"];
      case "sports-performance":
        return ["Calm", "Sharp", "Loose", "Ready", "Trusting", "Free", "Strong", "Locked in"];
      case "relationships":
        return ["Open", "Warm", "Clear", "Steady", "Kind", "Close", "At ease", "Sure of myself"];
      case "mental-wellbeing":
        return ["Steady", "Quiet", "Safe", "Clear", "Soft", "Present", "At ease", "Like myself"];
      default:
        return ["Steady", "Calm", "Clear", "Sure of myself", "Quiet", "Strong", "Open", "At ease"];
    }
  }

  function moments(categoryId, mode) {
    var m = mode === "in-the-moment" || mode === "after" ? mode : "getting-ready";
    var table = {
      confidence: {
        "getting-ready": ["A meeting or presentation", "A conversation that matters", "Speaking in front of people", "Walking into a room", "Asking for something", "A decision I have to make", "Being with other people", "Something I'm about to say"],
        "in-the-moment": ["This meeting", "This conversation", "Speaking up right now", "This room I'm in", "The ask I'm making", "This decision", "These people I'm with", "What I'm saying right now"],
        after: ["The meeting I just left", "A conversation that just ended", "After I spoke", "After I walked out", "After I asked", "A decision I just made", "After time with other people", "Something I just said"],
      },
      relationships: {
        "getting-ready": ["A talk I need to have", "Seeing someone I care about", "Holding a boundary", "A date or a hello", "Time with my family", "Reaching out to someone", "Walking into their space", "A moment I want to show up for"],
        "in-the-moment": ["I'm with them right now", "This conversation", "Holding the boundary now", "This time together", "Being with my family", "This reach toward them", "In the room with them", "Showing up right now"],
        after: ["A conversation I just had", "Time I just spent with someone", "A boundary I just held", "After I saw them", "After time with my family", "After I reached out", "After I left", "A moment I just showed up for"],
      },
      "success-prosperity": {
        "getting-ready": ["A work block I'm starting", "A pitch or an ask", "A money decision", "The next thing on my list", "A call I'm about to take", "Opening the work", "Walking into work", "A goal I'm about to touch"],
        "in-the-moment": ["At my desk, in the work", "On this call", "This money decision", "The task in front of me", "This pitch", "The work I'm in", "This next move", "This goal, right now"],
        after: ["A work block I just finished", "A meeting I just left", "A decision I just made", "Closing the day", "A call that just ended", "After the pitch", "Stepping away from the work", "After I moved the goal"],
      },
      "mental-wellbeing": {
        "getting-ready": ["A stretch of the day ahead", "Starting the morning", "Before a full day", "Time I want to feel steady", "Heading into something busy", "A quiet start", "Before I see people", "The next few hours"],
        "in-the-moment": ["This feeling, right now", "A busy stretch", "I'm by myself", "A regular afternoon", "This hour", "In the middle of the day", "With this mood", "Right where I am"],
        after: ["Coming down from the day", "After a long stretch", "Settling back into myself", "The evening", "After I was with people", "Closing the day", "After it got loud", "Time to come back"],
      },
      "health-fitness": {
        "getting-ready": ["A workout", "A meal", "A walk", "The sauna", "A habit I'm about to do", "Getting dressed to move", "Before I eat", "Starting the session"],
        "in-the-moment": ["I'm moving", "I'm eating", "I'm on a walk", "I'm in the sauna", "This habit, right now", "This set", "This meal", "In my body right now"],
        after: ["I just finished moving", "I just ate", "After the walk", "After the sauna", "After the session", "Recovery", "Closing the day in my body", "After I kept the habit"],
      },
      "sports-performance": {
        "getting-ready": ["Practice", "A game or a race", "A hard session", "Walking in", "Warming up", "The locker room", "Before the first play", "Before I compete"],
        "in-the-moment": ["This rep", "The next rep", "My routine", "Seeing the target", "One rep at a time", "After a miss", "Resetting", "Finishing the rep"],
        after: ["The session just ended", "The game just ended", "Cooling down", "Leaving the field", "After I competed", "Recovery", "The ride home", "Letting it be done"],
      },
      "sleep-rest": {
        "getting-ready": ["Winding down tonight", "Putting the day down", "Getting ready for bed", "On the sofa", "After a shower", "Lights going down", "The last part of the evening", "Rest, not one particular night"],
        "in-the-moment": ["Falling asleep", "Lying here", "Staying with rest", "A nap", "In bed", "Eyes closed", "The room is quiet", "This rest"],
        after: ["Just waking up", "A slow morning", "Still in bed", "The first few minutes", "Before I get up", "Letting the morning arrive", "No rush yet", "Opening the day slowly"],
      },
      "i-am": {
        "getting-ready": ["Starting the day", "Before I step into something", "Getting ready", "The morning", "Before I see anyone", "A moment I'm about to enter", "How I begin", "Before the day picks up"],
        "in-the-moment": ["Right now", "This moment I'm in", "Where I am", "This part of the day", "While I'm in it", "Here", "This hour", "As I am right now"],
        after: ["After the moment", "Settling", "The end of this part", "Coming back to myself", "After the day", "When it's done", "The evening", "Still myself"],
      },
    };
    var pack = table[categoryId] || {
      "getting-ready": ["Something I'm walking into", "A part of my day", "A conversation", "Time alone", "Time with other people", "Starting something", "A moment that matters", "Before it begins"],
      "in-the-moment": ["What I'm in right now", "This part of my day", "This conversation", "Time alone", "Time with other people", "The thing I'm doing", "This moment", "Right here"],
      after: ["Something I just finished", "This part of the day ending", "A conversation that ended", "After time alone", "After time with people", "After I started", "When it's done", "Closing it"],
    };
    return pack[m];
  }

  function overAndOverQuestions(categoryId, mode) {
    var m = mode === "in-the-moment" || mode === "after" ? mode : "getting-ready";
    if (categoryId === "sleep-rest") {
      if (m === "getting-ready") {
        return [
          "What is still with you as you wind down, on an ordinary night?",
          "How do you want to feel as the day settles?",
        ];
      }
      if (m === "after") {
        return [
          "How do mornings usually begin for you?",
          "How do you want to feel as you wake?",
        ];
      }
      return [
        "Where are you while you rest — bed, couch, a quiet room?",
        "How do you want to feel as you rest?",
      ];
    }
    var belief = categoryId === "i-am"
      ? "What do you want to believe or embody about yourself? Add everything — one idea per line."
      : "What do you want to believe on days like this? Add everything — one idea per line.";
    var feeling = m === "in-the-moment"
      ? "How do you want to feel while you're in it?"
      : m === "after"
        ? "How do you want to feel once that part of the day is done?"
        : "How do you want to feel while you're getting ready, before the moments that keep coming?";
    return [belief, feeling];
  }

  global.QuickStartChips = {
    titles: TITLES,
    screens: screens,
    beliefPickCount: beliefPickCount,
    feelingPickCount: feelingPickCount,
    whenTitle: whenTitle,
    beliefs: beliefs,
    feelings: feelings,
    moments: moments,
    directionQuestion: directionQuestion,
    blockSet: blockSet,
    overAndOverQuestions: overAndOverQuestions,
    overAndOverObstacle: "Are there things that get in your way? (optional)",
  };
})(window);
