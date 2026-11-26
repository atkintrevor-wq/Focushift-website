/* Legacy bundled background IDs (the old audio/backgrounds catalog) -> live backgroundCatalog docs.
   Approved stand-ins and identical cloud copies. See bundled-backgrounds-map.csv. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FocusShiftLegacyBackgrounds = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var aliases = {
  "bg-rain": "bg-cloud-0198adfc-6073-4b2f-a98c-56a8d59a306a",
  "bg-nature-presence-glow": "bg-cloud-90fc9ceb-438a-4812-a538-77f4b357a4aa",
  "bg-breeze-glow": "bg-cloud-96e04ca3-0fa4-4e84-905c-6582bad8641e",
  "bg-serene-wave-drift": "bg-cloud-972173f8-44b6-48d5-8fa8-9af2142ee90c",
  "bg-whisper-flow": "bg-cloud-ef6fb715-75f8-47cb-948d-ded984840b6a",
  "bg-piano": "bg-cloud-918c480a-0cce-4bf7-8531-355ed3e4b52a",
  "bg-soft-calm-piano": "bg-cloud-70a5b9c5-0e8a-4201-a9c0-5a4e0baffcb9",
  "bg-warm-melody": "bg-cloud-899c1983-462f-4800-bcb9-915be96d36d7",
  "bg-calm-piano-whisper": "bg-cloud-0cd2ff04-377b-4a1d-b845-e926e34830ed",
  "bg-kindness-melody": "bg-cloud-e9824510-6eef-458f-89fd-b6988458761f",
  "bg-calm-soft": "bg-cloud-8aa0fb3c-c908-48b8-b036-b1cb458e21b7",
  "bg-meditation": "bg-cloud-aaa7ffdc-a75f-4aba-b4f9-2e33824d53a8",
  "bg-please-calm": "bg-cloud-d03fab66-badd-40c4-8b38-3de8aaaea90a",
  "bg-mindful-drift": "bg-cloud-e79eb3a6-b979-4348-82fd-f21373b44409",
  "bg-inner-calm": "bg-cloud-261c461c-9e3c-4004-b278-22d88c6edab9",
  "bg-serene-mind-whisper": "bg-cloud-d03fab66-badd-40c4-8b38-3de8aaaea90a",
  "bg-connection-drift": "bg-cloud-175bd932-7e91-4c78-b2c9-197884308856",
  "bg-theta-peace-drift": "bg-cloud-21e71fad-d77b-4ab7-a10c-1a75d526b65c",
  "bg-deep-serenity-pulse": "bg-cloud-2d9d9e4f-7e96-42a4-a6ad-db1c57a84513",
  "bg-calm-night": "bg-cloud-df4c333d-fbe6-490c-a2e5-853d8341fa3a",
  "bg-just-relax": "bg-cloud-336591e7-57f5-47ca-835e-7d406d90a619",
  "bg-oasis": "bg-cloud-5243ed58-3b24-4f02-a79d-667cb326561c",
  "bg-penguin": "bg-cloud-27e513db-307a-4d55-b464-3c8d171d7c1f",
  "bg-calm-groove": "bg-cloud-cd0a311d-cbc8-44b3-99bb-77b0b91dde44",
  "bg-growth-glow": "bg-cloud-4c06505e-d86c-4854-b739-213830f39e3c",
  "bg-freedom-whisper": "bg-cloud-7fd6b16d-fdc3-4f60-94aa-13c8842437f5",
  "bg-orchestral-calm-embrace": "bg-cloud-9b100284-db64-4dd9-9bf0-1cc878f5f95f",
  "bg-harmony-rise": "bg-cloud-cbe7ea74-e9be-4c2b-99ec-4449a99434d7",
  "bg-symphony-ascend": "bg-cloud-afd0202d-e734-445c-9c1c-878546a3425a",
  "bg-resilience-ascend": "bg-cloud-ce6cdedf-1bfc-4a20-a2ab-f836b69a3c6a",
  "bg-compassion-rise": "bg-cloud-7195ed22-f5f1-4881-887a-4dcc98c1c3e1",
  "bg-clarity-sting-echo": "bg-cloud-3300d568-361f-4836-9641-502e2958dba2",
  "bg-assertive-whisper": "bg-cloud-9c815566-5d6b-4e27-8b1f-dc4bd1468d69",
  "bg-purpose-pulse": "bg-cloud-317d0d35-ce79-486b-ac15-d4e75fbe6c31",
  "bg-groove-bloom": "bg-cloud-27321e1b-f3e7-448b-b4fc-cefdeed29f87",
  "bg-joyful-fusion": "bg-cloud-184c7b14-72ef-4c23-8844-288ed466eeed",
  "bg-recovery-glow": "bg-cloud-c9048760-1f57-4919-8eab-49b53c33e863",
  "bg-vitality-wave-rise": "bg-cloud-76ee2191-c291-475f-bd31-91cedcf686bc",
  "bg-ambient-mastery-pulse": "bg-cloud-95a0fae1-48b4-4027-9fec-838142e0989b",
  "bg-orchestral-resilience-rush": "bg-cloud-7a547804-661c-4236-a5cc-ddbe4d720b48",
  "bg-relentless-edge-surge": "bg-cloud-74933b25-6fcc-4fa7-87e0-7eeb6b3afcb0",
  "bg-riff-resilience-rush": "bg-cloud-6b54c80d-10aa-4d20-b9ac-56714330cd0b",
  "bg-synth-flow-fury": "bg-cloud-2a03f427-b572-4f6e-9aa0-0e1b1ab205bf",
  "bg-breakthrough-surge": "bg-cloud-4df443d6-ca88-4c67-8672-0dfdef848c82",
  "bg-momentum-desire": "bg-cloud-f535d6de-5da3-4a33-8b19-90205608387c"
};

  var freeDefaults = {
    none: "bg-none",
    rain: "bg-cloud-0198adfc-6073-4b2f-a98c-56a8d59a306a",
    piano: "bg-cloud-918c480a-0cce-4bf7-8531-355ed3e4b52a",
    meditation: "bg-cloud-aaa7ffdc-a75f-4aba-b4f9-2e33824d53a8",
  };

  function canonicalBackgroundId(backgroundId) {
    var id = (backgroundId && String(backgroundId).trim()) || "";
    if (!id) return "";
    return aliases[id] || id;
  }

  return {
    aliases: aliases,
    freeDefaults: freeDefaults,
    canonicalBackgroundId: canonicalBackgroundId,
  };
});
