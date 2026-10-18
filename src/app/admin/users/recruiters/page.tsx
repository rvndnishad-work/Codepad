import UsersListPage from "../_components/UsersListPage";
import type { RawParams } from "../_lib/filters";

export default async function AdminRecruiterAccountsPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  return <UsersListPage side="recruiters" searchParams={await searchParams} />;
}
