# from transformers import pipeline, AutoTokenizer, AutoModel
# import torch
# import torch.nn.functional as F

# print("Loading QA model...")
# qa_pipeline = pipeline("text2text-generation", model="google/flan-t5-base")

# print("Loading Embedding model...")
# # Using a small and fast model for local embeddings
# embed_tokenizer = AutoTokenizer.from_pretrained('sentence-transformers/all-MiniLM-L6-v2')
# embed_model = AutoModel.from_pretrained('sentence-transformers/all-MiniLM-L6-v2')

# # In-memory document store
# # Format: { document_id: { "chunks": [...], "embeddings": tensor } }
# documents_store = {}

# def mean_pooling(model_output, attention_mask):
#     token_embeddings = model_output[0] # First element of model_output contains all token embeddings
#     input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
#     return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

# def compute_embeddings(sentences):
#     # Tokenize sentences
#     encoded_input = embed_tokenizer(sentences, padding=True, truncation=True, return_tensors='pt')
    
#     # Compute token embeddings
#     with torch.no_grad():
#         model_output = embed_model(**encoded_input)
        
#     # Perform pooling
#     sentence_embeddings = mean_pooling(model_output, encoded_input['attention_mask'])
    
#     # Normalize embeddings
#     sentence_embeddings = F.normalize(sentence_embeddings, p=2, dim=1)
#     return sentence_embeddings

# def chunk_text(text, chunk_size=300, overlap=50):
#     words = text.split()
#     chunks = []
#     i = 0
#     while i < len(words):
#         chunk = " ".join(words[i:i + chunk_size])
#         chunks.append(chunk)
#         i += chunk_size - overlap
#     return chunks

# def index_document(document_id, text):
#     print(f"Indexing document {document_id}")
#     chunks = chunk_text(text)
#     if not chunks:
#         chunks = ["Empty document"]
        
#     embeddings = compute_embeddings(chunks)
#     documents_store[document_id] = {
#         "chunks": chunks,
#         "embeddings": embeddings
#     }
#     print(f"Indexed {len(chunks)} chunks for {document_id}")

# def answer_question_rag(document_id, question):
#     doc_data = documents_store.get(document_id)
    
#     if not doc_data:
#         return "Sorry, that document hasn't been indexed or has been cleared from memory. Please summarize it again."
        
#     chunks = doc_data["chunks"]
#     doc_embeddings = doc_data["embeddings"]
    
#     # Embed question
#     question_embedding = compute_embeddings([question])
    
#     # Compute cosine similarity
#     cos_scores = torch.mm(question_embedding, doc_embeddings.transpose(0, 1))[0]
    
#     # Get top 3 chunks (or top 5 if available for more context)
#     top_k = min(5, len(chunks))
#     top_results = torch.topk(cos_scores, k=top_k)
    
#     # Build context with clear separation
#     context_pieces = []
#     for i, idx in enumerate(top_results[1]):
#         context_pieces.append(f"[Extract {i+1}]:\n{chunks[idx]}")
#     context = "\n\n".join(context_pieces)
        
#     prompt = f"""
#     You are an expert AI assistant providing well-structured, easy-to-read, and comprehensive answers.
#     Based on the provided Context Extracts, answer the user's Question.

#     Guidelines:
#     - Synthesize information from multiple extracts naturally. Do not repeat pointlessly.
#     - If comparing differing concepts, use a small table. Structure your answer with bullet points if listing facts.
#     - If the answer is not in the context, say "I don't have enough information to answer that based on the provided document." Do not hallucinate.

#     Context Extracts:
#     {context}
    
#     Question: {question}

#     Structured Answer:
#     """
    
#     # Increased max_length to allow for comprehensive and structured answers
#     # Using do_sample=False (greedy decoding) for fact-based RAG
#     result = qa_pipeline(prompt, max_length=400, truncation=True)
#     return result[0]['generated_text']


from transformers import pipeline, AutoTokenizer, AutoModel
import torch
import torch.nn.functional as F
import re

