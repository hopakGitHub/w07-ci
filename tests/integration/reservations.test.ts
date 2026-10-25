import { env, exports } from "cloudflare:workers";
import { applyD1Migrations } from "cloudflare:test";

import {
  beforeAll,
  beforeEach,
  describe,
  it,
  expect
} from "vitest";

const BASE_URL = "https://example.com";

// Apply database migrations once for this test file.
beforeAll(async () => {
  await applyD1Migrations(
    env.DB,
    env.TEST_MIGRATIONS
  );
});

// Reset and prepare test data before each test.
beforeEach(async () => {
  await env.DB.exec(`
    DELETE FROM reservations;
    DELETE FROM events;
  `);

  await env.DB.prepare(
    `INSERT INTO events
     (id, title, total_tickets, available_tickets)
     VALUES (?, ?, ?, ?)`
  )
    .bind(
      "evt-seoul-001",
      "Seoul Concert",
      5,
      5
    )
    .run();

  await env.META.put(
    "system:notice",
    "Welcome to Global Ticket Reservation"
  );
});

describe("Global Event Ticket Reservation API", () => {

  it("GET /events returns D1 and KV data", async () => {
    const response = await exports.default.fetch(
      `${BASE_URL}/events`
    );

    expect(response.status).toBe(200);

    const data = await response.json<{
      events: Array<{
        id: string;
        available_tickets: number;
      }>;
      notice: string | null;
    }>();

    expect(data.events).toHaveLength(1);
    expect(data.events[0].id).toBe("evt-seoul-001");
    expect(data.events[0].available_tickets).toBe(5);
    expect(data.notice).toBe(
      "Welcome to Global Ticket Reservation"
    );
  });

  it("POST /reservations creates a reservation", async () => {
    const response = await exports.default.fetch(
      `${BASE_URL}/reservations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          eventId: "evt-seoul-001",
          customerName: "Alice Kim",
          email: "alice@example.com",
          quantity: 2
        })
      }
    );

    expect(response.status).toBe(201);

    const data = await response.json<{
      reservationId: string;
      status: string;
    }>();

    expect(data.status).toBe("CONFIRMED");

    const event = await env.DB.prepare(
      `SELECT available_tickets
       FROM events
       WHERE id = ?`
    )
      .bind("evt-seoul-001")
      .first<{ available_tickets: number }>();

    expect(event?.available_tickets).toBe(3);

    const getResponse = await exports.default.fetch(
      `${BASE_URL}/reservations/${data.reservationId}`
    );

    expect(getResponse.status).toBe(200);
  });

  it("rejects invalid reservation quantity", async () => {
    const response = await exports.default.fetch(
      `${BASE_URL}/reservations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          eventId: "evt-seoul-001",
          customerName: "Alice Kim",
          email: "alice@example.com",
          quantity: -5
        })
      }
    );

    expect(response.status).toBe(400);
  });

  it("rejects insufficient ticket inventory", async () => {
    const response = await exports.default.fetch(
      `${BASE_URL}/reservations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          eventId: "evt-seoul-001",
          customerName: "Alice Kim",
          email: "alice@example.com",
          quantity: 6
        })
      }
    );

    expect(response.status).toBe(409);

    const event = await env.DB.prepare(
      `SELECT available_tickets
       FROM events
       WHERE id = ?`
    )
      .bind("evt-seoul-001")
      .first<{ available_tickets: number }>();

    expect(event?.available_tickets).toBe(5);
  });

  it("DELETE restores available tickets", async () => {
    const createResponse = await exports.default.fetch(
      `${BASE_URL}/reservations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          eventId: "evt-seoul-001",
          customerName: "Alice Kim",
          email: "alice@example.com",
          quantity: 2
        })
      }
    );

    expect(createResponse.status).toBe(201);

    const created = await createResponse.json<{
      reservationId: string;
    }>();

    const deleteResponse = await exports.default.fetch(
      `${BASE_URL}/reservations/${created.reservationId}`,
      {
        method: "DELETE"
      }
    );

    expect(deleteResponse.status).toBe(200);

    const event = await env.DB.prepare(
      `SELECT available_tickets
       FROM events
       WHERE id = ?`
    )
      .bind("evt-seoul-001")
      .first<{ available_tickets: number }>();

    expect(event?.available_tickets).toBe(5);
  });

});
