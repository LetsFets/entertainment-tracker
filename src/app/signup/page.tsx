"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import Link from "next/link";
import DecorationPic from "./decoration.png";

// We can also use server actions in client components.
import { signUp } from "@/actions/signup";
import {
  type FormEventHandler,
  useActionState,
  useCallback,
  useRef,
} from "react";
import { Loader2Icon } from "lucide-react";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUp, {});

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);
  const validatePasswordConfirmation = useCallback<
    FormEventHandler<HTMLInputElement>
  >((ev) => {
    confirmPasswordInputRef.current?.setCustomValidity("");
    if (passwordInputRef.current?.value !== ev.currentTarget.value) {
      confirmPasswordInputRef.current?.setCustomValidity(
        "Passwords do not match",
      );
    }
  }, []);

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden p-0">
            <CardContent className="grid p-0 md:grid-cols-2">
              <form action={formAction} className="p-6 md:p-8">
                <FieldGroup>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-bold">Create your account</h1>
                    <p className="text-muted-foreground text-sm text-balance">
                      Enter your email below to create your account
                    </p>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                    />
                    <FieldDescription>
                      We&apos;ll use this to contact you. We will not share your
                      email with anyone else.
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="name">Name</FieldLabel>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="John Doe"
                      required
                    />
                  </Field>
                  <Field>
                    <Field className="grid grid-cols-2 gap-4">
                      <Field>
                        <FieldLabel htmlFor="password">Password</FieldLabel>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          required
                          ref={passwordInputRef}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="confirm-password">
                          Confirm Password
                        </FieldLabel>
                        <Input
                          id="confirm-password"
                          type="password"
                          required
                          minLength={8}
                          onInput={validatePasswordConfirmation}
                          ref={confirmPasswordInputRef}
                        />
                      </Field>
                    </Field>
                    <FieldDescription>
                      Must be at least 8 characters long.
                    </FieldDescription>
                  </Field>
                  {state?.error && (
                    <FieldError
                      className="text-center"
                      errors={state.error.split("\n").map((err) => ({
                        message: err,
                      }))}
                    />
                  )}
                  <Field>
                    <Button type="submit" disabled={pending}>
                      {pending && (
                        <Loader2Icon className="size-4 animate-spin" />
                      )}
                      Create Account
                    </Button>
                  </Field>

                  <FieldDescription className="text-center">
                    Already have an account? <a href="/login">Login</a>
                  </FieldDescription>
                </FieldGroup>
              </form>
              <div className="bg-muted relative hidden md:block">
                <Image
                  src={DecorationPic}
                  alt="Decoration image"
                  className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                />
              </div>
            </CardContent>
          </Card>
          <FieldDescription className="px-6 text-center">
            By clicking continue, you agree to our{" "}
            <Link href="/terms">Terms of Service</Link> and{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </FieldDescription>
        </div>
      </div>
    </div>
  );
}
