import { NextResponse } from "next/server";
import { logoutUser } from "@/services/auth.service";

export async function POST() {
  await logoutUser();
  return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL ?? "http://localhost:3000"));
}
