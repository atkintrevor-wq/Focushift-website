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
      ? "Name the sport and what you'll be in. A few words."
      : ordinary
        ? "The kind of thing it is on an ordinary day. A few words."
        : "Name the real thing. A few words. The listen uses it at the start.";
    var table = {
      "sports-performance": {
        "getting-ready": ["What are you getting ready for?", "Friday's game, or today's practice"],
        "in-the-moment": ["What will you be in the middle of?", "The game, or this practice"],
        after: ["What will you have just finished?", "The game, or today's practice"],
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
        title: "What do you want with you while you're in it?",
        hint: "Choose the part you want to walk through.",
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
        title: "What do you want after it?",
        hint: "Choose how you want to come off it.",
        chips: [
          "The last play", "Walking off", "Letting it go", "Cooling down",
          "What went well", "The ride home", "Leaving it here", "Ready for the next one",
        ],
      };
    }
    return {
      title: "What do you want to take in with you?",
      hint: "Choose the part you want with you as you get ready.",
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
    if (id === "health-fitness" && mode === "in-the-moment") {
      return {
        kind: "life",
        work: work,
        feel: "How do you want to feel?",
        scene: "In this movement, what do you do or tell yourself?",
        workHint: workHint,
        feelHint: "The feeling you want while you are in it.",
        sceneHint: "A short cue, or the action you take.",
        workChips: beliefs(id).slice(0, 8),
        feelChips: feelings(id),
        sceneChips: [
          "Easy", "Right here", "I've got this", "One more", "Stay with it", "Smooth", "Breathe", "Keep going",
          "This one", "Loose", "Light", "Here", "Steady", "Through it", "Still going", "Let it be easy",
        ],
      };
    }
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

  function associationFamily(categoryId, when) {
    if (categoryId === "sports-performance") return "sports";
    if (categoryId === "sleep-rest") return "sleep";
    if (categoryId === "relationships") return "relationships";
    if (categoryId === "mental-wellbeing") return "mental";
    if (categoryId === "health-fitness" && when === "in-the-moment") return "health-moving";
    if (categoryId === "health-fitness") return "health";
    if (categoryId === "success-prosperity") return "success";
    if (categoryId === "i-am") return "identity";
    if (categoryId === "confidence") return "confidence";
    return "other";
  }

  function pack(lines, before, during, after) {
    return { lines: lines, "getting-ready": before, "in-the-moment": during, after: after };
  }

  var ASSOCIATIONS = {
    sports: {
      calm: pack(["Quiet mind", "Smooth and simple", "Loose and ready", "Unhurried"], ["One quiet breath", "See it calm"], ["Stay smooth", "Calm on this one"], ["Leave it quiet", "Let it settle"]),
      sharp: pack(["Eyes up", "See the target", "Clean and simple", "Precise"], ["See it before I go", "Sharp and set"], ["This one, clean", "Eyes on this play"], ["I saw it clearly", "Sharp to the end"]),
      loose: pack(["Loose and ready", "Easy shoulders", "Nothing tight", "Free in my body"], ["Get loose first", "Easy before I start"], ["Stay loose", "Easy on this rep"], ["Shake it out", "Loose as I come off"]),
      ready: pack(["I'm ready", "One job", "This is mine", "Set"], ["Ready before I go in", "Set, then I go"], ["The one in front of me", "I take this one"], ["I was ready", "That one is done"]),
      trusting: pack(["Trust the work", "I've done this", "Trust this one", "I know this"], ["Trust what I prepared", "The work is in me"], ["Trust this rep", "Let it come"], ["The work holds", "I can trust how I showed up"]),
      free: pack(["Play my game", "Let it fly", "Nothing extra", "Free"], ["My game, before I go", "Free and ready"], ["Play this one free", "Let this one fly"], ["I played mine", "Free as I leave it"]),
      strong: pack(["Full effort", "Through the finish", "Strong and simple", "All the way"], ["Strong before I step in", "I bring this with me"], ["Strong on this one", "All the way through"], ["I left it strong", "That effort can rest"]),
      "locked in": pack(["Locked in", "One job", "Eyes up", "Right here"], ["Locked in before I go", "Quiet and set"], ["Stay on this one", "Only this play"], ["I stayed with it", "With it until it ended"]),
      confident: pack(["I've got this", "Own this one", "I belong in this", "As myself"], ["I know I'm ready", "Mine before I go in"], ["This one is mine", "I take it"], ["I showed up as myself", "That was mine"]),
      focused: pack(["One job", "See the target", "Quiet around it", "Only this"], ["One thing before I go", "See it first"], ["Only this play", "Eyes on this"], ["I kept the one job", "Focus held"]),
      patient: pack(["On time", "Wait for it", "No rush", "Let it arrive"], ["I can wait to start", "Patient and set"], ["Let this one arrive", "Stay on time"], ["I let it take its time", "Patient to the end"]),
      fierce: pack(["Full effort", "Let it fly", "Own this one", "All in"], ["The edge comes with me", "Fierce and ready"], ["Attack this one", "All the way through"], ["I left it there", "The edge can rest"]),
      light: pack(["Light", "Easy feet", "Nothing heavy", "Easy"], ["Light before I start", "Easy walking in"], ["Light on this one", "Keep it easy"], ["Light as I come off", "Nothing to carry"]),
      certain: pack(["I know this", "One job", "Trust the work", "No extra"], ["Certain before I go in", "I know what I prepared"], ["Certain on this one", "Clean"], ["I knew it", "Certain all the way"]),
      brave: pack(["I step in", "I've got this", "Own this one", "Forward"], ["Brave before it starts", "I can walk in"], ["I take this one", "Step into it"], ["I stepped in", "Brave until it was done"]),
      playful: pack(["Play my game", "Let it fly", "Light", "This can be fun"], ["Playful and ready", "Fun before I start"], ["Play this one", "Let it be fun"], ["I played", "The fun can stay"]),
      composed: pack(["One breath", "Smooth and simple", "Quiet mind", "Settled"], ["Composed before I go in", "Settled and ready"], ["Stay composed", "Smooth on this one"], ["Still composed", "Steady as I come off"]),
      explosive: pack(["Let it fly", "Full effort", "Go", "All at once"], ["The burst is ready", "Loaded and set"], ["Let this one go", "Full on this one"], ["I spent it", "The burst is done"]),
      present: pack(["Right here", "This one", "Eyes up", "Here"], ["Here before it starts", "Present and set"], ["Only this", "Here on this play"], ["I was here for it", "Here until it ended"]),
      hungry: pack(["I want this one", "Full effort", "I want it", "All in"], ["Hungry and ready", "I want what's coming"], ["Hungry for this rep", "Take it"], ["I went for it", "That did its job"]),
      aggressive: pack(["Attack this one", "Through the finish", "Full effort", "Forward"], ["The edge comes with me", "Ready to take it"], ["Attack", "All the way through"], ["I brought it", "The edge can rest"]),
      steady: pack(["Same rhythm", "One at a time", "Smooth", "Even"], ["Steady before I start", "Same rhythm, set"], ["Stay on the rhythm", "This one, then the next"], ["The rhythm held", "Steady as I come off"]),
      smooth: pack(["Smooth and simple", "Easy", "Let it flow", "Clean"], ["Smooth before I go in", "Nothing forced"], ["Smooth on this one", "Let it flow"], ["Smooth to the end", "Easy as I leave it"]),
      easy: pack(["Let it be easy", "One breath", "Loose", "Simple"], ["Easy before I start", "No extra"], ["Easy on this one", "Stay loose"], ["Easy coming off", "Let it be done"]),
      _when: {
        "getting-ready": ["One breath", "See it first", "Loose and ready", "I'm ready", "Trust the work", "One job"],
        "in-the-moment": ["This one", "Eyes up", "Stay with it", "One job", "Through it", "Right here"],
        after: ["Let it settle", "I can come off it", "That one is done", "Leave it here", "Easy now", "Quiet"],
      },
    },
    confidence: {
      steady: pack(["I can stay steady", "Even voice", "One thing at a time", "Feet under me"], ["Steady before I walk in", "Set before I speak"], ["Steady while I speak", "Stay with this"], ["Steady as I leave it", "I stayed even"]),
      calm: pack(["I can take my time", "Quiet mind", "Unhurried", "Nothing to prove"], ["A quiet minute before I go in", "One breath before I speak"], ["Calm while I am in it", "I can pause"], ["Leave it quiet", "Calm as I step away"]),
      clear: pack(["One clear point", "I know what I mean", "Simple", "The next sentence"], ["Clear before I walk in", "I know my point"], ["Say the one point", "Clear while I speak"], ["I said what I meant", "Clear as I leave"]),
      "sure of myself": pack(["I trust myself", "I belong here", "My pace", "I can take the room"], ["Sure before I walk in", "I know I belong"], ["Sure while I speak", "This is my voice"], ["I trusted myself", "Sure as I leave"]),
      quiet: pack(["A quiet voice", "I can pause", "Nothing extra", "Soft and sure"], ["Quiet before I go in", "A still minute"], ["Quiet while I speak", "Leave room"], ["Quiet as I step away", "The quiet can stay"]),
      strong: pack(["Feet under me", "I can walk in", "Strong and simple", "I've got this"], ["Strong before I step in", "I bring this with me"], ["Strong while I speak", "Hold my ground"], ["I stood in it", "Strong as I leave"]),
      open: pack(["Open stance", "I can listen", "Room for them", "Willing"], ["Open before I walk in", "Ready to meet it"], ["Open while I am here", "I can hear them"], ["Open as I leave", "I stayed willing"]),
      "at ease": pack(["At ease", "Shoulders easy", "My pace", "I can breathe"], ["At ease before I go in", "Easy at the door"], ["At ease while I am in it", "Easy voice"], ["At ease as I leave", "Nothing stuck"]),
      _when: {
        "getting-ready": ["One breath", "I can walk in", "My pace", "I know my point", "Feet under me", "A quiet minute"],
        "in-the-moment": ["This moment", "My voice", "One point", "I can pause", "I'm here", "Stay with it"],
        after: ["I can step away", "That can rest", "I said my piece", "Leave it here", "Easy now", "Quiet"],
      },
    },
    success: {
      steady: pack(["One piece at a time", "Stay with the work", "Even pace", "The next line"], ["Steady before I open it", "Set for this block"], ["Steady in the work", "Stay on this piece"], ["The piece is done", "Steady as I close it"]),
      calm: pack(["Unhurried", "One clear task", "Quiet focus", "I can take my time"], ["Calm before I start", "A quiet minute at the desk"], ["Calm in the work", "No rush on this piece"], ["Close it calm", "Leave the desk quiet"]),
      clear: pack(["The next step", "One decision", "I know the point", "Simple"], ["Clear before I start", "I know the first move"], ["Clear on this piece", "One decision"], ["The step is taken", "Clear as I close"]),
      "sure of myself": pack(["I trust my judgment", "My work has a place", "I can ask", "I belong in this"], ["Sure before I start", "I know this work"], ["Sure while I do it", "Trust this call"], ["I trusted the work", "Sure as I close"]),
      quiet: pack(["Quiet focus", "The page in front of me", "Nothing extra", "A still start"], ["Quiet before I open it", "Clear the extra"], ["Quiet in the work", "Stay with the page"], ["Close it quiet", "The noise can wait"]),
      strong: pack(["I can do this piece", "Follow through", "Strong and simple", "The work in front of me"], ["Strong before I start", "I can open it"], ["Strong on this piece", "See it through"], ["I did the piece", "Strong as I close"]),
      open: pack(["Open to the next step", "I can hear them", "Willing to send it", "Room for a better idea"], ["Open before I start", "Ready for the work"], ["Open on this call", "I can adjust"], ["Open as I close", "The door can stay open"]),
      "at ease": pack(["At ease with the work", "My pace", "Shoulders easy", "I can begin"], ["At ease before I start", "Easy at the desk"], ["At ease in the work", "Easy on this piece"], ["At ease as I close", "The day can hold it"]),
      _when: {
        "getting-ready": ["The next piece", "I can start", "One clear task", "Quiet focus", "I know the first move", "My pace"],
        "in-the-moment": ["This piece", "Stay with it", "The next line", "One decision", "I'm in the work", "Send it"],
        after: ["This piece is done", "I can close it", "Leave it here", "The step is taken", "Step away", "Quiet"],
      },
    },
    health: {
      steady: pack(["A pace I can keep", "Even breath", "One ordinary session", "Stay with it"], ["Steady before I begin", "Set for this"], ["Steady while I do it", "Keep this pace"], ["Steady as I finish", "The pace held"]),
      calm: pack(["Unhurried body", "Easy breath", "Nothing forced", "Kind pace"], ["Calm before I start", "Easy before I move"], ["Calm in my body", "Stay easy"], ["Calm as I finish", "Let the body settle"]),
      clear: pack(["I know what this is", "One simple choice", "Clear and kind", "The next small step"], ["Clear before I start", "I know the plan"], ["Clear while I do it", "This step"], ["Clear as I finish", "That choice is made"]),
      "sure of myself": pack(["My body is on my side", "I can keep this", "I trust this pace", "Enough for today"], ["Sure before I start", "I can do this session"], ["Sure in my body", "Trust this rep"], ["I kept the promise", "Sure as I finish"]),
      quiet: pack(["Quiet effort", "Soft breath", "No performance", "Just this"], ["Quiet before I start", "A still minute"], ["Quiet while I move", "Stay soft"], ["Quiet as I finish", "Let it be quiet"]),
      strong: pack(["Strong and kind", "I can carry this", "Full range I have", "Steady strength"], ["Strong before I start", "Ready in my body"], ["Strong through this", "Stay with the effort"], ["Strong as I finish", "That effort can rest"]),
      open: pack(["Open posture", "Room to breathe", "Willing body", "Unforced"], ["Open before I start", "Room for this"], ["Open while I move", "Let the body have room"], ["Open as I finish", "Stay unforced"]),
      "at ease": pack(["At ease in my body", "Shoulders easy", "A kind pace", "I can rest inside this"], ["At ease before I start", "Easy getting ready"], ["At ease while I do it", "Easy breath"], ["At ease as I finish", "The body can settle"]),
      _when: {
        "getting-ready": ["I can begin", "A pace I can keep", "Easy breath", "One simple session", "Kind to my body", "Ready"],
        "in-the-moment": ["This session", "Stay with it", "Easy breath", "One more honest rep", "I'm in my body", "Keep the pace"],
        after: ["The session can end", "Let my body settle", "I did this one", "Recovery", "Easy now", "Kind"],
      },
    },
    "health-moving": {
      steady: pack(["Keep this pace", "Even breath", "Same rhythm", "Stay with it"], ["Set the pace", "Start even"], ["This pace", "Stay on the rhythm"], ["The pace held", "Ease off even"]),
      calm: pack(["Easy breath", "Unhurried", "Loose jaw", "Nothing forced"], ["Calm before the first move", "Easy start"], ["Stay easy", "Calm through this"], ["Let the body settle", "Slow the pace"]),
      clear: pack(["This move", "One job", "See the next step", "Simple"], ["Know the first move", "Clear start"], ["This step", "Stay on the move"], ["That move is done", "Clear finish"]),
      "sure of myself": pack(["I can do this", "Trust the pace", "My body knows this", "Enough"], ["Sure at the start", "I know this session"], ["Trust this rep", "I've got this move"], ["I did the session", "Sure at the end"]),
      quiet: pack(["Quiet effort", "Soft feet", "Low breath", "No extra"], ["Quiet start", "Begin soft"], ["Stay quiet", "Soft through this"], ["Finish quiet", "Let it go soft"]),
      strong: pack(["Strong through it", "Full effort I chose", "Steady power", "I've got this"], ["Strong from the start", "Ready strength"], ["Strong on this one", "Through the hard part"], ["Leave the effort here", "Strong finish"]),
      open: pack(["Room to move", "Open chest", "Easy reach", "Unforced"], ["Open before I move", "Make room"], ["Stay open", "Room on this rep"], ["Finish open", "Unforced"]),
      "at ease": pack(["Let it be easy", "Loose", "A kind pace", "I can breathe"], ["Easy start", "Loose first"], ["Easy on this one", "Stay loose"], ["Easy finish", "Shake it out"]),
      _when: {
        "getting-ready": ["Easy start", "One breath", "Loose", "I can begin", "A pace I can keep", "Ready"],
        "in-the-moment": ["This one", "Keep going", "Breathe", "Stay with it", "Right here", "Through it"],
        after: ["Ease off", "Let the body settle", "That set is done", "Shake it out", "Easy now", "Recovery"],
      },
    },
    relationships: {
      open: pack(["I can listen", "Room for them", "Unforced", "Willing"], ["Open before I see them", "Ready to meet them"], ["Open with them", "I can hear them"], ["Open as I leave", "I stayed willing"]),
      warm: pack(["Warm voice", "Kind eyes", "I can be glad to see them", "Soft and clear"], ["Warm before I walk in", "Glad before I see them"], ["Warm with them", "Stay kind"], ["Warm as I leave", "The warmth can stay"]),
      clear: pack(["Say the true thing", "Kind and clear", "One honest point", "I know what I mean"], ["Clear before we talk", "I know what I'll say"], ["Clear with them", "The true sentence"], ["I said the true thing", "Clear as I leave"]),
      steady: pack(["Even voice", "I can stay", "One thing at a time", "Feet under me"], ["Steady before I see them", "Set before we talk"], ["Steady with them", "Stay even"], ["Steady as I leave", "I stayed"]),
      kind: pack(["A kind tone", "I can be fair", "Soft and honest", "Care"], ["Kind before I walk in", "I can start kindly"], ["Kind with them", "Fair in this"], ["Kind as I leave", "Care can stay"]),
      close: pack(["I can be near", "Present with them", "Unforced closeness", "I'm here"], ["Ready to be with them", "Close before I arrive"], ["Here with them", "Stay near"], ["Glad I was with them", "Close as I leave"]),
      "at ease": pack(["At ease with them", "Shoulders easy", "My pace", "I can be myself"], ["At ease before I see them", "Easy on the way"], ["At ease with them now", "Easy voice"], ["At ease as I leave", "Nothing stuck"]),
      "sure of myself": pack(["I can be myself", "I matter here", "My voice", "A clear boundary"], ["Sure before I see them", "Myself on the way"], ["Sure with them", "I can say it"], ["I stayed myself", "Sure as I leave"]),
      _when: {
        "getting-ready": ["Before I see them", "I know what I'll say", "My pace", "I can be myself", "Kind and clear", "One breath"],
        "in-the-moment": ["With them", "I can listen", "My voice", "This conversation", "I'm here", "Kind and clear"],
        after: ["I can leave it", "Glad I showed up", "That talk can rest", "I stayed myself", "Easy now", "Kind"],
      },
    },
    mental: {
      steady: pack(["A slower pace", "I can stay", "Even breath", "One thing"], ["Steady before this part", "Set for the next stretch"], ["Steady in this", "Stay at this pace"], ["Steady as it closes", "The stretch can end"]),
      quiet: pack(["Quieter mind", "Room for quiet", "Soft breath", "Less noise"], ["Quiet before I go on", "A still minute"], ["Quiet in this", "Let it be quieter"], ["Quiet as I close", "The noise can drop"]),
      safe: pack(["I am safe here", "Feet on the ground", "This room", "I can stay"], ["Safe before I go on", "Here is enough"], ["Safe in this moment", "Stay here"], ["Safe as I close", "I made it through this part"]),
      clear: pack(["One clear thing", "Name what is here", "Simple", "The next small step"], ["Clear before I go on", "I know this next part"], ["Clear in this", "One thing"], ["Clear as I close", "That part is named"]),
      soft: pack(["Softer", "Unclenched", "Gentle pace", "Room"], ["Soft before I go on", "Ease the day"], ["Soft in this", "Stay gentle"], ["Soft as I close", "Let it soften"]),
      present: pack(["Right here", "This breath", "This minute", "I'm here"], ["Here before the next part", "Present as I start"], ["Here in this", "This minute"], ["Here as it ends", "I was here for it"]),
      "at ease": pack(["At ease", "Shoulders down", "A breath", "Nothing to fix"], ["At ease before I go on", "Easy for a minute"], ["At ease in this", "Stay easy"], ["At ease as I close", "Let this part end"]),
      "like myself": pack(["Like myself", "My ordinary voice", "Familiar", "I come back"], ["Myself before I go on", "Back to my pace"], ["Like myself in this", "My voice"], ["Still myself", "Myself as I close"]),
      _when: {
        "getting-ready": ["A slower start", "One breath", "I can begin this part", "Feet on the ground", "My pace", "Here"],
        "in-the-moment": ["Right here", "This minute", "A slower pace", "I'm here", "One breath", "This feeling can stay"],
        after: ["This part can end", "I can come down", "Let it settle", "Still myself", "Easy now", "Quiet"],
      },
    },
    sleep: {
      "heavy and safe": pack(["Heavy", "Safe", "The bed can hold me", "Nothing else tonight"], ["Heavy as the day ends", "Safe to put it down"], ["Heavy here", "Safe in this rest"], ["Heavy into the morning", "Safe as I wake"]),
      quiet: pack(["Quiet", "The room is enough", "Soft", "Less and less"], ["Quiet as the day ends", "Turn the day down"], ["Quiet here", "Stay with the quiet"], ["A quiet wake", "No loud start"]),
      warm: pack(["Warm", "Familiar", "Soft cover", "Held"], ["Warm as I wind down", "The day can cool"], ["Warm here", "Stay warm"], ["Warm as I wake", "Unhurried warmth"]),
      unhurried: pack(["Unhurried", "No schedule in this", "Slow", "The night has time"], ["Unhurried wind-down", "The day can wait"], ["Unhurried rest", "Stay slow"], ["Unhurried morning", "No rush to rise"]),
      soft: pack(["Soft", "Jaw loose", "Shoulders down", "Gentle"], ["Soft as the day ends", "Let the edges drop"], ["Soft here", "Stay soft"], ["A soft wake", "Gentle light"]),
      "at ease": pack(["At ease", "The day is allowed to be over", "Easy body", "Nothing owed this minute"], ["At ease as I wind down", "I can stop"], ["At ease here", "Stay easy"], ["At ease waking", "The morning can wait"]),
      "done with the day": pack(["Done", "The day can wait", "I put it down", "Enough for tonight"], ["Done as I wind down", "That day is over"], ["Done, resting", "Stay finished"], ["The night did its job", "A finished night"]),
      slow: pack(["Slow", "Longer breath", "No hurry", "Heavy in a good way"], ["Slow wind-down", "Lengthen the evening"], ["Slow rest", "Stay slow"], ["A slow wake", "Let the morning arrive"]),
      _when: {
        "getting-ready": ["The day can wait", "Lights low", "I can stop", "Slow", "Put it down", "Soft"],
        "in-the-moment": ["Here in the quiet", "Heavy", "Eyes can close", "Slow breath", "The bed", "Safe"],
        after: ["A slow morning", "No rush", "Gentle light", "Unhurried", "Still quiet", "Easy"],
      },
    },
    identity: {
      steady: pack(["I am steady", "Even", "My pace", "Here"], ["Steady as I begin", "I start as myself"], ["Steady in this", "I stay"], ["Steady as it ends", "Still steady"]),
      calm: pack(["I am calm", "Unhurried", "A quiet center", "I can breathe"], ["Calm as I begin", "Quiet before I step in"], ["Calm in this", "I stay unhurried"], ["Calm as it ends", "The quiet stays"]),
      clear: pack(["I am clear", "One true line", "Simple", "I know what is mine"], ["Clear as I begin", "I know who I am here"], ["Clear in this", "The true line"], ["Clear as it ends", "That stayed true"]),
      "sure of myself": pack(["I am sure", "I trust who I am", "My name for myself", "Enough"], ["Sure as I begin", "I walk in as myself"], ["Sure in this", "I stay myself"], ["Sure as it ends", "I was myself"]),
      quiet: pack(["I am quiet", "Nothing extra", "A still center", "Soft"], ["Quiet as I begin", "A still start"], ["Quiet in this", "I can be quiet here"], ["Quiet as it ends", "The quiet stays"]),
      strong: pack(["I am strong", "Simple strength", "I can carry this", "Upright"], ["Strong as I begin", "I bring this in"], ["Strong in this", "I stay upright"], ["Strong as it ends", "That strength stays"]),
      open: pack(["I am open", "Willing", "Room", "Unforced"], ["Open as I begin", "Ready to step in"], ["Open in this", "I stay willing"], ["Open as it ends", "Still open"]),
      "at ease": pack(["I am at ease", "Shoulders easy", "My ordinary self", "Unforced"], ["At ease as I begin", "Easy before I step in"], ["At ease in this", "I stay easy"], ["At ease as it ends", "Easy still"]),
      _when: {
        "getting-ready": ["As I begin", "I bring this with me", "One true line", "My pace", "Before I step in", "Here"],
        "in-the-moment": ["In this", "I stay", "Right here", "This is me", "One true line", "Now"],
        after: ["As it ends", "Still me", "That stayed true", "I can settle", "Easy", "Here"],
      },
    },
    other: {
      steady: pack(["Steady", "My pace", "One step", "I can stay"], ["Steady before it", "Set for this"], ["Steady in it", "Stay"], ["Steady once it ends", "I stayed"]),
      calm: pack(["Calm", "Unhurried", "A breath", "Quiet"], ["Calm before it", "A quiet start"], ["Calm in it", "I can pause"], ["Calm once it ends", "Let it settle"]),
      clear: pack(["Clear", "One point", "Simple", "I know this"], ["Clear before it", "I know the point"], ["Clear in it", "The one point"], ["Clear once it ends", "That stayed clear"]),
      "sure of myself": pack(["Sure", "I trust myself here", "My way", "Enough"], ["Sure before it", "I can step in"], ["Sure in it", "I stay with myself"], ["Sure once it ends", "I trusted myself"]),
      quiet: pack(["Quiet", "Nothing extra", "Soft", "Room"], ["Quiet before it", "A still minute"], ["Quiet in it", "Leave room"], ["Quiet once it ends", "The quiet can stay"]),
      strong: pack(["Strong", "Simple", "I can do this part", "Upright"], ["Strong before it", "I bring this"], ["Strong in it", "Through this part"], ["Strong once it ends", "That can rest"]),
      open: pack(["Open", "Willing", "Room", "Unforced"], ["Open before it", "Ready for this"], ["Open in it", "I can meet it"], ["Open once it ends", "Still willing"]),
      "at ease": pack(["At ease", "Easy", "My pace", "A breath"], ["At ease before it", "Easy start"], ["At ease in it", "Stay easy"], ["At ease once it ends", "Easy now"]),
      _when: {
        "getting-ready": ["Before it", "I can step toward it", "One breath", "My pace", "The real thing", "Ready"],
        "in-the-moment": ["In it", "Right here", "This part", "I stay", "One breath", "Now"],
        after: ["Once it is over", "I can settle", "That part is done", "Leave it", "Easy", "Quiet"],
      },
    },
  };

  function associationChips(categoryId, feeling, mode) {
    var when = mode === "in-the-moment" || mode === "after" ? mode : "getting-ready";
    var table = ASSOCIATIONS[associationFamily(categoryId, when)] || ASSOCIATIONS.other;
    var key = String(feeling || "").trim().toLowerCase();
    var row = table[key];
    var lead = row && row[when] ? row[when] : [];
    var base = row && row.lines ? row.lines : ((table._when && table._when[when]) || []);
    var out = [];
    lead.concat(base).forEach(function (line) {
      if (out.some(function (have) { return have.toLowerCase() === String(line).toLowerCase(); })) return;
      out.push(line);
    });
    return out.slice(0, 6);
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
    associationChips: associationChips,
    overAndOverQuestions: overAndOverQuestions,
    overAndOverObstacle: "Are there things that get in your way? (optional)",
  };
})(window);
