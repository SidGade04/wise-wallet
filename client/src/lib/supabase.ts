import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Types for TypeScript
export type Database = {
  public: {
    Tables: {
      bank_items: {
        Row: {
          id: string
          user_id: string
          item_id: string
          access_token: string
          institution_id: string | null
          institution_name: string | null
          status: string
          error_message: string | null
          created_at: string
          last_synced_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          item_id: string
          access_token: string
          institution_id?: string | null
          institution_name?: string | null
          status?: string
          error_message?: string | null
          created_at?: string
          last_synced_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          item_id?: string
          access_token?: string
          institution_id?: string | null
          institution_name?: string | null
          status?: string
          error_message?: string | null
          created_at?: string
          last_synced_at?: string | null
        }
      }
      accounts: {
        Row: {
          id: string
          account_id: string
          item_id: string
          user_id: string
          name: string
          type: string
          subtype: string | null
          balance_current: number | null
          balance_available: number | null
          currency_code: string
          created_at: string
        }
        Insert: {
          id?: string
          account_id: string
          item_id: string
          user_id: string
          name: string
          type: string
          subtype?: string | null
          balance_current?: number | null
          balance_available?: number | null
          currency_code?: string
          created_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          item_id?: string
          user_id?: string
          name?: string
          type?: string
          subtype?: string | null
          balance_current?: number | null
          balance_available?: number | null
          currency_code?: string
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          transaction_id: string
          account_id: string
          item_id: string
          user_id: string
          amount: number
          date: string
          name: string
          merchant_name: string | null
          category: string[]
          category_id: string | null
          payment_channel: string | null
          pending: boolean
          currency_code: string
          created_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          account_id: string
          item_id: string
          user_id: string
          amount: number
          date: string
          name: string
          merchant_name?: string | null
          category?: string[]
          category_id?: string | null
          payment_channel?: string | null
          pending?: boolean
          currency_code?: string
          created_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string
          account_id?: string
          item_id?: string
          user_id?: string
          amount?: number
          date?: string
          name?: string
          merchant_name?: string | null
          category?: string[]
          category_id?: string | null
          payment_channel?: string | null
          pending?: boolean
          currency_code?: string
          created_at?: string
        }
      }
    }
  }
}