import { getExpenses } from "@/app/actions/expenses";
import { getTrucks, getTrailers } from "@/app/actions/fleet";
import { ExpensesClient } from "@/components/fleet/ExpensesClient";

export default async function ExpensesPage() {
  const [expenses, trucks, trailers] = await Promise.all([
    getExpenses(),
    getTrucks(),
    getTrailers(),
  ]);
  
  return (
    <ExpensesClient initialExpenses={expenses} trucks={trucks} trailers={trailers} />
  );
}
