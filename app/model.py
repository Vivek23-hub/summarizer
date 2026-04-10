from transformers import pipeline

class SummarizerModel:
    def __init__(self):
        print("Loading models...")

        # Fast (lightweight)
        self.fast_model = pipeline(
            "summarization",
            model="t5-small"
        )

        # Keep balanced/accurate aliases available even when heavier models
        # are disabled, so API requests using those modes do not crash.
        self.medium_model = self.fast_model
        self.quality_model = self.fast_model

    def summarize(self, text, mode="balanced", max_length=None):
        if max_length is None:
            if mode == "fast":
                max_length = 30
            elif mode == "accurate":
                max_length = 120
            else:
                max_length = 80
        
        min_length = max(10, max_length // 4)

        if mode == "fast":
            return self._run(self.fast_model, text, max_length, min_length)

        elif mode == "accurate":
            return self._run(self.quality_model, text, max_length, min_length)

        else:  # balanced
            return self._run(self.medium_model, text, max_length, min_length)

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