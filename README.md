# Superwhisper Integrations

Extend Superwhisper posibilities with Raycast

## demo

![Superwhisper2Notes デモ](demo/superwhisper2notes.gif)

### How to use check-superwhisper-recording.js

Automatically detects new SuperWhisper audio recordings and saves their transcriptions (llmResult) as new notes in the Apple Notes app.
Run this script as a Raycast script command or directly with Node.js.
On the first run, it uses the latest existing recording as a baseline; after that, only new recordings are processed automatically.

- Please update the SuperWhisper recordings directory (RECORDINGS_DIR) as needed.
- Make sure your Apple Notes app is set up with an iCloud account.

Example usage:
```sh
node demo/check-superwhisper-recording.js
```

You can use it via [Script Commands](https://manual.raycast.com/script-commands)

*You can also use this as a Raycast script command.*
