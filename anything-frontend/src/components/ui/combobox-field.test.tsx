import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ComboboxField } from "./combobox-field";

const items = [
  { id: 1, name: "Oat milk" },
  { id: 2, name: "Milk" },
  { id: 3, name: "Milkshake" },
  { id: 4, name: "Butter" },
];

function renderCombobox(overrides: Partial<React.ComponentProps<typeof ComboboxField>> = {}) {
  const onChange = jest.fn();
  const onCreateNew = jest.fn();
  render(
    <ComboboxField
      items={items}
      value={undefined}
      onChange={onChange}
      onCreateNew={onCreateNew}
      {...overrides}
    />
  );
  return { onChange, onCreateNew };
}

function optionNames(): string[] {
  return screen
    .getAllByRole("button")
    .map((b) => b.textContent?.trim() ?? "")
    .filter((t) => items.some((i) => t.includes(i.name)));
}

describe("ComboboxField fuzzy matching", () => {
  it("orders the most relevant match first", async () => {
    const user = userEvent.setup();
    renderCombobox();

    const input = screen.getByPlaceholderText("Search or create...");
    await user.click(input);
    await user.type(input, "milk");

    const names = optionNames();
    expect(names[0]).toContain("Milk");
    expect(names[1]).toContain("Milkshake");
    expect(names[2]).toContain("Oat milk");
    expect(names.some((n) => n.includes("Butter"))).toBe(false);
  });

  it("still surfaces a match despite a typo", async () => {
    const user = userEvent.setup();
    renderCombobox();

    const input = screen.getByPlaceholderText("Search or create...");
    await user.click(input);
    await user.type(input, "mlik");

    expect(optionNames().some((n) => n.includes("Milk"))).toBe(true);
  });

  it("offers to create when there is no exact match", async () => {
    const user = userEvent.setup();
    renderCombobox();

    const input = screen.getByPlaceholderText("Search or create...");
    await user.click(input);
    await user.type(input, "Yoghurt");

    expect(screen.getByRole("button", { name: /Create.*Yoghurt/ })).toBeInTheDocument();
  });
});
