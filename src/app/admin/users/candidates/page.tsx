import UsersListPage from "../_components/UsersListPage";
import type { RawParams } from "../_lib/filters";

export default async function AdminCandidateAccountsPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  return <UsersListPage side="candidates" searchParams={await searchParams} />;
}
