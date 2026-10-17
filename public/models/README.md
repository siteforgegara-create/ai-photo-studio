# Models

| File | What | License |
|---|---|---|
| `face_detector_short_range.tflite` | BlazeFace short-range face detector used by the in-browser selfie check and face-centred crops. Built by `scripts/build-face-model.py` from `@mediapipe/face_detection` (metadata added for MediaPipe Tasks). | Apache-2.0 |

The MediaPipe WASM runtime is copied to `public/vendor/mediapipe/wasm/` on `npm install` (postinstall) and is not committed.
