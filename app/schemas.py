from pydantic import BaseModel

class TextRequest(BaseModel):
    text: str
    mode: str = "balanced"
    max_length: int = 100

class QuestionRequest(BaseModel):
    context: str
    question: str

# from pydantic import BaseModel

# class TextRequest(BaseModel):
#     text: str
#     max_length: int = 100


# class QuestionRequest(BaseModel):
#     context: str
#     question: str
