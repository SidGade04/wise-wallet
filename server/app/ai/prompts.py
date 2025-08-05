def build_expense_summary_prompt(transactions: list) -> str:
    return f"""
You are a personal finance assistant.

Here is a list of recent transactions:
{transactions}

Please summarize the user's spending trends, detect unusual items, and suggest saving tips.
"""
