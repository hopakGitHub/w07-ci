import { describe, it, expect } from "vitest";
import { isReservationInput } from "../../src/validation";

describe("Reservation Input Validation", () => {

  it("accepts a valid reservation", () => {
    const input = {
      eventId: "evt-seoul-001",
      customerName: "Alice Kim",
      email: "alice@example.com",
      quantity: 2
    };

    expect(isReservationInput(input)).toBe(true);
  });

  it("rejects a negative quantity", () => {
    const input = {
      eventId: "evt-seoul-001",
      customerName: "Alice Kim",
      email: "alice@example.com",
      quantity: -5
    };

    expect(isReservationInput(input)).toBe(false);
  });

  it("rejects zero quantity", () => {
    const input = {
      eventId: "evt-seoul-001",
      customerName: "Alice Kim",
      email: "alice@example.com",
      quantity: 0
    };

    expect(isReservationInput(input)).toBe(false);
  });

  it("rejects an invalid email", () => {
    const input = {
      eventId: "evt-seoul-001",
      customerName: "Alice Kim",
      email: "invalid-email",
      quantity: 2
    };

    expect(isReservationInput(input)).toBe(false);
  });

  it("rejects an empty customer name", () => {
    const input = {
      eventId: "evt-seoul-001",
      customerName: "",
      email: "alice@example.com",
      quantity: 2
    };

    expect(isReservationInput(input)).toBe(false);
  });

  it("rejects quantity greater than 10", () => {
    const input = {
      eventId: "evt-seoul-001",
      customerName: "Alice Kim",
      email: "alice@example.com",
      quantity: 11
    };

    expect(isReservationInput(input)).toBe(false);
  });

});
