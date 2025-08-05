from langchain.tools import tool

@tool
def get_transactions(user_id: str) -> str:
    """Fetches recent transactions for a user."""
    # Replace with Plaid integration later
    return """
    - Netflix: $14.99
    - Starbucks: $45.50
    - Uber: $120.00
    - Groceries: $300.25
    - Amazon: $89.99
    """

get_transactions_tool = get_transactions

@tool
def get_profile(user_id: str) -> str:
    """Fetches profile info for a user."""
    return "User goal: Save $1000/month. Income: $70,000. Spends mainly on food and shopping."

get_profile_tool = get_profile
