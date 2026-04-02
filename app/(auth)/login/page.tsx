import Link from "next/link";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-brand-700">
            Beyond
          </Link>
          <p className="text-gray-500 mt-2 text-sm">
            Sign in to your store operations dashboard
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-6">Sign In</h1>
          <LoginForm />
          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="#" className="text-brand-600 hover:text-brand-700 font-medium">
              Contact Sales
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
