/** Onboarding screens. "cv" + "review" together form step 1 of the 5 user-facing steps. */
export const ONBOARDING_STEPS = [
  "cv",
  "review",
  "status",
  "preferences",
  "interests",
  "values",
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const VISIBLE_STEP: Record<OnboardingStep, number> = {
  cv: 1,
  review: 1,
  status: 2,
  preferences: 3,
  interests: 4,
  values: 5,
};
export const VISIBLE_STEP_COUNT = 5;

export function isStep(s: string): s is OnboardingStep {
  return (ONBOARDING_STEPS as readonly string[]).includes(s);
}

export function nextStep(s: OnboardingStep): OnboardingStep | null {
  return ONBOARDING_STEPS[ONBOARDING_STEPS.indexOf(s) + 1] ?? null;
}

export function prevStep(s: OnboardingStep): OnboardingStep | null {
  return ONBOARDING_STEPS[ONBOARDING_STEPS.indexOf(s) - 1] ?? null;
}
