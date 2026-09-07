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


class CollectorPerformanceSnapshot(models.Model):
    """
    One row per collector per day, written by
    intelligence.rollup_collector_performance. A pre-aggregated rollup so a
    future matching model can train on daily activity without recomputing
    it from raw PickupRequest rows every time - and so trends over time
    (is this collector's completion rate improving or slipping?) are
    actually queryable instead of only ever knowing "right now."
    """

    date = models.DateField(db_index=True)
    collector = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='performance_snapshots'
    )
    jobs_accepted = models.PositiveIntegerField(default=0)
    jobs_completed = models.PositiveIntegerField(default=0)
    jobs_cancelled = models.PositiveIntegerField(default=0)
    avg_rating = models.FloatField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['date', 'collector'], name='one_snapshot_per_collector_per_day')
        ]
        ordering = ['-date']

    def __str__(self):
        return f"{self.collector_id} @ {self.date}: {self.jobs_completed} completed"


class MarketSurveyResponse(models.Model):
    """
    One row per "what should your waste pay you?" willingness-to-pay/accept
    survey submission (collected via Formasty). This is real signal from
    actual disposers about what they'd expect to be paid or charged - the
    thing the rule-based pricing in logistics/pricing.py and
    market/models.py::MaterialMarketPrice was only ever guessing at with
    fallback constants.

    Deliberately its own table rather than writing straight into
    MaterialMarketPrice: a handful of survey answers should inform pricing
    once there's enough of them to be signal rather than noise, not
    silently become the live price the moment they're imported.
    """

    external_id = models.CharField(max_length=120, unique=True)  # source submission id - keeps re-imports idempotent
    source = models.CharField(max_length=30, default='formasty')

    role = models.CharField(max_length=30, blank=True)  # e.g. "household"
    materials = models.JSONField(default=list)  # material keys they have to give out
    area = models.CharField(max_length=120, blank=True)

    current_disposal = models.CharField(max_length=50, blank=True)  # what happens to their waste today
    price_now_ghs = models.FloatField(null=True, blank=True)  # self-reported GHS earned today for a sack of rubbers
    anchor30_reaction = models.CharField(max_length=30, blank=True)  # reaction to a GHS30/sack anchor offer
    min_payout_range = models.CharField(max_length=30, blank=True)  # smallest GHS that would get a collector called
    pricing_structure_pref = models.CharField(max_length=30, blank=True)  # flat vs weighed vs "whichever pays more"
    weighing_trust = models.CharField(max_length=30, blank=True)
    payment_pref = models.CharField(max_length=30, blank=True)
    track_a_fee_range = models.CharField(max_length=30, blank=True)  # GHS they'd pay to have mixed waste hauled away

    volume = models.JSONField(default=dict)  # per-material weekly volume buckets
    ewaste_expectations = models.JSONField(default=dict)  # expected GHS range per e-waste item type
    open_feedback = models.TextField(blank=True)

    raw_answers = models.JSONField(default=dict)  # full column values from the source, for anything not modeled above

    submitted_at = models.DateTimeField()
    imported_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return f"{self.role or 'response'} in {self.area or '?'} @ {self.submitted_at:%Y-%m-%d}"
