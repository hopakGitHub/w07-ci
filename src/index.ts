import { isReservationInput } from "./validation";

interface EventRow {
  id: string;
  title: string;
  total_tickets: number;
  available_tickets: number;
}

interface ReservationRow {
  id: string;
  event_id: string;
  customer_name: string;
  email: string;
  quantity: number;
  status: string;
}

export default {
  async fetch(
    request: Request,
    env: Env
  ): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // GET /events
    if (request.method === "GET" && path === "/events") {
      const result = await env.DB.prepare(
        `SELECT *
         FROM events
         ORDER BY id`
      ).all<EventRow>();

      const notice = await env.META.get("system:notice");

      return Response.json({
        events: result.results,
        notice
      });
    }

    // POST /reservations
    if (
      request.method === "POST" &&
      path === "/reservations"
    ) {
      let body: unknown;

      try {
        body = await request.json();
      } catch {
        return Response.json(
          { error: "Invalid JSON" },
          { status: 400 }
        );
      }

      if (!isReservationInput(body)) {
        return Response.json(
          { error: "Invalid reservation input" },
          { status: 400 }
        );
      }

      const event = await env.DB.prepare(
        "SELECT id FROM events WHERE id = ?"
      )
        .bind(body.eventId)
        .first<{ id: string }>();

      if (!event) {
        return Response.json(
          { error: "Event not found" },
          { status: 404 }
        );
      }

      const reservationId = crypto.randomUUID();

      try {
        await env.DB.prepare(
          `INSERT INTO reservations
           (id, event_id, customer_name, email, quantity)
           VALUES (?, ?, ?, ?, ?)`
        )
          .bind(
            reservationId,
            body.eventId,
            body.customerName,
            body.email,
            body.quantity
          )
          .run();

        return Response.json(
          {
            reservationId,
            eventId: body.eventId,
            quantity: body.quantity,
            status: "CONFIRMED"
          },
          { status: 201 }
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("not enough tickets")
        ) {
          return Response.json(
            { error: "Not enough tickets" },
            { status: 409 }
          );
        }

        return Response.json(
          { error: "Reservation failed" },
          { status: 500 }
        );
      }
    }

    const match = path.match(/^\/reservations\/([^/]+)$/);

    if (match) {
      const reservationId = match[1];

      // GET /reservations/:id
      if (request.method === "GET") {
        const reservation = await env.DB.prepare(
          `SELECT *
           FROM reservations
           WHERE id = ?`
        )
          .bind(reservationId)
          .first<ReservationRow>();

        if (!reservation) {
          return Response.json(
            { error: "Reservation not found" },
            { status: 404 }
          );
        }

        return Response.json(reservation);
      }

      // DELETE /reservations/:id
      if (request.method === "DELETE") {
        const result = await env.DB.prepare(
          `UPDATE reservations
           SET status = 'CANCELLED'
           WHERE id = ?
             AND status = 'CONFIRMED'`
        )
          .bind(reservationId)
          .run();

        if (result.meta.changes === 0) {
          return Response.json(
            { error: "Active reservation not found" },
            { status: 404 }
          );
        }

        return Response.json({
          reservationId,
          status: "CANCELLED"
        });
      }
    }

    return Response.json(
      { error: "Not found" },
      { status: 404 }
    );
  }
} satisfies ExportedHandler<Env>;
