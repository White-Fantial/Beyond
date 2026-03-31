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
    return { error: "이메일과 비밀번호를 입력해주세요." };
  }

  let redirectTo: string;

  try {
    const result = await loginUser({ email, password });

    if (!result.success) {
      return { error: result.error ?? "로그인에 실패했습니다." };
    }

    const cookieStore = await cookies();
    cookieStore.set(getSessionCookieOptions(result.token!));

    redirectTo = result.redirectTo ?? "/";
  } catch (error) {
    console.error("[loginAction] Unexpected error during login:", error);
    return { error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요." };
  }

  redirect(redirectTo);
}
