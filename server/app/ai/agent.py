from langchain_ollama import ChatOllama
from langchain.agents import initialize_agent, Tool
from .tools import get_transactions_tool, get_profile_tool

llm = ChatOllama(model="llama3")

tools = [get_transactions_tool, get_profile_tool]

agent = initialize_agent(
    tools=tools,
    llm=llm,
    agent="zero-shot-react-description",
    verbose=True
)
