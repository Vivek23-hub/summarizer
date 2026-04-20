from transformers import pipeline

class SummarizerModel:
    def __init__(self):
        print("Initializing summarizer...")

        # Lazy-load heavy models on first request.
        self.model = None
        self.google_model = None

    def _get_default_model(self):
        if self.model is None:
            print("Loading default summarization model...")
            self.model = pipeline(
                "summarization",
                model="facebook/bart-large-cnn"
            )
        return self.model

    def _get_google_model(self):
        if self.google_model is None:
            self.google_model = pipeline(
                "summarization",
                model="google/pegasus-xsum"
            )
        return self.google_model

    def summarize(self, text, mode="balanced", max_length=None):
        if mode == "google":
            selected_model = self._get_google_model()
            default_max = 120
            default_min = 40
        else:
            selected_model = self._get_default_model()
            default_max = 80
            default_min = 30

        if max_length is None:
            max_len = default_max
            min_len = default_min
        else:
            max_len = max_length
            min_len = max(10, max_length // 4)

        return self._run(selected_model, text, max_len, min_len)

    def _run(self, model, text, max_len, min_len):
        result = model(
            text,
            max_length=max_len,
            min_length=min_len,
            do_sample=False
        )
        return result[0]["summary_text"]


model_instance = SummarizerModel()


# from transformers import pipeline

# class SummarizerModel:
#     def __init__(self):
#         print("Loading model...")

#         # Only lightweight model
#         self.model = pipeline(
#             "summarization",
#             model="t5-small"
#         )

#     def summarize(self, text, max_length=80):
#         min_length = max(10, max_length // 4)

#         result = self.model(
#             text,
#             max_length=max_length,
#             min_length=min_length,
#             do_sample=False
#         )

#         return result[0]["summary_text"]


# model_instance = SummarizerModel()