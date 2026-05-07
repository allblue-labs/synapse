import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * The browser API origin — derived from the same env var the API client
 * uses, so CSP `connect-src` always matches the runtime fetch target.
 * Falls back to the dev compose mapping (`http://localhost:5000`).
 */
const apiOrigin = (() => {
  const raw =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://192.168.1.15:5000/v1";
  try {
    return new URL(raw).origin;
  } catch {
    return "http://192.168.1.15:5000";
  }
})();

/**
 * Content-Security-Policy
 *
 * `'unsafe-inline'` on script-src is required by Next's runtime injection
 * (RSC payloads, dev refresh) and is well-known for App Router projects.
 * Tighten to `nonce-` based or `strict-dynamic` once the surface stabilises
 * and a server-side nonce strategy is in place.
 *
 * In dev we additionally relax `connect-src` for HMR over websockets.
 */
function buildCsp(): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(isProd ? [] : ["'unsafe-eval'"]),
    ],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    "connect-src": ["'self'", apiOrigin, ...(isProd ? [] : ["ws:", "wss:"])],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
  };

  if (process.env.ENABLE_HTTPS_UPGRADE === "true") {
    directives["upgrade-insecure-requests"] = [];
  }

  return Object.entries(directives)
    .map(([key, values]) =>
      values.length ? `${key} ${values.join(" ")}` : key,
    )
    .join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: buildCsp() },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "autoplay=()",
      "camera=()",
      "display-capture=()",
      "fullscreen=(self)",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "payment=()",
      "usb=()",
    ].join(", "),
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // Local file: dependency that ships TypeScript sources directly. Next
  // needs to transpile it through SWC like first-party code.
  transpilePackages: ["@synapse/contracts"],

  // Hide framework signature
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
