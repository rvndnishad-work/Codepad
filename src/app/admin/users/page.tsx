import UsersListPage from "./_components/UsersListPage";
import type { RawParams } from "./_lib/filters";

// Developer accounts: userType "candidate" plus legacy accounts with no type.
export default async function AdminDeveloperAccountsPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  return <UsersListPage side="developers" searchParams={await searchParams} />;
}