print("Loading QA model...")
qa_pipeline = pipeline(
    "text2text-generation",
    model="google/flan-t5-base",
    device=0 if torch.cuda.is_available() else -1
)

print("Loading Embedding model...")
embed_tokenizer = AutoTokenizer.from_pretrained('sentence-transformers/all-MiniLM-L6-v2')
embed_model = AutoModel.from_pretrained('sentence-transformers/all-MiniLM-L6-v2')

# In-memory document store
documents_store = {}

# ------------------ EMBEDDINGS ------------------

def mean_pooling(model_output, attention_mask):
    token_embeddings = model_output[0]
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

def compute_embeddings(sentences):
    encoded_input = embed_tokenizer(sentences, padding=True, truncation=True, return_tensors='pt')
    
    with torch.no_grad():
        model_output = embed_model(**encoded_input)
        
    sentence_embeddings = mean_pooling(model_output, encoded_input['attention_mask'])
    sentence_embeddings = F.normalize(sentence_embeddings, p=2, dim=1)
    
    return sentence_embeddings

# ------------------ BETTER CHUNKING ------------------

def chunk_text(text, chunk_size=500):
    sentences = re.split(r'(?<=[.!?]) +', text)
    
    chunks = []
    current_chunk = ""

    for sentence in sentences:
        if len(current_chunk) + len(sentence) < chunk_size:
            current_chunk += " " + sentence
        else:
            chunks.append(current_chunk.strip())
            current_chunk = sentence

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks

# ------------------ INDEXING ------------------

def index_document(document_id, text):
    print(f"Indexing document {document_id}")
    
    chunks = chunk_text(text)
    if not chunks:
        chunks = ["Empty document"]
        
    embeddings = compute_embeddings(chunks)
    
    documents_store[document_id] = {
        "chunks": chunks,
        "embeddings": embeddings
    }

    print(f"Indexed {len(chunks)} chunks")

# ------------------ QA (RAG) ------------------

def answer_question_rag(document_id, question):
    doc_data = documents_store.get(document_id)
    
    if not doc_data:
        return "Document not indexed. Please reprocess the document."

    chunks = doc_data["chunks"]
    doc_embeddings = doc_data["embeddings"]

    # 🔹 Normalize short questions (improves retrieval)
    if len(question.split()) < 5:
        question = question + " based on the document"

    # Embed question
    question_embedding = compute_embeddings([question])

    # Cosine similarity
    cos_scores = torch.mm(question_embedding, doc_embeddings.transpose(0, 1))[0]

    # 🔥 FILTERED RETRIEVAL (VERY IMPORTANT)
    top_k = min(3, len(chunks))
    threshold = 0.4

    filtered_indices = [
        i for i, score in enumerate(cos_scores)
        if score > threshold
    ]

    if not filtered_indices:
        filtered_indices = torch.topk(cos_scores, k=top_k).indices.tolist()
    else:
        filtered_indices = sorted(filtered_indices, key=lambda i: cos_scores[i], reverse=True)[:top_k]

    # Build clean context
    context_pieces = []
    for i, idx in enumerate(filtered_indices):
        context_pieces.append(f"[Extract {i+1}]:\n{chunks[idx]}")
    
    context = "\n\n".join(context_pieces)

    # 🔥 STRICT PROMPT (GLOBAL FIX)
    prompt = f"""
You are an expert AI assistant.

Answer the question using ONLY the provided context.

STRICT RULES:
- Answer ONLY what is asked. Do NOT include extra related topics.
- Keep the answer concise and to the point.
- Use bullet points for lists.
- Use a table ONLY if the question explicitly asks for comparison.
- Limit the answer to the most relevant 3–5 points.
- Do NOT explain beyond the question scope.
- Do NOT repeat information.
- If the answer is not in the context, say:
  "I don't have enough information to answer that based on the provided document."

Context Extracts:
{context}

Question:
{question}

Final Answer:
"""

    # 🔥 CONTROLLED OUTPUT LENGTH
    result = qa_pipeline(
        prompt,
        max_length=200,
        truncation=True,
        do_sample=False
    )

    return result[0]['generated_text']