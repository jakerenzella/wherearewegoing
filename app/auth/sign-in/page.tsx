"use client";

import { useActionState, useEffect, useState } from "react";
import { Button, Input, Label, TextField } from "@heroui/react";
import { sendOtp, verifyOtp } from "./actions";

export default function SignInPage() {
  const [stage, setStage] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [sendState, sendAction, sending] = useActionState(sendOtp, null);
  const [verifyState, verifyAction, verifying] = useActionState(verifyOtp, null);

  useEffect(() => {
    if (sendState?.sent) {
      setEmail(sendState.email);
      setName(sendState.name);
      setStage("otp");
    }
  }, [sendState]);

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <section
        className="w-full max-w-md border-1.5 border-foreground bg-surface"
        style={{ borderWidth: "1.5px" }}
      >
        <div
          className="px-5 py-3 border-b-1.5 border-foreground flex items-center justify-between"
          style={{ borderBottomWidth: "1.5px" }}
        >
          <span className="label-mono">WAWG · Check-in</span>
          <span className="label-mono">
            {stage === "email" ? "Step 1/2" : "Step 2/2"}
          </span>
        </div>
        <div className="p-6 flex flex-col gap-2">
          <span className="label-mono">
            {stage === "email" ? "Sign in" : "Enter your code"}
          </span>
          <h1 className="text-2xl font-bold uppercase tracking-tight leading-none">
            Where Are
            <br />
            We Going?
          </h1>
          {stage === "otp" && (
            <p className="label-mono mt-1">
              Sent a 6-digit code to {email}
            </p>
          )}
        </div>
        <div className="perforate mx-6" />

        {stage === "email" ? (
          <form action={sendAction} className="p-6 flex flex-col gap-4">
            <TextField name="email" isRequired>
              <Label className="label-mono">Email</Label>
              <Input type="email" autoComplete="email" autoFocus />
            </TextField>
            <TextField name="name">
              <Label className="label-mono">
                Display name <span className="text-muted">· new users only</span>
              </Label>
              <Input autoComplete="name" />
            </TextField>
            {sendState?.error && (
              <p className="font-mono uppercase text-xs tracking-wider text-danger">
                ✕ {sendState.error}
              </p>
            )}
            <Button type="submit" variant="primary" isPending={sending}>
              Send code
            </Button>
            <p className="label-mono">
              Invite-only · you'll be rejected if not on the list
            </p>
          </form>
        ) : (
          <form action={verifyAction} className="p-6 flex flex-col gap-4">
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="name" value={name} />
            <TextField name="otp" isRequired>
              <Label className="label-mono">6-digit code</Label>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                autoFocus
              />
            </TextField>
            {verifyState?.error && (
              <p className="font-mono uppercase text-xs tracking-wider text-danger">
                ✕ {verifyState.error}
              </p>
            )}
            <Button type="submit" variant="primary" isPending={verifying}>
              Sign in
            </Button>
            <div className="flex items-center justify-between label-mono">
              <button
                type="button"
                onClick={() => setStage("email")}
                className="underline decoration-dotted underline-offset-4 hover:text-accent"
              >
                ← Change email
              </button>
              <ResendLink email={email} name={name} />
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

function ResendLink({ email, name }: { email: string; name: string }) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function resend() {
    setLoading(true);
    const fd = new FormData();
    fd.set("email", email);
    fd.set("name", name);
    await sendOtp(null, fd);
    setLoading(false);
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  }

  return (
    <button
      type="button"
      onClick={resend}
      disabled={loading}
      className="underline decoration-dotted underline-offset-4 hover:text-accent disabled:opacity-50"
    >
      {loading ? "Resending…" : sent ? "✓ Sent" : "↻ Resend code"}
    </button>
  );
}
