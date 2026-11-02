import {
  deriveSlug,
  estimateForm,
  formToInput,
  newTemplateLine,
  templateToForm,
  validateNewRoomType,
  validateTemplateForm,
  type TemplateForm,
} from "./templateModel";

const DUPLICATE_LINE = "Another line already has this name";
const TYPE_EXISTS = "A room type with this name already exists";

function baseForm(overrides: Partial<TemplateForm> = {}): TemplateForm {
  return {
    label: "Bathroom",
    length: "2",
    width: "2",
    height: "2.5",
    doors: "1",
    windows: "0",
    lines: [],
    ...overrides,
  };
}

describe("deriveSlug", () => {
  it("lower-cases, joins words with hyphens and drops other characters", () => {
    expect(deriveSlug("Home Gym")).toBe("home-gym");
    expect(deriveSlug("  Bath  Room!! ")).toBe("bath-room");
  });

  it("spells out Danish letters and strips other accents", () => {
    expect(deriveSlug("Bøf-køkken")).toBe("boef-koekken");
    expect(deriveSlug("Ærø Café")).toBe("aeroe-cafe");
    expect(deriveSlug("Gæsteværelse på loftet")).toBe("gaestevaerelse-paa-loftet");
  });

  it("caps the key at 50 characters", () => {
    expect(deriveSlug("a".repeat(80))).toHaveLength(50);
  });
});

describe("validateNewRoomType", () => {
  it("requires a name", () => {
    expect(validateNewRoomType("  ", [])).toBe("Enter a name");
  });

  it("refuses a name that derives no key", () => {
    expect(validateNewRoomType("!!!", [])).toBe("Use letters or numbers in the name");
  });

  it("refuses a key the household already has", () => {
    expect(validateNewRoomType("Bathroom", ["bathroom", "kitchen"])).toBe(TYPE_EXISTS);
  });

  it("accepts a new name", () => {
    expect(validateNewRoomType("Home gym", ["bathroom"])).toBeUndefined();
  });
});

describe("validateTemplateForm", () => {
  it("flags every line that shares a derived key", () => {
    const first = { ...newTemplateLine("a"), label: "Tiles", materialName: "Tile", category: "Tiles", unit: "m²" };
    const second = { ...newTemplateLine("b"), label: "tiles", materialName: "Tile", category: "Tiles", unit: "m²" };
    const errors = validateTemplateForm(baseForm({ lines: [first, second] }));
    expect(errors.lines.a?.key).toBe(DUPLICATE_LINE);
    expect(errors.lines.b?.key).toBe(DUPLICATE_LINE);
  });

  it("rejects sizes outside the range and openings that are not whole numbers", () => {
    const errors = validateTemplateForm(baseForm({ length: "", doors: "1.5", height: "-1" }));
    expect(errors.length).toBe("Enter a number from 0 to 1000");
    expect(errors.doors).toBe("Enter a whole number from 0 to 100");
    expect(errors.height).toBe("Enter a number from 0 to 100");
  });

  it("requires a quantity for a Fixed line and nothing else for a measured one", () => {
    const fixed = { ...newTemplateLine("f"), label: "Toilet", materialName: "WC", category: "Sanitary", unit: "pcs", basis: "Fixed" };
    const floor = { ...newTemplateLine("g"), label: "Floor", materialName: "Tile", category: "Tiles", unit: "m²", basis: "Floor" };
    const errors = validateTemplateForm(baseForm({ lines: [fixed, floor] }));
    expect(errors.lines.f?.fixedQuantity).toBe("Enter a quantity");
    expect(errors.lines.g).toBeUndefined();
  });
});

describe("formToInput", () => {
  it("derives a key for a new line, reads a decimal comma and drops the fixed quantity unless Fixed", () => {
    const form = baseForm({
      length: "2,4",
      lines: [
        {
          ...newTemplateLine("n"),
          label: "Floor tiles",
          materialName: "Tile",
          category: "Tiles",
          unit: "m²",
          defaultPrice: "495",
          wastePercent: "",
          fixedQuantity: "7",
        },
      ],
    });
    const input = formToInput(form);
    expect(input.length).toBe(2.4);
    expect(input.lines[0]).toMatchObject({
      key: "floor-tiles",
      defaultPrice: 495,
      wastePercent: undefined,
      fixedQuantity: undefined,
      enabledByDefault: true,
    });
  });

  it("keeps an existing key when the line is renamed", () => {
    const form = templateToForm({
      roomType: "bathroom",
      label: "Bathroom",
      length: 2,
      width: 2,
      height: 2.5,
      doors: 1,
      windows: 0,
      lines: [{ key: "floor-tiles", label: "Floor tiles", basis: "Floor", unit: "m²", materialName: "Tile", category: "Tiles", group: "Surfaces", enabledByDefault: true }],
    });
    form.lines[0].label = "Tiles";
    expect(formToInput(form).lines[0].key).toBe("floor-tiles");
  });
});

describe("estimateForm", () => {
  it("is unknown until the size is entered", () => {
    expect(estimateForm(baseForm({ length: "" }), [])).toBeNull();
  });

  it("prices only the lines that are on by default, with waste", () => {
    const floor = { ...newTemplateLine("a"), label: "Floor", materialName: "Tile", category: "Tiles", unit: "m²", defaultPrice: "100", wastePercent: "10" };
    const off = { ...newTemplateLine("b"), label: "Extra", materialName: "Extra", category: "Other", unit: "m²", defaultPrice: "999", enabledByDefault: false };
    const estimate = estimateForm(baseForm({ length: "2", width: "2", lines: [floor, off] }), []);
    expect(estimate?.lines).toHaveLength(1);
    expect(estimate?.total).toBe(440);
  });
});
