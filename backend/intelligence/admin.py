from django.contrib import admin

from .models import CollectorPerformanceSnapshot, Prediction


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
