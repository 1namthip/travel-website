// src/app/page.tsx
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Navbar } from "../component/User/Navbar";
import HeroSection from "../component/HeroSection";
import BudgetTripPlannerWrapper from "@/component/BudgetTripPlanner";
import Footer from "../component/Footer";

export default async function HomePage() {
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-linear-to-b from-sky-100 to-white flex flex-col">
      <Navbar />
      <HeroSection />
      <BudgetTripPlannerWrapper isLoggedIn={!!user} />
      <Footer />
    </div>
  );
}