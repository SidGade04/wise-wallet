import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/store/useStore";
import { BankAccount } from "@/types";
import { 
  Building2, 
  CreditCard, 
  CheckCircle, 
  Loader2,
  Shield,
  Lock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const mockBanks = [
  { id: 'chase', name: 'Chase Bank', logo: '🏦' },
  { id: 'bofa', name: 'Bank of America', logo: '🏛️' },
  { id: 'wells', name: 'Wells Fargo', logo: '🏪' },
  { id: 'citi', name: 'Citibank', logo: '🏢' },
  { id: 'amex', name: 'American Express', logo: '💳' },
];

interface PlaidLinkProps {
  children: React.ReactNode;
  onSuccess?: () => void;
}

export function PlaidLink({ children, onSuccess }: PlaidLinkProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const { linkBankAccount } = useStore();
  const { toast } = useToast();

  const handleBankSelection = (bankId: string) => {
    setSelectedBank(bankId);
  };

  const handleConnect = async () => {
    if (!selectedBank) return;

    setIsConnecting(true);
    
    // Mock the Plaid Link flow
    setTimeout(() => {
      const bank = mockBanks.find(b => b.id === selectedBank);
      if (bank) {
        const mockAccount: BankAccount = {
          id: `${selectedBank}_${Date.now()}`,
          userId: 'current_user',
          name: `${bank.name} Checking`,
          balance: Math.random() * 10000 + 1000,
          type: 'checking',
          lastSynced: new Date()
        };

        linkBankAccount(mockAccount);
        setIsConnected(true);
        setIsConnecting(false);

        toast({
          title: "Bank account connected!",
          description: `Successfully linked your ${bank.name} account.`,
        });

        // Call onSuccess callback if provided
        onSuccess?.();

        // Close dialog after success
        setTimeout(() => {
          setIsOpen(false);
          setIsConnected(false);
          setSelectedBank(null);
        }, 2000);
      }
    }, 2000);
  };

  const resetDialog = () => {
    setSelectedBank(null);
    setIsConnecting(false);
    setIsConnected(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetDialog();
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Connect Your Bank Account
          </DialogTitle>
          <DialogDescription>
            Securely link your bank account to automatically import transactions
          </DialogDescription>
        </DialogHeader>

        {!isConnected ? (
          <div className="space-y-4">
            {/* Security Notice */}
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 text-sm">
                <Lock className="w-4 h-4 text-primary" />
                <span className="font-medium text-primary">Bank-level security</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Your data is encrypted and we never store your banking credentials
              </p>
            </div>

            {/* Bank Selection */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Select your bank:</p>
              <div className="grid gap-2">
                {mockBanks.map((bank) => (
                  <button
                    key={bank.id}
                    onClick={() => handleBankSelection(bank.id)}
                    className={`p-3 border rounded-lg text-left transition-all hover:shadow-sm ${
                      selectedBank === bank.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{bank.logo}</span>
                      <div>
                        <p className="font-medium">{bank.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Checking, Savings, Credit Cards
                        </p>
                      </div>
                      {selectedBank === bank.id && (
                        <CheckCircle className="w-5 h-5 text-primary ml-auto" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Connect Button */}
            <Button
              onClick={handleConnect}
              disabled={!selectedBank || isConnecting}
              className="w-full"
              variant="financial"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect Account'
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              This is a demo. No actual bank connection is made.
            </p>
          </div>
        ) : (
          /* Success State */
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <div>
              <h3 className="font-medium text-lg">Account Connected!</h3>
              <p className="text-sm text-muted-foreground">
                Your bank account has been successfully linked
              </p>
            </div>
            <Badge variant="secondary" className="bg-success/10 text-success">
              Transactions will sync automatically
            </Badge>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}