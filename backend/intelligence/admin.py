from django.contrib import admin

from .models import CollectorPerformanceSnapshot, MarketSurveyResponse, Prediction


@admin.register(Prediction)
class PredictionAdmin(admin.ModelAdmin):
    list_display = ('id', 'task', 'model_version', 'confidence', 'user', 'created_at')
    list_filter = ('task', 'model_version')
    search_fields = ('input_ref',)
    readonly_fields = ('created_at',)


@admin.register(CollectorPerformanceSnapshot)
class CollectorPerformanceSnapshotAdmin(admin.ModelAdmin):
    list_display = ('date', 'collector', 'jobs_accepted', 'jobs_completed', 'jobs_cancelled', 'avg_rating')
    list_filter = ('date',)


@admin.register(MarketSurveyResponse)
class MarketSurveyResponseAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'area', 'role', 'price_now_ghs', 'anchor30_reaction',
        'min_payout_range', 'track_a_fee_range', 'source', 'submitted_at',
    )
    list_filter = ('source', 'role', 'anchor30_reaction', 'pricing_structure_pref')
    search_fields = ('area', 'external_id', 'open_feedback')
    readonly_fields = ('external_id', 'source', 'raw_answers', 'imported_at')
