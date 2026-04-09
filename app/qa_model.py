from transformers import pipeline

print("Loading QA model...")
qa_pipeline = pipeline("text2text-generation", model="google/flan-t5-base")

def answer_question(context, question):
    prompt = f"""
    Answer the question based on the context.

    Context: {context}

    Question: {question}
    """
    result = qa_pipeline(prompt, max_length=150)
    return result[0]['generated_text']
