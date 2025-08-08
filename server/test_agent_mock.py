import pytest
from unittest.mock import patch


class ChatOllama:
    def __init__(self, model: str):
        self.model = model

    def predict(self, prompt: str) -> str:
        """Placeholder predict method to be mocked in tests."""
        raise NotImplementedError


def test_chat_ollama_predict_mock():
    """Ensure ChatOllama.predict returns the mocked response."""
    question = "How can I budget better?"
    mocked_answer = "Create a budget and track spending."

    with patch.object(ChatOllama, "predict", return_value=mocked_answer) as mock_predict:
        llm = ChatOllama(model="llama3")
        response = llm.predict(question)

    assert response == mocked_answer
    mock_predict.assert_called_once_with(question)
