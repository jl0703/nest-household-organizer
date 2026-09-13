import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HouseholdLoading from "./loading";

describe("HouseholdLoading", () => {
  it("announces that household data is loading", () => {
    render(<HouseholdLoading />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading household/i);
  });
});
