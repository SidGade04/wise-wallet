from langchain_ollama import ChatOllama
llm = ChatOllama(model="llama3")

response = llm.predict("How can I budget better?")
print(response)
