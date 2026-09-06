"""
Rule-based collector/job matching. Revesta's job board is pull, not push -
a collector opens the board and sees nearby PENDING jobs themselves, rather
than the system offering a job to one chosen collector - so the one factor
below that actually varies job-to-job for a single collector's board is
proximity. The collector-side factors (acceptance/completion rate, rating,
workload) are constant across every job on that same collector's board, so
they can't reorder anything there today; they're included so this same
function is ready to rank collectors directly the moment Revesta ever moves
toward offering a job to a specific collector instead of broadcasting it.
"""

PROXIMITY_MAX_KM = 15  # beyond this, proximity contributes ~nothing


def match_score(distance_km=None, acceptance_rate=None, completion_rate=None,
                 avg_rating=None, active_jobs=0, capacity=3):
    """
    Returns a 0..1 score, higher is better. Every stat defaults to a
    neutral 0.5 when unknown (a brand new collector isn't penalized for
    having no history yet), except distance, which is unknowable and
    scored as 0 (worst) if truly missing - a job's location is basic
    information, not a gap worth being generous about.
    """
    if distance_km is None:
        proximity = 0.0
    else:
        proximity = max(0.0, 1 - (distance_km / PROXIMITY_MAX_KM))

    acceptance = 0.5 if acceptance_rate is None else acceptance_rate
    completion = 0.5 if completion_rate is None else completion_rate
    rating = 0.5 if avg_rating is None else min(1.0, avg_rating / 5)
    availability = max(0.0, 1 - min(1.0, active_jobs / capacity)) if capacity else 0.0

    return (
        0.30 * proximity +
        0.20 * acceptance +
        0.20 * completion +
        0.20 * rating +
        0.10 * availability
    )
