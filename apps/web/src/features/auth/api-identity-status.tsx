"use client";

import { useEffect, useState } from "react";

import { getCurrentApiUser } from "@/lib/api/client";

type ConnectionState = "checking" | "verified" | "unavailable";

export function ApiIdentityStatus() {
  const [state, setState] = useState<ConnectionState>("checking");

  useEffect(() => {
    let isActive = true;

    getCurrentApiUser()
      .then(() => {
        if (isActive) {
          setState("verified");
        }
      })
      .catch(() => {
        if (isActive) {
          setState("unavailable");
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const label =
    state === "checking"
      ? "Checking"
      : state === "verified"
        ? "Identity verified"
        : "API unavailable";

  return (
    <span role="status" aria-live="polite">
      {label}
    </span>
  );
}