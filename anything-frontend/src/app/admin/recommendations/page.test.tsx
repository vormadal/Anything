// The recommendations page now redirects to /admin/suggestions.
jest.mock("next/navigation", () => ({
  redirect: jest.fn().mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

import { redirect } from "next/navigation";
import AdminRecommendationsPage from "./page";

describe("AdminRecommendationsPage (redirect)", () => {
  it("should redirect to /admin/suggestions", () => {
    expect(() => AdminRecommendationsPage()).toThrow("NEXT_REDIRECT:/admin/suggestions");
    expect(redirect).toHaveBeenCalledWith("/admin/suggestions");
  });
});
