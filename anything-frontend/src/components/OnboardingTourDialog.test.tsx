import { useState } from "react";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import { OnboardingTourDialog, type TourView } from "./OnboardingTourDialog";
import {
  getVisibleTourSteps,
  getVisibleTourTopics,
  type TourVisibilityContext,
} from "@/lib/tourSteps";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
  usePathname: () => "/",
}));

const memberCtx: TourVisibilityContext = {
  householdRole: "Member",
  userRole: "User",
};
const ownerCtx: TourVisibilityContext = {
  householdRole: "Owner",
  userRole: "User",
};

const steps = getVisibleTourSteps(memberCtx);
const topics = getVisibleTourTopics(memberCtx);

function renderDialog({
  ctx = memberCtx,
  initialView = "steps" as TourView,
  onOpenChange = jest.fn(),
} = {}) {
  return renderWithClient(
    <OnboardingTourDialog
      open
      onOpenChange={onOpenChange}
      steps={getVisibleTourSteps(ctx)}
      topics={getVisibleTourTopics(ctx)}
      initialView={initialView}
    />
  );
}

describe("OnboardingTourDialog steps view (auto-open full tour)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows the first step with Back disabled and one dot per step", () => {
    renderDialog();

    expect(screen.getByText("Welcome to Anything")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    expect(
      screen.getAllByRole("button", { name: /go to step \d+/i })
    ).toHaveLength(steps.length);
  });

  it("navigates forward with Next and back with Back", () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Lists")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Welcome to Anything")).toBeInTheDocument();
  });

  it("shows Done on the last step and closes the full tour when clicked", () => {
    const onOpenChange = jest.fn();
    renderDialog({ onOpenChange });

    fireEvent.click(
      screen.getByRole("button", { name: `Go to step ${steps.length}` })
    );
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes when Skip is clicked", () => {
    const onOpenChange = jest.fn();
    renderDialog({ onOpenChange });

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("navigates to the step route and closes on Take me there", () => {
    const onOpenChange = jest.fn();
    renderDialog({ onOpenChange });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: /take me there/i }));

    expect(mockPush).toHaveBeenCalledWith("/lists");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("jumps directly to a step via its dot", () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Go to step 3" }));
    expect(screen.getByText("Recipes")).toBeInTheDocument();
  });

  it("does not offer a Topics button in the auto-open full tour", () => {
    renderDialog();
    expect(
      screen.queryByRole("button", { name: "Topics" })
    ).not.toBeInTheDocument();
  });

  it("renders nothing when there are no steps", () => {
    renderWithClient(
      <OnboardingTourDialog
        open
        onOpenChange={jest.fn()}
        steps={[]}
        topics={[]}
        initialView="steps"
      />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("OnboardingTourDialog topic menu", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists the full tour and one entry per visible topic", () => {
    renderDialog({ initialView: "menu" });

    expect(screen.getByText("Take a tour")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: new RegExp(`Full tour \\(${steps.length} steps\\)`) })
    ).toBeInTheDocument();
    for (const topic of topics) {
      expect(
        screen.getByRole("button", { name: new RegExp(topic.label) })
      ).toBeInTheDocument();
    }
    expect(screen.queryByText("Administration")).not.toBeInTheDocument();
  });

  it("starts the full tour from the menu with a Topics button back", () => {
    renderDialog({ initialView: "menu" });

    fireEvent.click(screen.getByRole("button", { name: /full tour/i }));
    expect(screen.getByText("Welcome to Anything")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /go to step \d+/i })
    ).toHaveLength(steps.length);

    fireEvent.click(screen.getByRole("button", { name: "Topics" }));
    expect(screen.getByText("Take a tour")).toBeInTheDocument();
  });

  it("shows only the topic's steps when a topic is chosen", () => {
    renderDialog({ ctx: ownerCtx, initialView: "menu" });

    fireEvent.click(screen.getByRole("button", { name: /household/i }));
    expect(screen.getByText("Households")).toBeInTheDocument();
    // Owner sees households + manage-household + owner in this topic.
    expect(
      screen.getAllByRole("button", { name: /go to step \d+/i })
    ).toHaveLength(3);
  });

  it("returns to the menu when a topic guide is finished", () => {
    renderDialog({ initialView: "menu" });

    // Member's household topic has a single step, so Done shows immediately.
    fireEvent.click(screen.getByRole("button", { name: /household/i }));
    expect(screen.getByText("Households")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByText("Take a tour")).toBeInTheDocument();
  });

  it("closes from the menu Close tour button", () => {
    const onOpenChange = jest.fn();
    renderDialog({ initialView: "menu", onOpenChange });

    fireEvent.click(screen.getByRole("button", { name: "Close tour" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("OnboardingTourDialog reopen behavior", () => {
  it("resets to the initial view and first step when reopened", () => {
    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button onClick={() => setOpen(true)}>Reopen tour</button>
          <OnboardingTourDialog
            open={open}
            onOpenChange={setOpen}
            steps={steps}
            topics={topics}
            initialView="menu"
          />
        </>
      );
    }

    renderWithClient(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: /full tour/i }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Lists")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Topics" }));
    fireEvent.click(screen.getByRole("button", { name: "Close tour" }));
    fireEvent.click(screen.getByRole("button", { name: "Reopen tour" }));

    expect(screen.getByText("Take a tour")).toBeInTheDocument();
  });
});
