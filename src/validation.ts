export interface ReservationInput {
  eventId: string;
  customerName: string;
  email: string;
  quantity: number;
}

export function isReservationInput(
  value: unknown
): value is ReservationInput {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const data = value as Record<string, unknown>;

  if (
    typeof data.eventId !== "string" ||
    data.eventId.trim().length === 0
  ) {
    return false;
  }

  if (
    typeof data.customerName !== "string" ||
    data.customerName.trim().length === 0
  ) {
    return false;
  }

  if (
    typeof data.email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
  ) {
    return false;
  }

  if (
    typeof data.quantity !== "number" ||
    !Number.isInteger(data.quantity) ||
    data.quantity < 1 ||
    data.quantity > 10
  ) {
    return false;
  }

  return true;
}
