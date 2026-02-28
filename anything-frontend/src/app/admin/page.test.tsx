// The admin page is a server component that redirects to /admin/invite.
// next/navigation's redirect() throws a special NEXT_REDIRECT error in the test environment.
// We verify the page attempts to redirect correctly.

jest.mock("next/navigation", () => ({
  redirect: jest.fn().mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

import { redirect } from "next/navigation";
import AdminPage from "./page";

describe("AdminPage (server redirect)", () => {
  it("should redirect to /admin/invite", () => {
    expect(() => AdminPage()).toThrow("NEXT_REDIRECT:/admin/invite");
    expect(redirect).toHaveBeenCalledWith("/admin/invite");
  });
});

