import logging
from datetime import timedelta

from django.utils import timezone

from .models import Prediction, PriceQuote

logger = logging.getLogger(__name__)


def record_prediction(task, model_version, output, user=None, input_ref='', confidence=None):
    """
    Write one Prediction row. Swallows its own errors rather than raising -
    a logging failure must never break the feature that produced the
    prediction in the first place (the waste analysis, the price estimate,
    whatever it is). Called fire-and-forget from the call sites themselves;
    there's no request volume yet that would justify a task queue for this.
    """
    try:
        Prediction.objects.create(
            task=task,
            model_version=model_version,
            output=output,
            user=user,
            input_ref=input_ref or '',
            confidence=confidence,
        )
    except Exception as e:
        logger.warning(f"Could not record AI prediction ({task}/{model_version}): {e}")


def record_price_quote(*, user, lat, lon, distance_km, duration_min, used_real_route,
                        online_collector_count, pending_job_count, demand_multiplier, quoted_price,
                        straight_line_km=None):
    """
    Write one PriceQuote row from estimate_price(). Same fire-and-forget,
    swallow-your-own-errors contract as record_prediction - a logging
    failure must never break the actual price estimate being returned.
    """
    try:
        PriceQuote.objects.create(
            user=user,
            pickup_lat=lat,
            pickup_lon=lon,
            distance_km=distance_km,
            straight_line_km=straight_line_km,
            duration_min=duration_min,
            used_real_route=used_real_route,
            online_collector_count=online_collector_count,
            pending_job_count=pending_job_count,
            demand_multiplier=demand_multiplier,
            quoted_price=quoted_price,
        )
    except Exception as e:
        logger.warning(f"Could not record price quote: {e}")


def link_price_quote_to_request(user, pickup_request, window_minutes=30):
    """
    Best-effort match: the most recent unbooked quote this user got in the
    last `window_minutes`, if any. There's no quote id passed through the
    create-request flow to link on exactly, and adding one would mean a
    mobile app change just to make logging slightly more precise - a time
    window on the same user is a close enough proxy, since a disposer
    normally requests a quote and then books within a couple of minutes of
    seeing it, not half an hour later. Swallows its own errors for the same
    reason as record_price_quote - never break request creation over this.
    """
    try:
        cutoff = timezone.now() - timedelta(minutes=window_minutes)
        quote = (
            PriceQuote.objects
            .filter(user=user, pickup_request__isnull=True, created_at__gte=cutoff)
            .order_by('-created_at')
            .first()
        )
        if quote:
            quote.pickup_request = pickup_request
            quote.save(update_fields=['pickup_request'])
    except Exception as e:
        logger.warning(f"Could not link price quote to pickup request {pickup_request.id}: {e}")


def link_prediction_to_request(user, pickup_request, window_minutes=30):
    """
    Attach the most recent unlinked waste_analysis this user ran to the
    request they just created, and record whether they kept the material the
    model suggested.

    Same best-effort time-window match, and the same reasoning, as
    link_price_quote_to_request: no analysis id travels through the create
    flow, and adding one would mean a mobile app change purely to make
    logging exact. A disposer photographs a load and submits it within a
    minute or two, so same-user-within-the-window is a close enough proxy.

    The material comparison is deliberately asymmetric. A user who changes
    the material is telling us the model was wrong - that is a correction,
    and worth recording as one. A user who leaves it alone may have checked
    it or may simply have tapped through, so it is recorded but never
    counted as confirmation.
    """
    try:
        from datetime import timedelta

        from .models import Prediction, PredictionFeedback

        cutoff = timezone.now() - timedelta(minutes=window_minutes)
        prediction = (
            Prediction.objects
            .filter(
                user=user, task='waste_analysis',
                pickup_request__isnull=True, created_at__gte=cutoff,
            )
            .order_by('-created_at')
            .first()
        )
        if not prediction:
            return

        prediction.pickup_request = pickup_request
        prediction.save(update_fields=['pickup_request'])

        predicted_material = (prediction.output or {}).get('material_type') or ''
        actual_material = pickup_request.material_type or ''
        if not predicted_material or not actual_material:
            return

        PredictionFeedback.objects.create(
            prediction=prediction,
            source='user_override',
            predicted_material=predicted_material.upper(),
            actual_material=actual_material.upper(),
            is_correction=predicted_material.upper() != actual_material.upper(),
        )
    except Exception as e:
        logger.warning(f"Could not link prediction to pickup request {pickup_request.id}: {e}")


def record_weight_feedback(pickup_request, actual_weight_kg, source='scale'):
    """
    Record what a load actually weighed against what the analysis predicted.

    Called from the verification flow, where a collector puts the load on a
    scale - the first point in the whole app where a model output meets a
    measurement. Silent when there is no linked prediction to compare
    against, which is most of them until link_prediction_to_request has been
    running for a while.
    """
    try:
        from .models import PredictionFeedback

        prediction = (
            pickup_request.predictions
            .filter(task='waste_analysis')
            .order_by('-created_at')
            .first()
        )
        if not prediction or not actual_weight_kg:
            return

        predicted = (prediction.output or {}).get('suggested_weight_kg')
        if not predicted:
            return

        PredictionFeedback.objects.create(
            prediction=prediction,
            source=source,
            predicted_material=((prediction.output or {}).get('material_type') or '').upper(),
            actual_material=(pickup_request.material_type or '').upper(),
            predicted_weight_kg=float(predicted),
            actual_weight_kg=float(actual_weight_kg),
        )
    except Exception as e:
        logger.warning(f"Could not record weight feedback for pickup {pickup_request.id}: {e}")
