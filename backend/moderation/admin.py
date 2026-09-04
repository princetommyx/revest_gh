from django.contrib import admin
from django.utils import timezone

from .models import BlockedUser, Report


@admin.register(BlockedUser)
class BlockedUserAdmin(admin.ModelAdmin):
    list_display = ('blocker', 'blocked', 'created_at')
    search_fields = ('blocker__username', 'blocked__username')
    raw_id_fields = ('blocker', 'blocked')


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'target_type', 'reason', 'reporter', 'reported_user', 'status', 'created_at'
    )
    list_filter = ('status', 'target_type', 'reason', 'created_at')
    search_fields = (
        'reporter__username', 'reported_user__username', 'details', 'content_snapshot'
    )
    raw_id_fields = ('reporter', 'reported_user', 'listing', 'message', 'reviewed_by')
    readonly_fields = (
        'reporter', 'target_type', 'reported_user', 'listing', 'message',
        'reason', 'details', 'content_snapshot', 'created_at',
    )
    actions = ('mark_reviewed', 'mark_actioned', 'mark_dismissed')

    def _set_status(self, request, queryset, new_status, label):
        updated = queryset.update(
            status=new_status, reviewed_by=request.user, reviewed_at=timezone.now()
        )
        self.message_user(request, f"{updated} report(s) marked as {label}.")

    @admin.action(description="Mark as reviewed - no action")
    def mark_reviewed(self, request, queryset):
        self._set_status(request, queryset, Report.Status.REVIEWED, 'reviewed')

    @admin.action(description="Mark as actioned")
    def mark_actioned(self, request, queryset):
        self._set_status(request, queryset, Report.Status.ACTIONED, 'actioned')

    @admin.action(description="Dismiss")
    def mark_dismissed(self, request, queryset):
        self._set_status(request, queryset, Report.Status.DISMISSED, 'dismissed')
