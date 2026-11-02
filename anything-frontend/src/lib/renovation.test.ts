import type {
  RenovationMaterialResponse,
  RenovationProjectResponse,
  RenovationRoomTemplateResponse,
} from "@/lib/api-client/models/index";
import {
  estimateTemplateRoom,
  formatKr,
  formatQty,
  groupToBuy,
  indexMaterialsByName,
  lineEstimate,
  measureRoom,
  requiredQuantity,
  round2,
  splitByEstimateShare,
  RENOVATION_BASES,
  RENOVATION_GROUPS,
} from "@/lib/renovation";

const KITCHEN_DIMS = { length: 4.2, width: 3.0, height: 2.5, doors: 1, windows: 1 };

const KITCHEN_TEMPLATE: RenovationRoomTemplateResponse = {
  isBuiltIn: true,
  isCustomised: false,
  label: "Kitchen",
  roomType: "Kitchen",
  length: 4.2,
  width: 3.0,
  height: 2.5,
  doors: 1,
  windows: 1,
  lines: [
    { key: "floor", label: "Floor", group: "Surfaces", materialName: "Oak laminate", category: "Floor", basis: "Floor", unit: "m²", defaultPrice: 289, wastePercent: 10, enabledByDefault: true },
    { key: "underlay", label: "Underlay", group: "Surfaces", materialName: "Underlay", category: "Floor", basis: "Floor", unit: "m²", defaultPrice: 39, wastePercent: 5, enabledByDefault: true },
    { key: "walls", label: "Walls", group: "Surfaces", materialName: "Wall paint", category: "Walls", basis: "Wall", unit: "m²", defaultPrice: 48, wastePercent: 0, enabledByDefault: true },
    { key: "ceiling", label: "Ceiling", group: "Surfaces", materialName: "Ceiling paint", category: "Ceiling", basis: "Ceiling", unit: "m²", defaultPrice: 35, wastePercent: 0, enabledByDefault: true },
    { key: "skirting", label: "Skirting", group: "Surfaces", materialName: "Skirting board", category: "Trim", basis: "Perimeter", unit: "m", defaultPrice: 59, wastePercent: 10, enabledByDefault: true },
    { key: "cabinets", label: "Cabinets", group: "Fixtures", materialName: "Kitchen cabinets", category: "Fixtures", basis: "Fixed", unit: "set", defaultPrice: 42000, wastePercent: 0, fixedQuantity: 1, enabledByDefault: true },
    { key: "countertop", label: "Countertop", group: "Fixtures", materialName: "Countertop", category: "Fixtures", basis: "Fixed", unit: "m", defaultPrice: 1950, wastePercent: 0, fixedQuantity: 3.6, enabledByDefault: true },
    { key: "backsplash", label: "Backsplash", group: "Fixtures", materialName: "Backsplash tile", category: "Fixtures", basis: "Fixed", unit: "m", defaultPrice: 420, wastePercent: 0, fixedQuantity: 3, enabledByDefault: true },
    { key: "appliances", label: "Appliances", group: "Fixtures", materialName: "Appliance package", category: "Fixtures", basis: "Fixed", unit: "set", defaultPrice: 24000, wastePercent: 0, fixedQuantity: 1, enabledByDefault: true },
    { key: "electrician", label: "Electrician", group: "Labour", materialName: "Electrician", category: "Labour", basis: "Fixed", unit: "job", defaultPrice: 12000, wastePercent: 0, fixedQuantity: 1, enabledByDefault: true },
    { key: "plumber", label: "Plumber", group: "Labour", materialName: "Plumber", category: "Labour", basis: "Fixed", unit: "job", defaultPrice: 8500, wastePercent: 0, fixedQuantity: 1, enabledByDefault: true },
  ],
};

const ALL_KEYS = (KITCHEN_TEMPLATE.lines ?? []).map((line) => line.key ?? "");

describe("round2", () => {
  it("rounds half away from zero", () => {
    expect(round2(0.125)).toBe(0.13);
    expect(round2(-0.125)).toBe(-0.13);
    expect(round2(2.675)).toBe(2.68);
  });

  it("is not thrown off by binary representation error", () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });

  it("does not produce negative zero", () => {
    expect(Object.is(round2(-0.001), 0)).toBe(true);
  });
});

