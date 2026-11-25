import serverless from "serverless-http";

import { createServer } from "../../server";

const expressHandler = serverless(createServer());

export const handler = (event: any, context: any) => {
  const headers = {
    ...(event.headers || {}),
    "content-type": event.headers?.["content-type"] || event.headers?.["Content-Type"] || "application/json",
  };
  const body = event.isBase64Encoded && typeof event.body === "string"
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  // Le corps est décodé ici : on indique à serverless-http de ne pas le décoder une seconde fois.
  return expressHandler({ ...event, headers, body, isBase64Encoded: false }, context);
};
