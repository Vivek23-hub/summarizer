from fastapi import APIRouter, UploadFile, File, Form
from app.schemas import TextRequest, QuestionRequest
from app.model import model_instance
from app.utils import clean_text
from app.file_handlers import extract_text
from app.qa_model import answer_question_rag, index_document

router = APIRouter()

@router.post("/summarize-text")
async def summarize_text(data: TextRequest):
    cleaned = clean_text(data.text)

    # Index document if an ID is provided
    if data.document_id:
        index_document(data.document_id, cleaned)

    summary = model_instance.summarize(
        cleaned,
        mode=data.mode,
        max_length=data.max_length
    )

    return {"summary": summary}


@router.post("/summarize-file")
async def summarize_file(file: UploadFile = File(...), mode: str = Form("balanced"), max_length: int = Form(100), document_id: str = Form(None)):
    text = extract_text(file.file, file.filename)
    cleaned = clean_text(text)

    # Index document if an ID is provided
    if document_id:
        index_document(document_id, cleaned)

    summary = model_instance.summarize(
        cleaned,
        mode=mode,
        max_length=max_length
    )

    return {"summary": summary}


@router.post("/ask")
async def ask_question_api(data: QuestionRequest):
    answer = answer_question_rag(data.document_id, data.question)
    return {"answer": answer}

# from fastapi import APIRouter, UploadFile, File, Form
# from app.schemas import TextRequest, QuestionRequest
# from app.model import model_instance
# from app.utils import clean_text
# from app.file_handlers import extract_text
# from app.qa_model import answer_question

# router = APIRouter()

# # 🔹 TEXT INPUT
# @router.post("/summarize-text")
# async def summarize_text(data: TextRequest):
#     cleaned = clean_text(data.text)

#     summary = model_instance.summarize(
#         cleaned,
#         max_length=data.max_length
#     )

#     return {"summary": summary}


# # 🔹 FILE INPUT
# @router.post("/summarize-file")
# async def summarize_file(
#     file: UploadFile = File(...),
#     max_length: int = Form(100)
# ):
#     text = extract_text(file.file, file.filename)
#     cleaned = clean_text(text)

#     summary = model_instance.summarize(
#         cleaned,
#         max_length=max_length
#     )

#     return {"summary": summary}


# # 🔹 AI ASSISTANT
# @router.post("/ask")
# async def ask_question_api(data: QuestionRequest):
#     answer = answer_question(data.context, data.question)
#     return {"answer": answer}