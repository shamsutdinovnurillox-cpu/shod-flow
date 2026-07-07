import { getExpenses } from "@/app/actions/expenses";
import { requireModule } from "@/lib/auth-guard";
import { getTrucks, getTrailers } from "@/app/actions/fleet";
import { ExpensesClient } from "@/components/fleet/ExpensesClient";

export default async function ExpensesPage() {
  await requireModule("fleet.expenses");
  const [expenses, trucks, trailers] = await Promise.all([
    getExpenses(),
    getTrucks(),
    getTrailers(),
  ]);
  
  return (
    <ExpensesClient initialExpenses={expenses} trucks={trucks} trailers={trailers} />
  );
}
