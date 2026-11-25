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

  return expressHandler({ ...event, headers, body }, context);
};import serverless from "serverless-http";

import { createServer } from "../../server";

const decodeBody = (event: any): string => {
  if (typeof event.body !== "string") return "";
  return event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
};

const expressHandler = serverless(createServer(), {
  // Copie du corps brut de l'événement Netlify, lue par le serveur si le flux est vide.
  request(req: any, event: any) {
    req.eventBody = decodeBody(event);
  },
});

export const handler = (event: any, context: any) => {
  const headers = {
    ...(event.headers || {}),
    "content-type": event.headers?.["content-type"] || event.headers?.["Content-Type"] || "application/json",
  };
  const body = decodeBody(event) || event.body;

  // Diagnostic temporaire (sans valeurs sensibles) : à retirer une fois la connexion validée.
  if (event.httpMethod === "POST" && String(event.path || "").includes("/auth/login")) {
    console.log("[api] login body:", typeof event.body, "len", decodeBody(event).length, "b64", event.isBase64Encoded, "ct", headers["content-type"]);
  }

  // Le corps est décodé ici : on indique à serverless-http de ne pas le décoder une seconde fois.
  return expressHandler({ ...event, headers, body, isBase64Encoded: false }, context);
};
