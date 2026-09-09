from django.contrib import admin

from .models import (
    CollectorPerformanceSnapshot,
    MaterialBuybackPrice,
    MarketSurveyResponse,
    Prediction,
    PriceQuote,
)


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


@admin.register(PriceQuote)
class PriceQuoteAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'user', 'quoted_price', 'distance_km', 'demand_multiplier',
        'used_real_route', 'pickup_request', 'created_at',
    )
    list_filter = ('used_real_route', 'created_at')
    readonly_fields = ('created_at',)


@admin.register(MaterialBuybackPrice)
class MaterialBuybackPriceAdmin(admin.ModelAdmin):
    list_display = ('label', 'material_type', 'price_per_kg', 'captured_at', 'source')
    list_filter = ('source', 'captured_at', 'material_type')
    search_fields = ('label', 'material_type', 'source_note')
    readonly_fields = ('created_at',)
