import crypto from "crypto";

export function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString("hex");
}

