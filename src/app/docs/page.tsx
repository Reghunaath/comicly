"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function DocsPage() {
  return (
    <div style={{ padding: "0 1rem" }}>
      <SwaggerUI url="/api/docs" />
    </div>
  );
}
