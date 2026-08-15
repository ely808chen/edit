export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME?.trim() || "EDIT."

export const copy = {
  promise: "Turn twenty good photos into the six that belong together",
  tagline: "Not a score. Not a cull. A visual edit",
  heroHeadline:
    "The hard part isn’t deleting bad photos. It’s choosing between the good ones.",
  heroBody:
    "EDIT. looks at the whole shoot, makes the close calls, and builds a final sequence — not a pile of photo scores",
  privacy:
    "Original files stay on your device. Smaller working copies are uploaded temporarily for analysis",
  privacyCleanup:
    "Working copies are deleted from our temporary storage after the edit finishes",
  studioEmptyHeading: "What belongs together?",
  studioEmptySub:
    "Start with the photos you already like. The editor’s job begins after the obvious cuts",
  tooFew: "Add at least 12 candidates so the editor has a meaningful set to work with",
  tooMany: "Start with your strongest 20 candidates for this first edit",
  uploadFail:
    "One working copy couldn’t be uploaded. Remove it or try again",
  aiFail:
    "The editor couldn’t finish this set. Your originals are still safe on your device",
  invalidResult:
    "The editor returned an incomplete sequence. Try this edit again",
  demoLocked: "This demo is access-controlled",
} as const
