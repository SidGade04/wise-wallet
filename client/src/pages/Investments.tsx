import { useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChartContainer } from "@/components/ui/chart";
import { useInvestmentsStore } from "@/store/useInvestmentsStore";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF"];

export default function Investments() {
  const itemId = typeof window !== "undefined" ? localStorage.getItem("plaid_item_id") : null;
  const { holdings, transactions, totalValue, fetchHoldings, fetchTransactions } = useInvestmentsStore();

  useEffect(() => {
    if (itemId) {
      fetchHoldings(itemId);
      fetchTransactions(itemId);
    }
  }, [itemId, fetchHoldings, fetchTransactions]);

  const allocationData = useMemo(() => {
    const totals: Record<string, number> = {};
    holdings.forEach((h) => {
      const key = h.ticker || "Other";
      totals[key] = (totals[key] || 0) + (h.value || 0);
    });
    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [holdings]);

  return (
    <div className="space-y-8 p-4">
      <section>
        <h1 className="text-2xl font-bold mb-4">Portfolio Overview</h1>
        <Card>
          <CardHeader>
            <CardTitle>Total Investment Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">${totalValue.toFixed(2)}</p>
            {allocationData.length > 0 && (
              <ChartContainer config={{}} className="h-64 mt-4">
                <PieChart>
                  <Pie data={allocationData} dataKey="value" nameKey="name" label>
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Holdings</h2>
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdings.map((h) => (
                  <TableRow key={h.security_id}>
                    <TableCell>{h.ticker}</TableCell>
                    <TableCell>{h.name}</TableCell>
                    <TableCell className="text-right">{h.quantity}</TableCell>
                    <TableCell className="text-right">{h.price?.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{h.value?.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Transactions</h2>
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Fees</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.investment_transaction_id}>
                    <TableCell>{new Date(t.date).toLocaleDateString()}</TableCell>
                    <TableCell>{t.ticker}</TableCell>
                    <TableCell>{t.type}</TableCell>
                    <TableCell className="text-right">{t.quantity}</TableCell>
                    <TableCell className="text-right">{t.price?.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{t.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{t.fees?.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Investment Insights</h2>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your portfolio insights will appear here.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}