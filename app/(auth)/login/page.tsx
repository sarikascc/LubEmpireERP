import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import PasswordInput from "@/components/PasswordInput";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  const signIn = async (formData: FormData) => {
    "use server";

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

   
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
    
      return redirect("/login?message=Invalid email or password");
    }

    
    return redirect("/materials/raw-materials");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--lub-bg)] p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8">
       
        <div className="flex flex-col items-center justify-center mb-8">
          <Image
            src="/logo.svg"
            alt="Lubempire Logo"
            width={220}
            height={65}
            className="object-contain mb-3"
            priority
          />
        </div>

     
        <form action={signIn} className="flex flex-col gap-5">
          <div>
            <label
              className="block text-sm font-semibold text-[var(--lub-text)] mb-1.5"
              htmlFor="email"
            >
              Email Address
            </label>
            <input
              className="input-field"
              type="email"
              name="email"
              placeholder="admin@lubempire.co.in"
              required
            />
          </div>

          <div>
            <label
              className="block text-sm font-semibold text-[var(--lub-text)] mb-1.5"
              htmlFor="password"
            >
              Password
            </label>

            <PasswordInput />
          </div>

        
          {resolvedSearchParams?.message && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md text-center font-medium">
              {resolvedSearchParams.message}
            </div>
          )}

          <button type="submit" className="btn-primary w-full mt-2">
            Secure Login
          </button>
        </form>
      </div>
    </div>
  );
}
