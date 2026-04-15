"use client";

import { useState } from "react";
import { Button } from "@heroui/react";

export function ResetButton() {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function doReset() {
    setLoading(true);
    const res = await fetch("/api/admin/reset", { method: "POST" });
    setLoading(false);
    if (res.ok) {
      window.location.reload();
    } else {
      alert("Reset failed.");
    }
  }

  if (!confirming) {
    return (
      <Button variant="danger" onPress={() => setConfirming(true)}>
        Reset trip (wipe pitches + ballots)
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="label-mono">
        Really wipe everything? This cannot be undone.
      </span>
      <div className="flex gap-2">
        <Button variant="danger" onPress={doReset} isPending={loading}>
          Yes, wipe it all
        </Button>
        <Button
          variant="ghost"
          onPress={() => setConfirming(false)}
          isDisabled={loading}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
