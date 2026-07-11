import {
  getVisibleTourSteps,
  getVisibleTourTopics,
  hasSeenTour,
  markTourSeen,
  TOUR_SEEN_KEY,
  TOUR_STEPS,
  TOUR_TOPICS,
  TOUR_VERSION,
} from "./tourSteps";

const BASE_STEP_IDS = [
  "home",
  "lists",
  "recipes",
  "food-plan",
  "bills",
  "households",
];

describe("getVisibleTourSteps", () => {
  it("shows only the base steps to a household Member with global User role", () => {
    const steps = getVisibleTourSteps({
      householdRole: "Member",
      userRole: "User",
    });
    expect(steps.map((s) => s.id)).toEqual(BASE_STEP_IDS);
  });

  it("adds the manage-household step for a household Admin", () => {
    const steps = getVisibleTourSteps({
      householdRole: "Admin",
      userRole: "User",
    });
    expect(steps.map((s) => s.id)).toEqual([
      ...BASE_STEP_IDS,
      "manage-household",
    ]);
  });

  it("shows every step to a household Owner with global Admin role", () => {
    const steps = getVisibleTourSteps({
      householdRole: "Owner",
      userRole: "Admin",
    });
    expect(steps.map((s) => s.id)).toEqual(TOUR_STEPS.map((s) => s.id));
  });

  it("shows only the base steps when roles are unknown", () => {
    const steps = getVisibleTourSteps({
      householdRole: undefined,
      userRole: undefined,
    });
    expect(steps.map((s) => s.id)).toEqual(BASE_STEP_IDS);
  });

  it("filters by topic and role combined", () => {
    const memberHousehold = getVisibleTourSteps(
      { householdRole: "Member", userRole: "User" },
      "household"
    );
    expect(memberHousehold.map((s) => s.id)).toEqual(["households"]);

    const ownerHousehold = getVisibleTourSteps(
      { householdRole: "Owner", userRole: "User" },
      "household"
    );
    expect(ownerHousehold.map((s) => s.id)).toEqual([
      "households",
      "manage-household",
      "owner",
    ]);
  });
});

describe("getVisibleTourTopics", () => {
  it("hides the admin topic for non-admins", () => {
    const topics = getVisibleTourTopics({
      householdRole: "Member",
      userRole: "User",
    });
    expect(topics.map((t) => t.id)).toEqual([
      "home",
      "lists",
      "recipes",
      "food-plan",
      "bills",
      "household",
    ]);
  });

  it("shows every topic to an Owner with global Admin role", () => {
    const topics = getVisibleTourTopics({
      householdRole: "Owner",
      userRole: "Admin",
    });
    expect(topics.map((t) => t.id)).toEqual(TOUR_TOPICS.map((t) => t.id));
  });

  it("maps every step to a defined topic", () => {
    const topicIds = new Set(TOUR_TOPICS.map((t) => t.id));
    for (const step of TOUR_STEPS) {
      expect(topicIds.has(step.topicId)).toBe(true);
    }
  });
});

describe("tour seen flag", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("is unseen by default", () => {
    expect(hasSeenTour()).toBe(false);
  });

  it("is seen after marking", () => {
    markTourSeen();
    expect(hasSeenTour()).toBe(true);
    expect(localStorage.getItem(TOUR_SEEN_KEY)).toBe(TOUR_VERSION);
  });

  it("is unseen when a stale version was stored", () => {
    localStorage.setItem(TOUR_SEEN_KEY, "0");
    expect(hasSeenTour()).toBe(false);
  });
});
