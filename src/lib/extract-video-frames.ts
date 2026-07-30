/** Pulls a handful of evenly-spaced frames out of an uploaded video file, client-side,
 * as JPEG data URLs -- used to feed the behavioral-signals vision analysis without
 * uploading or processing full video server-side. */
export async function extractVideoFrames(file: File, count = 6, maxWidth = 480): Promise<string[]> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Could not read video file"));
    });

    const duration = video.duration;
    if (!isFinite(duration) || duration <= 0) throw new Error("Video has no readable duration");

    const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round((video.videoWidth || maxWidth) * scale);
    canvas.height = Math.round((video.videoHeight || maxWidth) * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    const frames: string[] = [];
    for (let i = 0; i < count; i++) {
      const t = (duration * (i + 1)) / (count + 1);
      await new Promise<void>((resolve, reject) => {
        video.onseeked = () => resolve();
        video.onerror = () => reject(new Error("Could not seek video"));
        video.currentTime = t;
      });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL("image/jpeg", 0.7));
    }
    return frames;
  } finally {
    URL.revokeObjectURL(url);
  }
}
