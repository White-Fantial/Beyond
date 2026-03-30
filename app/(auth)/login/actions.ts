"use server";

import { loginUser } from "@/services/auth.service";
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

  const result = await loginUser({ email, password });

  if (!result.success) {
    return { error: result.error ?? "로그인에 실패했습니다." };
  }

  redirect(result.redirectTo ?? "/");
}
