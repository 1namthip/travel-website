// src/app/dashboard/page.tsx
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Navbar } from "../../component/User/Navbar";
import HeroSection from "../../component/HeroSection";
import BudgetTripPlannerWrapper from "../../component/BudgetTripPlanner";
import Footer from "../../component/Footer";

export default async function DashboardPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}, // server component อ่านได้อย่างเดียว
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-neutral-50">
      <Navbar />
      <HeroSection />

      <BudgetTripPlannerWrapper isLoggedIn={!!user} />

      <Footer />
    </main>
  );
}