# Background music for the web app

These MP3s must match the **iOS** `FocuShift/BackGroundAudio/` bundle (same filenames as in `BackgroundTrack.swift`).

## Setup

1. From the main FocuShift repo, copy the listed files into this folder:

   ```bash
   cp "/path/to/FocuShift/FocuShift/BackGroundAudio/"*.mp3 "/path/to/FocuShift/website/audio/backgrounds/"
   ```

2. Commit and push the `website` repo so Cloudflare Pages deploys them.

3. They are served at URLs like:  
   `https://focusshift.app/audio/backgrounds/<filename>.mp3`  
   (paths are resolved from `/app/` via `../audio/backgrounds/`.)

## Filenames used by the web UI today

The web app’s background list expects at least:

| File |
|------|
| `background-music-soft-calm-333111.mp3` |
| `calm-night-312296.mp3` |
| `meditation-relaxing-music-background-320405.mp3` |
| `piano-background-music-337774.mp3` |
| `soft-calm-piano-music-405074.mp3` |
| `Inner Calm.mp3` |
| `Calm Groove.mp3` |
| `Warm Melody.mp3` |
| `Calm Piano Whisper.mp3` |

Spaces and capitalization must match the iOS project files.

## What they’re used for

- **Preview** — “Preview” in Backgrounds settings and ▶ in the script/premade background picker.
- **Generate** — After ElevenLabs TTS, the browser mixes voice + bed (same lead-in / tail / level as iOS `AudioMixingService`) and uploads a **WAV** to Firebase Storage.

If a file is missing, preview and mix will fail until you add it and redeploy.
