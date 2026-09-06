from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Rating(models.Model):
    """
    One rating per (job, rater) - a provider rating their collector or a
    collector rating their provider on a completed pickup. The mobile app
    only ever triggers the provider->collector direction today (see
    RatingModal), but the model and endpoint don't assume that - nothing
    here needs to change to support the other direction later.
    """

    pickup_request = models.ForeignKey(
        'logistics.PickupRequest', on_delete=models.CASCADE, related_name='ratings'
    )
    rater = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ratings_given'
    )
    ratee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ratings_received'
    )
    score = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['pickup_request', 'rater'], name='one_rating_per_job_per_rater')
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.rater_id} rated {self.ratee_id} {self.score}/5 on job {self.pickup_request_id}"
