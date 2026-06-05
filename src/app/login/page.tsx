import AuthCard from "./AuthCard";
import OnboardingShowcase from "./OnboardingShowcase";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") ? next : "/";

  const providers = {
    github: Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET),
    google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
    facebook: Boolean(
      process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET
    ),
  };

  return (
    <div className="flex-1 w-full flex bg-bg relative overflow-hidden min-h-[calc(100vh-64px)]">
      {/* Visual / Brand Onboarding Side (Left) */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[50%] relative flex-col justify-start pt-[clamp(2.5rem,6.5vh,4.5rem)] pb-[clamp(1.5rem,3.5vh,3rem)] px-[clamp(1.5rem,3.5vh,3.5rem)] bg-surface/30 border-r border-border overflow-hidden select-none">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-accent/10 opacity-[0.15] blur-[100px] pointer-events-none animate-pulse duration-10000" />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-indigo-500/10 opacity-[0.15] blur-[90px] pointer-events-none animate-pulse duration-[7000ms]" />

        {/* Onboarding Carousel */}
        <div className="relative z-10 w-full">
          <OnboardingShowcase />
        </div>
      </div>

      {/* Form Side (Right) */}
      <div className="flex-1 flex flex-col justify-start items-center pt-[clamp(2.5rem,6.5vh,4.5rem)] pb-[clamp(1.5rem,3.5vh,3rem)] px-6 md:px-12 relative z-10 bg-bg">
        {/* Glow Effects for mobile/tablet background context */}
        <div className="lg:hidden absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-accent/5 opacity-[0.1] blur-[80px] pointer-events-none" />
        
        <div className="w-full max-w-sm relative z-10 my-auto">
          <AuthCard providers={providers} next={safeNext} />
        </div>
      </div>
    </div>
  );
}
