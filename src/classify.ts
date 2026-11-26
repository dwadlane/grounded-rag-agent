export type Route = "emergency" | "out_of_scope" | "in_scope";

/**
 * Emergency detection is deliberately broad. A false alarm costs one extra
 * sentence; a miss could cost a life. This runs before any model is called.
 */
const EMERGENCY = new RegExp(
  [
    "chest (pain|pressure|tightness)",
    "(can'?t|cannot|can not) (breathe|breath)",
    "(trouble|difficulty|hard to) breathing",
    "short(ness)? of breath",
    "not breathing",
    "stopped breathing",
    "\\bstroke\\b",
    "face (is )?droop",
    "seizure",
    "convuls",
    "unconscious",
    "unresponsive",
    "overdos\\w*",
    "too many (pills|tablets)",
    "heart attack",
    "severe bleeding",
    "bleeding (heavily|a lot|badly)",
    "won'?t stop bleeding",
    "anaphyla",
    "choking",
    "suicid\\w*",
    "kill myself",
    "end my life",
    "want to die",
  ].join("|"),
  "i",
);

/** Things this agent never answers: medical advice and anything unrelated to the clinics. */
const OUT_OF_SCOPE = new RegExp(
  [
    "\\b(dose|dosage)\\b",
    "how many (mg|milligrams|tablets|pills) ",
    "should i take\\b",
    "safe to (take|mix|combine)",
    "what is wrong with me",
    "\\bdiagnos(e|is)\\b",
    "\\bweather\\b",
    "\\brestaurant",
    "\\brecipe",
    "\\b(python|javascript|typescript|sql)\\b",
    "write (me )?(a|an) (poem|story|essay|program|song)",
    "\\b(stock|share) price",
    "\\bcapital of\\b",
    "\\bmovie",
  ].join("|"),
  "i",
);

export function classify(question: string): { route: Route; reason: string } {
  if (EMERGENCY.test(question)) return { route: "emergency", reason: "emergency_phrase" };
  if (OUT_OF_SCOPE.test(question)) return { route: "out_of_scope", reason: "advice_or_unrelated" };
  return { route: "in_scope", reason: "default" };
}
