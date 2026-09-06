from django.contrib import admin

from .models import Prediction


@admin.register(Prediction)
class PredictionAdmin(admin.ModelAdmin):
    list_display = ('id', 'task', 'model_version', 'confidence', 'user', 'created_at')
    list_filter = ('task', 'model_version')
    search_fields = ('input_ref',)
    readonly_fields = ('created_at',)
