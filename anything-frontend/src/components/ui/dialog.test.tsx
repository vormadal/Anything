import { render, screen } from "@testing-library/react";
import { Dialog, DialogContent, DialogTitle } from "./dialog";

function renderContent(props: { pinned?: boolean; fullScreen?: boolean }) {
  render(
    <Dialog open>
      <DialogContent {...props} aria-describedby={undefined}>
        <DialogTitle>Title</DialogTitle>
      </DialogContent>
    </Dialog>,
  );
  return screen.getByRole("dialog");
}

describe("DialogContent layout", () => {
  it("keeps the default centred card when no layout prop is passed", () => {
    const dialog = renderContent({});

    expect(dialog).toHaveClass("max-w-md", "p-6", "overflow-y-auto");
    expect(dialog).not.toHaveClass("inset-0");
  });

  it("pinned is a full-height sheet on phones that leaves scrolling to the body", () => {
    const dialog = renderContent({ pinned: true });

    // The panel itself must not scroll or pad: the caller's body scrolls between a
    // pinned header and footer, which only works inside a flex column.
    expect(dialog).toHaveClass("inset-0", "flex", "flex-col", "overflow-hidden", "sm:max-w-md");
    expect(dialog).not.toHaveClass("p-6");
    expect(dialog).not.toHaveClass("overflow-y-auto");
  });

  it("fullScreen wins over pinned", () => {
    const dialog = renderContent({ pinned: true, fullScreen: true });

    expect(dialog).toHaveClass("bg-black");
    expect(dialog).not.toHaveClass("sm:max-w-md");
  });
});
