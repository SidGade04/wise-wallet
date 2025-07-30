import { User, Transaction, Subscription, Category } from '@/types';
import { subDays, addDays } from 'date-fns';

export const mockUser: User = {
  id: '1',
  email: 'john.doe@example.com',
  name: 'John Doe',
  profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
  linkedBankAccounts: ['account_1', 'account_2'],
  createdAt: new Date('2023-01-15')
};

export const categories: Category[] = [
  { id: '1', name: 'Food & Dining', color: '#FF6B6B', icon: '🍽️' },
  { id: '2', name: 'Transportation', color: '#4ECDC4', icon: '🚗' },
  { id: '3', name: 'Shopping', color: '#45B7D1', icon: '🛍️' },
  { id: '4', name: 'Entertainment', color: '#96CEB4', icon: '🎬' },
  { id: '5', name: 'Bills & Utilities', color: '#FFEAA7', icon: '💡' },
  { id: '6', name: 'Healthcare', color: '#DDA0DD', icon: '🏥' },
  { id: '7', name: 'Education', color: '#98D8C8', icon: '📚' },
  { id: '8', name: 'Travel', color: '#F7DC6F', icon: '✈️' },
  { id: '9', name: 'Subscriptions', color: '#BB8FCE', icon: '📱' }
];

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    userId: '1',
    amount: -87.32,
    merchant: 'Whole Foods Market',
    category: 'Food & Dining',
    date: subDays(new Date(), 1),
    description: 'Grocery shopping',
    accountId: 'account_1'
  },
  {
    id: '2',
    userId: '1',
    amount: -12.99,
    merchant: 'Netflix',
    category: 'Subscriptions',
    date: subDays(new Date(), 2),
    description: 'Monthly subscription',
    accountId: 'account_1',
    isRecurring: true
  },
  {
    id: '3',
    userId: '1',
    amount: -45.67,
    merchant: 'Shell Gas Station',
    category: 'Transportation',
    date: subDays(new Date(), 3),
    description: 'Gas fill-up',
    accountId: 'account_1'
  },
  {
    id: '4',
    userId: '1',
    amount: -156.43,
    merchant: 'Amazon',
    category: 'Shopping',
    date: subDays(new Date(), 4),
    description: 'Online shopping',
    accountId: 'account_2'
  },
  {
    id: '5',
    userId: '1',
    amount: -89.99,
    merchant: 'Nike Store',
    category: 'Shopping',
    date: subDays(new Date(), 5),
    description: 'Running shoes',
    accountId: 'account_1'
  },
  {
    id: '6',
    userId: '1',
    amount: -23.45,
    merchant: 'Starbucks',
    category: 'Food & Dining',
    date: subDays(new Date(), 6),
    description: 'Coffee and pastry',
    accountId: 'account_1'
  },
  {
    id: '7',
    userId: '1',
    amount: -567.89,
    merchant: 'Rent Payment',
    category: 'Bills & Utilities',
    date: subDays(new Date(), 7),
    description: 'Monthly rent',
    accountId: 'account_2'
  },
  {
    id: '8',
    userId: '1',
    amount: -19.99,
    merchant: 'Spotify',
    category: 'Subscriptions',
    date: subDays(new Date(), 8),
    description: 'Music streaming',
    accountId: 'account_1',
    isRecurring: true
  }
];

export const mockSubscriptions: Subscription[] = [
  {
    id: '1',
    userId: '1',
    merchant: 'Netflix',
    amount: 12.99,
    frequency: 'monthly',
    nextBillingDate: addDays(new Date(), 22),
    isActive: true,
    category: 'Entertainment',
    lastChargeDate: subDays(new Date(), 2)
  },
  {
    id: '2',
    userId: '1',
    merchant: 'Spotify Premium',
    amount: 19.99,
    frequency: 'monthly',
    nextBillingDate: addDays(new Date(), 15),
    isActive: true,
    category: 'Entertainment',
    lastChargeDate: subDays(new Date(), 8)
  },
  {
    id: '3',
    userId: '1',
    merchant: 'Adobe Creative Cloud',
    amount: 52.99,
    frequency: 'monthly',
    nextBillingDate: addDays(new Date(), 10),
    isActive: true,
    category: 'Software',
    lastChargeDate: subDays(new Date(), 20)
  },
  {
    id: '4',
    userId: '1',
    merchant: 'Amazon Prime',
    amount: 139,
    frequency: 'yearly',
    nextBillingDate: addDays(new Date(), 180),
    isActive: true,
    category: 'Shopping',
    lastChargeDate: subDays(new Date(), 185)
  },
  {
    id: '5',
    userId: '1',
    merchant: 'Planet Fitness',
    amount: 24.99,
    frequency: 'monthly',
    nextBillingDate: addDays(new Date(), 5),
    isActive: false,
    category: 'Health & Fitness',
    lastChargeDate: subDays(new Date(), 25)
  }
];