describe("measureRoom", () => {
  it("measures the kitchen with one door and one window", () => {
    expect(measureRoom(4.2, 3.0, 2.5, 1, 1)).toEqual({
      floorArea: 12.6,
      wallArea: 32.61,
      perimeter: 13.5,
    });
  });

  it("clamps wall and perimeter at zero for openings larger than the room", () => {
    expect(measureRoom(1, 1, 1, 5, 5)).toEqual({ floorArea: 1, wallArea: 0, perimeter: 0 });
  });
});

describe("requiredQuantity", () => {
  const kitchen = measureRoom(4.2, 3.0, 2.5, 1, 1);

  it("applies waste to the basis quantity", () => {
    expect(requiredQuantity("Floor", null, 10, kitchen, 1)).toBe(13.86);
  });

  it("adds floor and wall for FloorAndWall", () => {
    expect(requiredQuantity("FloorAndWall", null, 0, kitchen, 1)).toBe(45.21);
  });

  it("counts doors for the Doors basis", () => {
    expect(requiredQuantity("Doors", null, 0, kitchen, 2)).toBe(2);
  });

  it("uses the fixed quantity for Fixed, defaulting to zero", () => {
    expect(requiredQuantity("Fixed", 3.6, 0, kitchen, 1)).toBe(3.6);
    expect(requiredQuantity("Fixed", null, 0, kitchen, 1)).toBe(0);
  });

  it("prices unknown bases as Fixed, like the server", () => {
    expect(requiredQuantity("Mystery", 2, 0, kitchen, 1)).toBe(2);
  });
});

describe("lineEstimate", () => {
  it("rounds quantity times unit price to whole øre", () => {
    expect(lineEstimate(13.23, 39)).toBe(515.97);
  });
});

describe("RENOVATION constants", () => {
  it("lists the bases and group order", () => {
    expect(RENOVATION_BASES).toEqual(["Floor", "Ceiling", "Wall", "Perimeter", "FloorAndWall", "Doors", "Fixed"]);
    expect(RENOVATION_GROUPS).toEqual(["Surfaces", "Fixtures", "Labour"]);
  });
});

describe("estimateTemplateRoom", () => {
  it("totals the kitchen template at its defaults", () => {
    const result = estimateTemplateRoom(KITCHEN_TEMPLATE, KITCHEN_DIMS, ALL_KEYS);

    expect(result.measurements).toEqual({ floorArea: 12.6, wallArea: 32.61, perimeter: 13.5 });
    expect(result.total).toBe(102183.94);
    expect(result.lines).toHaveLength(11);
  });

  it("prices each line from the template defaults and resolves quantity from its basis", () => {
    const result = estimateTemplateRoom(KITCHEN_TEMPLATE, KITCHEN_DIMS, ALL_KEYS);
    const floor = result.lines.find((line) => line.key === "floor");

    expect(floor).toEqual({
      key: "floor",
      label: "Floor",
      group: "Surfaces",
      description: "Oak laminate",
      quantity: 13.86,
      unit: "m²",
      unitPrice: 289,
      estimate: 4005.54,
    });
  });

  it("only prices the selected keys", () => {
    const result = estimateTemplateRoom(KITCHEN_TEMPLATE, KITCHEN_DIMS, ["cabinets", "plumber"]);

    expect(result.lines.map((line) => line.key)).toEqual(["cabinets", "plumber"]);
    expect(result.total).toBe(50500);
  });

  it("uses the household material's price, unit and waste when one matches by name", () => {
    const materials: RenovationMaterialResponse[] = [
      { id: 1, name: "Oak Laminate", unit: "m²", defaultPrice: 300, wastePercent: 0 },
    ];
    const result = estimateTemplateRoom(
      KITCHEN_TEMPLATE,
      KITCHEN_DIMS,
      ["floor"],
      indexMaterialsByName(materials),
    );

    expect(result.lines[0]).toMatchObject({
      quantity: 12.6,
      unitPrice: 300,
      estimate: 3780,
      description: "Oak Laminate",
    });
    expect(result.total).toBe(3780);
  });
});

describe("estimateTemplateRoom pricing source", () => {
  const materials = indexMaterialsByName([
    { id: 1, name: "Oak Laminate", unit: "m²", defaultPrice: 300, wastePercent: 0 },
  ] as RenovationMaterialResponse[]);

  it.each([
    ["a customised built-in", { isBuiltIn: true, isCustomised: true }],
    ["a household-defined type", { isBuiltIn: false, isCustomised: false }],
  ])("keeps the template's own line prices for %s, like the server", (_name, flags) => {
    const customised = { ...KITCHEN_TEMPLATE, ...flags };
    const own = estimateTemplateRoom(customised, KITCHEN_DIMS, ["floor"], materials);
    const builtIn = estimateTemplateRoom(KITCHEN_TEMPLATE, KITCHEN_DIMS, ["floor"], materials);

    expect(own.lines[0].unitPrice).not.toBe(300);
    expect(builtIn.lines[0].unitPrice).toBe(300);
  });
});

