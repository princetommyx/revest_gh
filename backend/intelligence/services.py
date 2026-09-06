import logging

from .models import Prediction

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
