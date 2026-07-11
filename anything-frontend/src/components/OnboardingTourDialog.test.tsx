import { useState } from "react";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithClient } from "@/__tests__/utils/test-utils";
import { OnboardingTourDialog } from "./OnboardingTourDialog";
import { getVisibleTourSteps, type TourStep } from "@/lib/tourSteps";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
  usePathname: () => "/",
}));

const steps = getVisibleTourSteps({
  householdRole: "Member",
  userRole: "User",
});

describe("OnboardingTourDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows the first step with Back disabled and one dot per step", () => {
    renderWithClient(
      <OnboardingTourDialog open onOpenChange={jest.fn()} steps={steps} />
    );

    expect(screen.getByText("Welcome to Anything")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    expect(
      screen.getAllByRole("button", { name: /go to step \d+/i })
    ).toHaveLength(steps.length);
  });

  it("navigates forward with Next and back with Back", () => {
    renderWithClient(
      <OnboardingTourDialog open onOpenChange={jest.fn()} steps={steps} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Lists")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Welcome to Anything")).toBeInTheDocument();
  });

  it("shows Done on the last step and closes when clicked", () => {
    const onOpenChange = jest.fn();
    renderWithClient(
      <OnboardingTourDialog open onOpenChange={onOpenChange} steps={steps} />
    );

    fireEvent.click(
      screen.getByRole("button", { name: `Go to step ${steps.length}` })
    );
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes when Skip is clicked", () => {
    const onOpenChange = jest.fn();
    renderWithClient(
      <OnboardingTourDialog open onOpenChange={onOpenChange} steps={steps} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("navigates to the step route and closes on Take me there", () => {
    const onOpenChange = jest.fn();
    renderWithClient(
      <OnboardingTourDialog open onOpenChange={onOpenChange} steps={steps} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: /take me there/i }));

    expect(mockPush).toHaveBeenCalledWith("/lists");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("jumps directly to a step via its dot", () => {
    renderWithClient(
      <OnboardingTourDialog open onOpenChange={jest.fn()} steps={steps} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Go to step 3" }));
    expect(screen.getByText("Recipes")).toBeInTheDocument();
  });

  it("resets to the first step when reopened", () => {
    function Harness({ harnessSteps }: { harnessSteps: TourStep[] }) {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button onClick={() => setOpen(true)}>Reopen tour</button>
          <OnboardingTourDialog
            open={open}
            onOpenChange={setOpen}
            steps={harnessSteps}
          />
        </>
      );
    }

    renderWithClient(<Harness harnessSteps={steps} />);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Lists")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    fireEvent.click(screen.getByRole("button", { name: "Reopen tour" }));

    expect(screen.getByText("Welcome to Anything")).toBeInTheDocument();
  });

  it("renders nothing when there are no steps", () => {
    renderWithClient(
      <OnboardingTourDialog open onOpenChange={jest.fn()} steps={[]} />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
