"use server";

import { cookies } from "next/headers";
import { loginUser } from "@/services/auth.service";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export type LoginState = { error?: string };

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  let redirectTo: string;

  try {
    const result = await loginUser({ email, password });

    if (!result.success) {
      return { error: result.error ?? "Login failed." };
    }

    const cookieStore = cookies();
    cookieStore.set(getSessionCookieOptions(result.token!));

    redirectTo = result.redirectTo ?? "/";
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.constructor.name : typeof error;
    console.error(`[loginAction] Unexpected error during login [${errorName}]: ${errorMessage}`, error);
    return { error: "A server error occurred. Please try again later." };
  }

  redirect(redirectTo);
}
