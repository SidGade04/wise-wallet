"""
Debug script to manually test and fix Stripe webhook processing.
Run this to diagnose and fix the webhook issue.
"""

import os
import stripe
import asyncio
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Configuration
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Use service role key!

stripe.api_key = STRIPE_SECRET_KEY
stripe.api_version = "2024-06-20"

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

USER_ID = "e5ff71f0-026f-4134-8322-d9021ff80858"  # Your test user ID


async def debug_step_1_check_environment():
    """Step 1: Check environment variables."""
    print("=== STEP 1: Environment Check ===")
    
    required_vars = {
        "STRIPE_SECRET_KEY": STRIPE_SECRET_KEY,
        "SUPABASE_URL": SUPABASE_URL,
        "SUPABASE_SERVICE_KEY": SUPABASE_SERVICE_KEY
    }
    
    for var_name, var_value in required_vars.items():
        if var_value:
            masked_value = f"{var_value[:10]}..." if len(var_value) > 10 else var_value
            print(f"✓ {var_name}: {masked_value}")
        else:
            print(f"✗ {var_name}: NOT SET")
    
    print()


async def debug_step_2_check_profile():
    """Step 2: Check if user profile exists."""
    print("=== STEP 2: Profile Check ===")
    
    try:
        result = supabase.table('profiles').select('*').eq('user_id', USER_ID).execute()
        print(f"Profile query result: {result}")
        
        if result.data:
            profile = result.data[0]
            print(f"✓ Profile exists:")
            print(f"  - Email: {profile.get('email')}")
            print(f"  - Is Pro: {profile.get('is_pro')}")
            print(f"  - Stripe Customer ID: {profile.get('stripe_customer_id')}")
            print(f"  - Subscription ID: {profile.get('stripe_subscription_id')}")
            print(f"  - Subscription Status: {profile.get('subscription_status')}")
            return profile
        else:
            print("✗ No profile found for user")
            return None
            
    except Exception as e:
        print(f"✗ Error checking profile: {e}")
        return None
    
    print()


async def debug_step_3_check_recent_sessions():
    """Step 3: Check recent checkout sessions in Stripe."""
    print("=== STEP 3: Recent Checkout Sessions ===")
    
    try:
        # Get recent checkout sessions
        sessions = stripe.checkout.Session.list(limit=10)
        
        print(f"Found {len(sessions.data)} recent sessions:")
        
        for session in sessions.data:
            metadata = session.get('metadata', {})
            user_id_in_session = metadata.get('user_id')
            
            print(f"\nSession ID: {session.id}")
            print(f"  - Status: {session.status}")
            print(f"  - Payment Status: {session.payment_status}")
            print(f"  - Customer: {session.customer}")
            print(f"  - Subscription: {session.subscription}")
            print(f"  - User ID in metadata: {user_id_in_session}")
            print(f"  - Email in metadata: {metadata.get('user_email')}")
            print(f"  - Created: {datetime.fromtimestamp(session.created)}")
            
            # Check if this session belongs to our test user
            if user_id_in_session == USER_ID and session.status == 'complete':
                print(f"  ⚠️  FOUND COMPLETED SESSION FOR TEST USER!")
                return session
        
        return None
        
    except Exception as e:
        print(f"✗ Error checking sessions: {e}")
        return None
    
    print()


