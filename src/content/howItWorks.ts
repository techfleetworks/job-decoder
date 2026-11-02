// The "How it works" steps shown in the UI panel. They mirror the numbered business logic
// in ADR-0018 in plain language, so a person can read the whole decode in order. Keep this
// list in step with ADR-0018; a test checks the count so a step cannot go missing.

export const HOW_IT_WORKS: string[] = [
  "You enter a job title and paste one job posting. Nothing is saved to your device, and there is no history.",
  "The app matches your title to one job function. It does not ask you to choose. If the title is not covered, it tells you plainly.",
  "From the framework, it loads that job function's standard duties (its hats) and each duty's activities, deliverables, and tools.",
  "It reads the posting for those activities, deliverables, and tools, by exact wording and by close wording. An AI step and a keyword step run together, and their results are combined.",
  "It checks every match against the framework. The item must exist, and its quote must appear word for word in the posting. Anything else is dropped.",
  "A list of duties or responsibilities in the posting is read as activities, not as framework duties.",
  "If the posting lists skills, the app follows each skill to its activity and matches on the activity.",
  "Each matched item rolls up to the duty responsible for it, so the match counts toward the right hat.",
  "It counts, for each duty, how many activities, deliverables, and tools the posting named, split into exact and close.",
  "It sorts the duties into three sets: named and expected, expected but missing (the hidden hats), and named but not standard for the title.",
  "It works out the match percentage and the title-fit verdict from how well the named duties cover the title's standard duties.",
  "It shows the result one part at a time: the verdict, then each set of hats with its counts.",
  "It shows a receipt: each match as the quote from the posting, the item and its type, whether it was exact or close, and the hat it rolls up to.",
  "It lists the posting lines it could not place, so misses are visible and never hidden.",
  "If the AI step is unavailable, the keyword result stands on its own and is labeled a basic read. The app degrades; it never crashes.",
  "Everything shown comes from the framework. The AI changes no number and no verdict.",
];
