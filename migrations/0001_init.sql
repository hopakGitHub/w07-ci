CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    total_tickets INTEGER NOT NULL
        CHECK (total_tickets >= 0),
    available_tickets INTEGER NOT NULL
        CHECK (available_tickets >= 0)
);

CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    email TEXT NOT NULL,
    quantity INTEGER NOT NULL
        CHECK (quantity > 0),
    status TEXT NOT NULL DEFAULT 'CONFIRMED'
        CHECK (status IN ('CONFIRMED', 'CANCELLED')),
    FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE INDEX IF NOT EXISTS idx_reservations_event
ON reservations(event_id);

CREATE TRIGGER reserve_tickets
BEFORE INSERT ON reservations
BEGIN
    SELECT CASE
      WHEN (
        SELECT available_tickets
        FROM events
        WHERE id = NEW.event_id
      ) < NEW.quantity
      THEN RAISE(ABORT, 'not enough tickets')
    END;

    UPDATE events
    SET available_tickets =
        available_tickets - NEW.quantity
    WHERE id = NEW.event_id;
END;

CREATE TRIGGER restore_tickets
AFTER UPDATE OF status ON reservations
WHEN OLD.status = 'CONFIRMED'
 AND NEW.status = 'CANCELLED'
BEGIN
    UPDATE events
    SET available_tickets =
        available_tickets + OLD.quantity
    WHERE id = OLD.event_id;
END;
