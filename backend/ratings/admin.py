from django.contrib import admin

from .models import Rating


@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ('id', 'pickup_request', 'rater', 'ratee', 'score', 'created_at')
    list_filter = ('score',)
    search_fields = ('comment',)
    readonly_fields = ('created_at',)