describe("splitByEstimateShare", () => {
  it("sums exactly to the total", () => {
    const shares = splitByEstimateShare(8420, [3662, 1526, 669, 2200]);

    expect(shares).toHaveLength(4);
    expect(round2(shares.reduce((acc, share) => acc + share, 0))).toBe(8420);
  });

  it("splits evenly when every weight is zero", () => {
    expect(splitByEstimateShare(100, [0, 0, 0])).toEqual([33.33, 33.33, 33.34]);
  });

  it("returns an empty array for no weights", () => {
    expect(splitByEstimateShare(100, [])).toEqual([]);
  });
});

describe("groupToBuy", () => {
  const project = {
    rooms: [
      {
        id: 10,
        name: "Kitchen",
        lines: [
          { id: 100, roomId: 10, label: "Floor", materialId: 7, description: "Oak laminate", unit: "m²", unitPrice: 289, remainingQuantity: 13.86, group: "Surfaces" },
          { id: 101, roomId: 10, label: "Plumber", materialId: 9, description: "Plumber", unit: "job", unitPrice: 8500, remainingQuantity: 0, group: "Labour" },
        ],
      },
      {
        id: 11,
        name: "Hall",
        lines: [
          { id: 200, roomId: 11, label: "Floor", materialId: 7, description: "Oak laminate", unit: "m²", unitPrice: 289, remainingQuantity: 4, group: "Surfaces" },
          { id: 201, roomId: 11, label: "Electrician", materialId: 8, description: "Electrician", unit: "job", unitPrice: 12000, remainingQuantity: 1, group: "Labour" },
        ],
      },
    ],
  } as unknown as RenovationProjectResponse;

  it("merges the same material across rooms and skips fully bought lines", () => {
    const { materials } = groupToBuy(project);

    expect(materials).toHaveLength(1);
    expect(materials[0]).toMatchObject({
      key: "material:7",
      description: "Oak laminate",
      unit: "m²",
      materialId: 7,
      totalQuantity: 17.86,
      totalEstimate: 5161.54,
    });
    expect(materials[0].lines.map((line) => line.roomName)).toEqual(["Kitchen", "Hall"]);
    expect(materials[0].lines[0]).toEqual({
      lineId: 100,
      roomId: 10,
      roomName: "Kitchen",
      label: "Floor",
      remainingQuantity: 13.86,
      unitPrice: 289,
      remainingEstimate: 4005.54,
    });
  });

  it("puts Labour lines in services", () => {
    const { services } = groupToBuy(project);

    expect(services).toHaveLength(1);
    expect(services[0]).toMatchObject({ key: "material:8", totalQuantity: 1, totalEstimate: 12000 });
  });

  it("keys free-text lines without a material by description", () => {
    const freeText = {
      rooms: [{ id: 1, name: "Bath", lines: [{ id: 5, roomId: 1, label: "Grout", description: "Grout", unit: "kg", unitPrice: 50, remainingQuantity: 2, group: "Surfaces" }] }],
    } as unknown as RenovationProjectResponse;

    expect(groupToBuy(freeText).materials[0]).toMatchObject({ key: "description:Grout", materialId: null, totalEstimate: 100 });
  });
});

describe("formatKr", () => {
  // Intl's da-DK output puts a no-break space before "kr." — spelled out here so the test pins it.
  it("formats whole kroner in the bills' da-DK style", () => {
    expect(formatKr(102183.94)).toBe(`102.184\u00a0kr.`);
    expect(formatKr(0)).toBe(`0\u00a0kr.`);
  });
});

describe("formatQty", () => {
  it("uses one decimal for m² and m", () => {
    expect(formatQty(13.86, "m²")).toBe("13,9 m²");
    expect(formatQty(14.85, "m")).toBe("14,9 m");
    expect(formatQty(1234.5, "m²")).toBe("1.234,5 m²");
  });

  it("uses whole numbers for other units", () => {
    expect(formatQty(3.4, "set")).toBe("3 set");
    expect(formatQty(2, "job")).toBe("2 job");
  });

  it("omits the unit when there is none", () => {
    expect(formatQty(4.2, null)).toBe("4");
  });
});
