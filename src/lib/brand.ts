export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME?.trim() || "EDIT."

export const copy = {
  promise: "Turn a pile of good photos into the few that belong together",
  tagline: "Not a score. Not a cull. A visual edit",
  heroEyebrow: "For the night after the trip",
  heroHeadline: "You already deleted the bad ones.",
  heroHeadlineAccent: "Now comes the part that ruins the evening.",
  heroBody:
    "Twenty frames. All good. None obvious. EDIT. builds the set — what stays, what goes, and in what order — so you stop arguing with a chatbot about photo 7 versus photo 12.",
  privacy:
    "Original files stay on your device. Smaller working copies are uploaded temporarily for analysis",
  privacyCleanup:
    "Working copies are deleted from our temporary storage after the edit finishes",
  studioEmptyHeading: "What belongs together?",
  studioEmptySub:
    "Start with the photos you already like. The editor’s job begins after the obvious cuts",
  tooFew: "Add at least 2 candidates to build an edit",
  tooMany: "Start with your strongest 20 candidates for this first edit",
  uploadFail:
    "One working copy couldn’t be uploaded. Remove it or try again",
  aiFail:
    "The editor couldn’t finish this set. Your originals are still safe on your device",
  editTimeout:
    "This edit took too long and was stopped. Try fewer photos or a smaller final count, then run again",
  invalidResult:
    "The editor returned an incomplete sequence. Try this edit again",
  demoLocked: "This demo is access-controlled",
  frustrationLabel: "Familiar?",
  satisfactionLabel: "What you actually wanted",
} as const
