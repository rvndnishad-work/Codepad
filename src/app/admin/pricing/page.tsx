import { getPricingConfig, DEFAULT_PRICING } from "@/lib/pricing-plans";
import { requireAdminAccess } from "@/lib/permissions/staff";
import "@/components/wow/wow.css";
import "@/components/home-wow/home-wow.css";
import PricingAdminForm from "./PricingAdminForm";

export const metadata = {
  title: "Pricing — Admin",
};

export default async function AdminPricingPage() {
  await requireAdminAccess();
  const stored = await getPricingConfig();

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-black tracking-tight">Pricing page</h2>
        <p className="text-sm text-muted mt-1">
          Edit plan names, prices, credits, badges and features. Changes go
          live on /pricing immediately after saving.
        </p>
      </div>

      <PricingAdminForm initial={stored} defaults={DEFAULT_PRICING} />
    </div>
  );
}
