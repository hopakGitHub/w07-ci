const deploymentUrl =
  process.env.DEPLOYMENT_URL ||
  process.env.PRODUCTION_URL;

if (!deploymentUrl) {
  throw new Error("Production URL is missing.");
}

const baseUrl = new URL(deploymentUrl);

if (baseUrl.protocol !== "https:") {
  throw new Error("Production URL must use HTTPS.");
}

async function verifyDeployment() {
  // Test 1: Worker health
  const healthResponse = await fetch(
    new URL("/health", baseUrl)
  );

  if (healthResponse.status !== 200) {
    throw new Error("Health check failed.");
  }

  const health = await healthResponse.json();

  if (health.status !== "ok") {
    throw new Error("Unexpected health status.");
  }

  console.log("PASS: Worker health");

  // Test 2: Worker + D1 + KV integration
  const eventsResponse = await fetch(
    new URL("/events", baseUrl)
  );

  if (eventsResponse.status !== 200) {
    throw new Error("Events API failed.");
  }

  const data = await eventsResponse.json();

  if (!Array.isArray(data.events)) {
    throw new Error("Events array is missing.");
  }

  const event = data.events.find(
    (item) => item.id === "evt-seoul-001"
  );

  if (!event) {
    throw new Error("Seeded event not found.");
  }

  if (typeof event.available_tickets !== "number") {
    throw new Error("Ticket inventory is invalid.");
  }

  console.log("PASS: D1 event query");

  if (
    typeof data.notice !== "string" ||
    data.notice.length === 0
  ) {
    throw new Error("KV system notice is missing.");
  }

  console.log("PASS: KV system notice");
}

// Retry briefly for deployment propagation.
let verified = false;

for (let attempt = 1; attempt <= 12; attempt++) {
  try {
    await verifyDeployment();
    verified = true;
    break;
  } catch (error) {
    console.error(
      `Attempt ${attempt}: ${error.message}`
    );

    if (attempt < 12) {
      await new Promise((resolve) =>
        setTimeout(resolve, 5000)
      );
    }
  }
}

if (!verified) {
  console.error("FAIL: Production smoke test");
  process.exit(1);
}

console.log("PASS: Production deployment verified");
