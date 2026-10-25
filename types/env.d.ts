interface Env {
  DB: D1Database;
  META: KVNamespace;
}

type WorkerEnv = Env;

declare namespace Cloudflare {
  interface Env extends WorkerEnv {
    TEST_MIGRATIONS: Parameters<
      typeof import("cloudflare:test").applyD1Migrations
    >[1];
  }

  interface GlobalProps {
    mainModule: typeof import("../src/index");
  }
}
