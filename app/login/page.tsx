import Link from "next/link";
import { Card } from "@/components/ui";
import { LoginForm } from "@/components/login-form";
import { BrandLogo } from "@/components/brand";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ schoolSlug?: string }>;
}) {
  const { schoolSlug } = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <Link href="/" className="text-sm text-white/70 hover:text-white">
          ← Back to home
        </Link>
        <div className="flex justify-center">
          <BrandLogo />
        </div>
        <Card title="Login">
          <LoginForm defaultSchoolSlug={schoolSlug} />
        </Card>
        <div className="text-sm text-white/70">
          New school?{" "}
          <Link href="/onboard" className="text-indigo-300 hover:text-indigo-200">
            Onboard here
          </Link>
        </div>
      </div>
    </main>
  );
}
