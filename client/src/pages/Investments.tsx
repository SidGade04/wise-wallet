import { useEffect, useMemo, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useInvestmentsStore } from "@/store/useInvestmentsStore";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useBankAccounts } from "@/hooks/usePlaid";
import { AlertCircle, TrendingUp, Info, Construction } from "lucide-react";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF"];

// Mock data for demonstration while API is being built
const mockHoldings = [
  {
    security_id: "1",
    ticker: "AAPL",
    name: "Apple Inc.",
    quantity: 10,
    price: 150.25,
    value: 1502.50
  },
  {
    security_id: "2", 
    ticker: "GOOGL",
    name: "Alphabet Inc.",
    quantity: 5,
    price: 2500.00,
    value: 12500.00
  },
  {
    security_id: "3",
    ticker: "TSLA", 
    name: "Tesla Inc.",
    quantity: 8,
    price: 800.75,
    value: 6406.00
  }
];

const mockTransactions = [
  {
    investment_transaction_id: "1",
    date: "2024-01-15",
    ticker: "AAPL",
    type: "buy",
    quantity: 10,
    price: 150.25,
    amount: 1502.50,
    fees: 1.99
  },
  {
    investment_transaction_id: "2",
    date: "2024-01-10", 
    ticker: "GOOGL",
    type: "buy",
    quantity: 5,
    price: 2500.00,
    amount: 12500.00,
    fees: 4.99
  }
];

export default function Investments() {
  const { holdings, transactions, totalValue, fetchHoldings, fetchTransactions, isLoading, error } = useInvestmentsStore();
  const { getToken } = useAuthToken();
  const { data: bankAccounts } = useBankAccounts();
  const [showMockData, setShowMockData] = useState(false);

  useEffect(() => {
    const loadInvestmentData = async () => {
      // First try to get item ID from bank accounts
      let itemId = null;
      
      if (bankAccounts?.accounts?.length > 0) {
        itemId = bankAccounts.accounts[0].item_id;
      } else {
        itemId = typeof window !== "undefined" ? localStorage.getItem("plaid_item_id") : null;
      }

      if (!itemId) {
        console.log("No Plaid item ID found for investments");
        return;
      }

      try {
        await Promise.all([
          fetchHoldings(itemId, getToken),
          fetchTransactions(itemId, getToken)
        ]);
      } catch (error) {
        console.error('Investment API not available:', error);
        // If API fails, we'll show the mock data option
      }
    };

    loadInvestmentData();
  }, [bankAccounts, fetchHoldings, fetchTransactions, getToken]);

  // Determine what data to display
  const displayHoldings = showMockData ? mockHoldings : holdings;
  const displayTransactions = showMockData ? mockTransactions : transactions;
  const displayTotalValue = showMockData ? mockHoldings.reduce((sum, h) => sum + h.value, 0) : totalValue;

  const allocationData = useMemo(() => {
    const totals: Record<string, number> = {};
    displayHoldings.forEach((h) => {
      const key = h.ticker || "Other";
      totals[key] = (totals[key] || 0) + (h.value || 0);
    });
    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [displayHoldings]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-8 p-4">
        <section>
          <h1 className="text-2xl font-bold mb-4">Portfolio Overview</h1>
          <Card>
            <CardHeader>
              <CardTitle>Total Investment Value</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-4" />
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </section>
      </div>
    );
  }

  // Show API unavailable message with option to view mock data
  const isApiUnavailable = error && (
    error.includes('not implemented') || 
    error.includes('Server error') || 
    error.includes('500')
  );

  if (isApiUnavailable && !showMockData) {
    return (
      <div className="space-y-8 p-4">
        <section>
          <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Portfolio Overview
          </h1>
          
          <Alert className="border-blue-200 bg-blue-50">
            <Construction className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="space-y-3">
                <p className="font-medium">Investment Features Coming Soon!</p>
                <p>The investment tracking API is currently under development. This feature will allow you to:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>View your investment portfolio holdings</li>
                  <li>Track investment transactions</li>
                  <li>Analyze portfolio performance</li>
                  <li>See asset allocation breakdowns</li>
                </ul>
                <div className="pt-2">
                  <Button 
                    onClick={() => setShowMockData(true)}
                    variant="outline"
                    size="sm"
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    <Info className="w-4 h-4 mr-2" />
                    Preview with Sample Data
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4">
      {/* Show mock data banner */}
      {showMockData && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <Info className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <div className="flex items-center justify-between">
              <span>Viewing sample investment data for demonstration purposes.</span>
              <Button 
                onClick={() => setShowMockData(false)}
                variant="outline"
                size="sm"
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              >
                Hide Sample Data
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <section>
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          Portfolio Overview
          {showMockData && <span className="text-sm font-normal text-muted-foreground">(Sample Data)</span>}
        </h1>
        <Card>
          <CardHeader>
            <CardTitle>Total Investment Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">${displayTotalValue.toFixed(2)}</p>
            {allocationData.length > 0 ? (
              <ChartContainer config={{}} className="h-64 mt-4">
                <PieChart>
                  <Pie data={allocationData} dataKey="value" nameKey="name" label>
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Value']} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No investment data available
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Holdings</h2>
        <Card>
          <CardContent>
            {displayHoldings.length > 0 ? (
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
                  {displayHoldings.map((h) => (
                    <TableRow key={h.security_id}>
                      <TableCell className="font-medium">{h.ticker || 'N/A'}</TableCell>
                      <TableCell>{h.name || 'N/A'}</TableCell>
                      <TableCell className="text-right">{h.quantity || 0}</TableCell>
                      <TableCell className="text-right">
                        ${h.price ? h.price.toFixed(2) : '0.00'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${h.value ? h.value.toFixed(2) : '0.00'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No holdings data available
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Transactions</h2>
        <Card>
          <CardContent>
            {displayTransactions.length > 0 ? (
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
                  {displayTransactions.map((t) => (
                    <TableRow key={t.investment_transaction_id}>
                      <TableCell>{new Date(t.date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{t.ticker || 'N/A'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          t.type === 'buy' ? 'bg-green-100 text-green-800' :
                          t.type === 'sell' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {t.type || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{t.quantity || 0}</TableCell>
                      <TableCell className="text-right">
                        ${t.price ? t.price.toFixed(2) : '0.00'}
                      </TableCell>
                      <TableCell className="text-right">
                        ${t.amount ? t.amount.toFixed(2) : '0.00'}
                      </TableCell>
                      <TableCell className="text-right">
                        ${t.fees ? t.fees.toFixed(2) : '0.00'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No transaction data available
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Investment Insights</h2>
        <Card>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Holdings</p>
                <p className="text-2xl font-bold">{displayHoldings.length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold">{displayTransactions.length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Portfolio Value</p>
                <p className="text-2xl font-bold text-green-600">${displayTotalValue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}