"use client";

import { useEffect, useRef } from "react";

// Swagger UI is loaded from the CDN (no npm dependency / build weight). It
// parses the YAML spec itself, fetched from the admin-gated /api/openapi route.
const SWAGGER_VERSION = "5.17.14";

export default function SwaggerView() {
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = `https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui.css`;
    document.head.appendChild(css);

    const script = document.createElement("script");
    script.src = `https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui-bundle.js`;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      // @ts-expect-error — global injected by the CDN bundle
      window.SwaggerUIBundle({
        url: "/api/openapi",
        dom_id: "#swagger-ui",
        deepLinking: true,
        docExpansion: "none",
        defaultModelsExpandDepth: 0,
      });
    };
    document.body.appendChild(script);
  }, []);

  return <div id="swagger-ui" style={{ background: "#fff", minHeight: "100vh" }} />;
}
