(function (global) {
  var TITLES = {
    intention: "Is this for a specific moment, or something you can listen to over and over?",
    length: "How long should it be?",
    when: "When is it?",
    moment: "What's the moment?",
    belief: "What do you want to believe?",
    feeling: "How do you want to feel?",
  };

  function screens(intention, includesLength) {
    var list = ["intention"];
    if (includesLength) list.push("length");
    if (intention === "repeat") list.push("beliefs", "feelings");
    if (intention === "moment") list.push("when", "moment", "feelings");
    return list;
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
        "in-the-moment": ["This play", "Between plays", "This rep", "This breath", "In the game", "On the field", "This point", "Right here in it"],
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

  function overAndOverQuestions(categoryId) {
    var belief = categoryId === "i-am"
      ? "What do you want to believe or embody about yourself? Add everything — one idea per line."
      : "What do you want to believe? Add everything — one idea per line.";
    return [belief, "How do you want to feel?"];
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
    overAndOverQuestions: overAndOverQuestions,
    overAndOverObstacle: "Are there things that get in your way? (optional)",
  };
})(window);
