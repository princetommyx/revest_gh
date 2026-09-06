from django.conf import settings
from django.db import models


class Prediction(models.Model):
    """
    One row per AI call, regardless of which model answered it. This is the
    whole point: a prediction that isn't logged here can't become training
    data later, no matter how good it turns out to have been - there's
    nothing to look back at once the moment has passed.

    Deliberately doesn't store the actual result yet (that's
    PredictionFeedback, added once something in the app actually verifies a
    prediction against reality - a collector confirming a scale weight, a
    recycler grading material). This table alone is enough to start seeing
    how often the AI runs, how confident it is, and how often it falls back.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ai_predictions',
    )

    # e.g. "waste_analysis" - the kind of prediction, not the model that made
    # it. Lets every future AI call site (pricing, matching, ...) share this
    # one table instead of each growing its own.
    task = models.CharField(max_length=50, db_index=True)

    # e.g. "gemini-flash-latest", "gemini-2.0-flash", or "simulation-fallback"
    # when no model actually ran. Never blank - a prediction with no known
    # origin can't be trusted or compared against anything.
    model_version = models.CharField(max_length=100)

    # A pointer to what was analyzed (e.g. the uploaded image's storage
    # path), not the file itself - the file already lives wherever the
    # feature that triggered this stored it.
    input_ref = models.CharField(max_length=255, blank=True)

    output = models.JSONField()
    confidence = models.FloatField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.task} ({self.model_version}) @ {self.created_at:%Y-%m-%d %H:%M}"
