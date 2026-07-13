## Problem

The `<video>` element in the scan modal stays black. The stream is acquired successfully (permission dialog resolves), but the frame never paints.

Root cause: we attach `srcObject` inside a `setTimeout(0)` after flipping `mode` to `"camera"`. In a Radix Dialog the content mounts through a portal + animation, so `videoRef.current` is often still `null` on the next tick, or the element is attached but `play()` rejects silently because the element isn't yet in the layout tree. There is also no `onLoadedMetadata` handler, so we never retry `play()` once dimensions are known.

## Fix

Rewire the camera lifecycle so the stream is attached *reactively* once the video element exists, not via `setTimeout`:

1. Store the `MediaStream` in React state (`stream`), not just a ref.
2. Trigger `getUserMedia` from the user's click as today (keeps the gesture), but only `setStream(...)` + `setMode("camera")` — do not touch the video element in the click handler.
3. Add a `useEffect` keyed on `[mode, stream]` that:
   - finds `videoRef.current`,
   - assigns `srcObject = stream`,
   - awaits `loadedmetadata` (via event listener) then calls `video.play()`,
   - logs any `play()` rejection to `toast` so failures stop being silent.
4. Add `onCanPlay={() => videoRef.current?.play().catch(()=>{})}` on the `<video>` as a second safety net.
5. Give the video a guaranteed non-zero box before the stream loads: keep `aspect-[1.6/1] object-cover w-full` and add `bg-black` so a blank frame is obviously the video, not a layout collapse.
6. On `stopCamera()` / dialog close, also clear `video.srcObject = null` and `setStream(null)` so a re-open starts clean.
7. Keep the existing `facingMode: "environment"` → `{ video: true }` fallback.

## Files touched

- `src/routes/contacts.index.tsx` — only the `ScanBusinessCardDialog` component (camera lifecycle). No other UI or business logic changes.

## Verification

After the change, open Contacts → Scan business card → Use camera. Expect: live webcam feed inside the framed overlay within ~1s. If `play()` still rejects, a toast surfaces the reason instead of a silent black frame.
