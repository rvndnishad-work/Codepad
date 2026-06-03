// Install the language packs the app needs onto a Piston server via its REST
// API (POST /api/v2/packages). Piston has no `ppman` CLI in the API image, so
// package management goes through the API. Idempotent: skips already-installed
// packs and installs the highest available version of each language.
//
// Usage (local docker, no auth):
//   node scripts/piston-install-langs.mjs
//
// Usage (remote Fly Piston, through the bearer-gated proxy):
//   PISTON_URL=https://interviewpad-piston.fly.dev \
//   PISTON_AUTH_TOKEN=<token> \
//   node scripts/piston-install-langs.mjs
//
// (On Windows PowerShell set the vars first:
//   $env:PISTON_URL="https://interviewpad-piston.fly.dev"; $env:PISTON_AUTH_TOKEN="<token>"
//   node scripts/piston-install-langs.mjs )

const BASE = (process.env.PISTON_URL ?? "http://localhost:2000").replace(/\/+$/, "");
const TOKEN = process.env.PISTON_AUTH_TOKEN ?? "";

// Piston package names. "gcc" provides C/C++; "node" provides JavaScript.
// These cover the 7 languages in src/lib/piston.ts LANGUAGE_MAP.
const WANTED = ["python", "node", "typescript", "go", "java", "gcc", "rust"];

const headers = {
  "content-type": "application/json",
  ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
};

function compareSemver(a, b) {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

async function main() {
  console.log(`Piston: ${BASE}${TOKEN ? " (with bearer)" : ""}`);

  const res = await fetch(`${BASE}/api/v2/packages`, { headers });
  if (!res.ok) {
    console.error(`GET /api/v2/packages -> ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const packages = await res.json();

  let failures = 0;
  for (const lang of WANTED) {
    const versions = packages.filter((p) => p.language === lang);
    if (versions.length === 0) {
      console.error(`! "${lang}" not offered by this Piston server — skipping`);
      failures++;
      continue;
    }
    const latest = versions.sort((a, b) => compareSemver(a.language_version, b.language_version)).at(-1);
    if (latest.installed) {
      console.log(`= ${lang} ${latest.language_version} already installed`);
      continue;
    }
    process.stdout.write(`+ installing ${lang} ${latest.language_version} ... `);
    const r = await fetch(`${BASE}/api/v2/packages`, {
      method: "POST",
      headers,
      body: JSON.stringify({ language: lang, version: latest.language_version }),
    });
    if (r.ok) {
      console.log("ok");
    } else {
      console.log(`FAILED (${r.status}) ${await r.text()}`);
      failures++;
    }
  }

  console.log(failures ? `Done with ${failures} failure(s).` : "Done — all language packs installed.");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
