/**
 * Personal follow-up pairing, plus an optional compare against questionsFor.
 *
 *   node app/personal-questions.check.js
 *   node app/personal-questions.check.js /path/to/FocuShift/functions/writer
 */
"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const web = require("./personal-questions.js");

function assertFollowUpsStayOnOneSlot() {
  const categories = [
    "confidence",
    "relationships",
    "success-prosperity",
    "mental-wellbeing",
    "health-fitness",
    "sports-performance",
    "sleep-rest",
    "i-am",
    "other",
  ];
  const intentions = ["moment", "repeat"];
  const whens = ["getting-ready", "in-the-moment", "after"];
  let pathsChecked = 0;
  categories.forEach(function (categoryId) {
    intentions.forEach(function (intention) {
      whens.forEach(function (when) {
        const questions = web.questions(categoryId, intention, when);
        assert.ok(questions.length >= 2, categoryId + " " + intention + " " + when);
        const clarifying = {};
        const seen = [];
        questions.forEach(function (expected, index) {
          const next = web.nextPersonalFollowUp(categoryId, intention, when, {}, clarifying);
          assert.equal(next.done, false, categoryId + " follow-up " + (index + 1));
          assert.equal(next.slot, expected.slot);
          assert.equal(next.part || "", expected.part || "");
          assert.equal(next.question, expected.text);
          assert.equal(next.hint, expected.text, "hint must be this slot's category wording");
          assert.equal(next.answerKey, web.answerKey(expected));
          assert.ok(next.question, "follow-up " + (index + 1) + " must show a question");
          seen.forEach(function (previous) {
            assert.notEqual(next.answerKey, previous.answerKey);
          });
          seen.push(next);
          clarifying[next.question] = "answer " + index;
        });
        const finished = web.nextPersonalFollowUp(categoryId, intention, when, {}, clarifying);
        assert.equal(finished.done, true);
        assert.equal(finished.question, "");
        assert.match(finished.message, /already has an answer/);
        pathsChecked += 1;
      });
    });
  });
  assert.equal(pathsChecked, 54);

  const repeatBefore = web.nextPersonalFollowUp("confidence", "repeat", "getting-ready", {
    situation: "hard conversations",
    feeling: "steady",
  }, {});
  assert.equal(repeatBefore.slot, "beliefs");
  assert.match(repeatBefore.question, /believe about yourself on those days/);
  assert.equal(repeatBefore.hint, repeatBefore.question);
  assert.equal(/where or when you want to feel/.test(repeatBefore.hint), false);

  const second = web.nextPersonalFollowUp("confidence", "repeat", "getting-ready", {
    situation: "hard conversations",
    feeling: "steady",
  }, { [repeatBefore.question]: "I belong in the room" });
  assert.equal(second.done, false);
  assert.equal(second.slot, "pastProof");
  assert.match(second.question, /already felt that way/);
  assert.equal(second.hint, second.question);
  assert.notEqual(second.question, repeatBefore.question);
}

assertFollowUpsStayOnOneSlot();
console.log("personal follow-ups: hint and question share a slot on all 54 paths, and the next follow-up advances");

const spaced = "First paragraph.\n [warm] Second paragraph.\n\t[calm] Third.";
assert.equal(
  web.normalizeScriptParagraphs(spaced),
  "First paragraph.\n[warm] Second paragraph.\n[calm] Third."
);

const writerDir = process.argv[2];
if (!writerDir) {
  console.log("personal-questions checks passed (no companion path given)");
  process.exit(0);
}

const pq = require(path.join(writerDir, "personalQuestions.js"));
const paths = pq.allPaths();
assert.equal(paths.length, 54, "questionsFor should render 54 paths");
assert.equal(Object.keys(web.TABLE).length, 54);
assert.equal(web.HINT, pq.data().hint);
assert.equal(web.OPTIONAL_HEADING, pq.data().optionalHeading);

const flat = {
  situation: "Monday's pitch to my director",
  people: "Ana",
  feeling: "steady and clear",
  beliefs: "I belong in the room",
  pastProof: "I stayed with the first line last spring",
  cue: "steady",
  firstStep: "open with the number",
  whyItMatters: "it makes the next ask easier",
  "keepLetGo:keep": "I stayed with the first line",
  "keepLetGo:release": "the rush before I started",
  obstacle: "I rush the first line",
  topic: "should not become an extra slot",
};

for (const item of paths) {
  const got = web.questions(item.categoryId, item.intention, item.when);
  assert.deepEqual(got, item.questions, item.categoryId + " " + item.intention + " " + item.when);
  for (const length of ["Auto", "Short", "Standard", "Long", ""]) {
    const expected = pq.buildPersonal(item.categoryId, item.intention, item.when, flat, length);
    const actual = web.buildPersonal(item.categoryId, item.intention, item.when, flat, length);
    assert.deepEqual(actual, expected, item.categoryId + " " + item.intention + " " + item.when + " " + (length || "(empty length)"));
  }
  const blank = web.buildPersonal(item.categoryId, item.intention, item.when, {}, "Auto");
  assert.deepEqual(blank.personal.slots, {});
  assert.deepEqual(blank.legacy, []);
}

const sample = web.buildPersonal("confidence", "moment", "getting-ready", {
  situation: "Monday's pitch to my director",
  feeling: "steady and clear",
  obstacle: "I rush the first line",
}, "Auto");
assert.equal(sample.personal.version, 1);
assert.equal(sample.personal.length, "Auto");
assert.equal(sample.legacy.join("|"), "Monday's pitch to my director|steady and clear");
assert.equal(sample.obstacle, "I rush the first line");
assert.equal(sample.context, "Monday's pitch to my director");
assert.equal(sample.feeling, "steady and clear");
assert.equal(Object.prototype.hasOwnProperty.call(sample.personal.slots, "pastProof"), false);

const after = web.buildPersonal("confidence", "moment", "after", {
  situation: "the talk",
  feeling: "quiet",
  "keepLetGo:keep": "I stayed with the first line",
  "keepLetGo:release": "the rush before I started",
}, "Long");
assert.equal(after.personal.slots.keepLetGo.answer, "Keep: I stayed with the first line\nRelease: the rush before I started");
assert.match(after.personal.slots.keepLetGo.question, /remember/);
assert.match(after.personal.slots.keepLetGo.question, /set down/);

const identity = web.buildPersonal("i-am", "repeat", "getting-ready", {
  beliefs: "I am steady",
  situation: "",
  feeling: "warm",
}, "Standard");
assert.deepEqual(identity.legacy, ["I am steady"]);
assert.equal(identity.personal.slots.feeling, undefined);

const topic = web.questions("other", "moment", "in-the-moment");
assert.equal(topic[0].text, "What's this about?");
assert.equal(topic[0].slot, "situation");
assert.equal(topic[0].required, true);

console.log("personal-questions.js matches questionsFor for 54 paths");
