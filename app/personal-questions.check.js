/**
 * Compare the generated web table with questionsFor from the companion repo.
 *
 *   node app/personal-questions.check.js /path/to/FocuShift/functions/writer
 *
 * The directory must contain personalQuestions.js and personal-questions.json.
 */
"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const web = require("./personal-questions.js");

const writerDir = process.argv[2];
if (!writerDir) {
  console.error("Usage: node app/personal-questions.check.js /path/to/functions/writer");
  process.exit(1);
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