async def debug_step_4_manually_process_session(session):
    """Step 4: Manually process a completed session."""
    print("=== STEP 4: Manual Session Processing ===")
    
    if not session:
        print("No completed session found for user")
        return False
    
    try:
        print(f"Processing session: {session.id}")
        
        customer_id = session.customer
        subscription_id = session.subscription
        metadata = session.metadata or {}
        user_id = metadata.get('user_id')
        user_email = metadata.get('user_email')
        
        print(f"Session data:")
        print(f"  - Customer ID: {customer_id}")
        print(f"  - Subscription ID: {subscription_id}")
        print(f"  - User ID: {user_id}")
        print(f"  - Email: {user_email}")
        
        if not all([customer_id, subscription_id, user_id]):
            print("✗ Missing required session data")
            return False
        
        # Get subscription details
        subscription = stripe.Subscription.retrieve(subscription_id)
        print(f"Subscription status: {subscription.status}")
        
        # Update profile
        update_data = {
            'is_pro': True,
            'stripe_customer_id': customer_id,
            'stripe_subscription_id': subscription_id,
            'subscription_status': subscription.status,
            'subscription_current_period_end': datetime.fromtimestamp(
                subscription.current_period_end
            ).isoformat()
        }
        
        print(f"Updating profile with: {update_data}")
        
        result = supabase.table('profiles').update(update_data).eq('user_id', user_id).execute()
        
        print(f"Update result: {result}")
        
        if result.data:
            print("✓ Successfully updated profile!")
            return True
        else:
            print("✗ Failed to update profile")
            return False
            
    except Exception as e:
        print(f"✗ Error processing session: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return False


async def debug_step_5_verify_update():
    """Step 5: Verify the update worked."""
    print("=== STEP 5: Verification ===")
    
    try:
        result = supabase.table('profiles').select('*').eq('user_id', USER_ID).execute()
        
        if result.data:
            profile = result.data[0]
            print(f"Updated profile:")
            print(f"  - Is Pro: {profile.get('is_pro')}")
            print(f"  - Stripe Customer ID: {profile.get('stripe_customer_id')}")
            print(f"  - Subscription ID: {profile.get('stripe_subscription_id')}")
            print(f"  - Subscription Status: {profile.get('subscription_status')}")
            print(f"  - Period End: {profile.get('subscription_current_period_end')}")
            
            if profile.get('is_pro'):
                print("✓ SUCCESS: User is now Pro!")
            else:
                print("✗ FAILED: User is still not Pro")
        else:
            print("✗ Could not retrieve updated profile")
            
    except Exception as e:
        print(f"✗ Error verifying update: {e}")


async def debug_step_6_create_profile_if_missing():
    """Step 6: Create profile if it doesn't exist."""
    print("=== STEP 6: Create Profile If Missing ===")
    
    try:
        # Check if profile exists
        result = supabase.table('profiles').select('user_id').eq('user_id', USER_ID).execute()
        
        if not result.data:
            print("Profile doesn't exist, creating one...")
            
            # You'll need to provide a valid email - get it from your auth.users table
            auth_user = supabase.table('auth.users').select('email').eq('id', USER_ID).execute()
            
            if auth_user.data:
                email = auth_user.data[0]['email']
            else:
                email = 'unknown@example.com'  # Fallback
            
            create_result = supabase.table('profiles').insert({
                'user_id': USER_ID,
                'email': email,
                'is_pro': False
            }).execute()
            
            print(f"Profile creation result: {create_result}")
            
            if create_result.data:
                print("✓ Profile created successfully")
            else:
                print("✗ Failed to create profile")
        else:
            print("✓ Profile already exists")
            
    except Exception as e:
        print(f"✗ Error creating profile: {e}")


async def main():
    """Run all debug steps."""
    print("🔍 STRIPE WEBHOOK DEBUG SCRIPT")
    print("=" * 50)
    
    await debug_step_1_check_environment()
    
    profile = await debug_step_2_check_profile()
    
    if not profile:
        await debug_step_6_create_profile_if_missing()
        profile = await debug_step_2_check_profile()
    
    recent_session = await debug_step_3_check_recent_sessions()
    
    if recent_session:
        success = await debug_step_4_manually_process_session(recent_session)
        if success:
            await debug_step_5_verify_update()
    else:
        print("No completed session found. Please:")
        print("1. Make a test purchase")
        print("2. Wait for it to complete") 
        print("3. Run this script again")
    
    print("\n" + "=" * 50)
    print("🎯 NEXT STEPS:")
    print("1. If this script fixed it, the issue was that the webhook never fired")
    print("2. Check your Stripe webhook URL is correct and accessible")
    print("3. Make sure your webhook is subscribed to 'checkout.session.completed'")
    print("4. Use SUPABASE_SERVICE_ROLE_KEY instead of SUPABASE_PUBLISHABLE_KEY")


if __name__ == "__main__":
    asyncio.run(main())