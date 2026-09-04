from django.contrib.auth import get_user_model
from rest_framework import serializers

from users.serializers import PublicUserSerializer
from .models import BlockedUser, Report

User = get_user_model()


class BlockedUserSerializer(serializers.ModelSerializer):
    """A row in the user's own "Blocked accounts" list."""
    user = PublicUserSerializer(source='blocked', read_only=True)

    class Meta:
        model = BlockedUser
        fields = ('id', 'user', 'created_at')
        read_only_fields = fields


class BlockUserSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()

    def validate_user_id(self, value):
        request = self.context['request']
        if value == request.user.id:
            raise serializers.ValidationError("You can't block yourself.")
        if not User.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("User not found.")
        return value


class ReportCreateSerializer(serializers.ModelSerializer):
    """
    Accepts a report against a user, a listing, or a chat message. The target
    id is validated against `target_type` so a client can't file a report that
    points at nothing.
    """
    target_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Report
        fields = ('id', 'target_type', 'target_id', 'reason', 'details', 'created_at')
        read_only_fields = ('id', 'created_at')

    def validate(self, attrs):
        request = self.context['request']
        target_type = attrs['target_type']
        target_id = attrs.pop('target_id')

        if target_type == Report.Target.USER:
            target = User.objects.filter(id=target_id).first()
            if not target:
                raise serializers.ValidationError({'target_id': 'User not found.'})
            if target == request.user:
                raise serializers.ValidationError({'target_id': "You can't report yourself."})
            attrs['reported_user'] = target
            attrs['content_snapshot'] = f"@{target.username}"

        elif target_type == Report.Target.LISTING:
            from market.models import Listing
            listing = Listing.objects.select_related('seller').filter(id=target_id).first()
            if not listing:
                raise serializers.ValidationError({'target_id': 'Listing not found.'})
            attrs['listing'] = listing
            attrs['reported_user'] = listing.seller
            attrs['content_snapshot'] = f"{listing.title}\n\n{listing.description}"[:2000]

        elif target_type == Report.Target.MESSAGE:
            from chat.models import Message
            message = Message.objects.select_related('sender', 'receiver').filter(id=target_id).first()
            if not message:
                raise serializers.ValidationError({'target_id': 'Message not found.'})
            # Only a participant can report a message - otherwise anyone who
            # guesses an id could pull other people's private chat content
            # into a report they're allowed to read back.
            if request.user not in (message.sender, message.receiver):
                raise serializers.ValidationError({'target_id': 'Message not found.'})
            if message.sender == request.user:
                raise serializers.ValidationError({'target_id': "You can't report your own message."})
            attrs['message'] = message
            attrs['reported_user'] = message.sender
            attrs['content_snapshot'] = (message.content or '')[:2000]

        return attrs

    def create(self, validated_data):
        return Report.objects.create(reporter=self.context['request'].user, **validated_data)


class ReportSerializer(serializers.ModelSerializer):
    """Read-only view of a report, for the reporter's own history."""
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Report
        fields = (
            'id', 'target_type', 'reason', 'reason_display',
            'details', 'status', 'status_display', 'created_at'
        )
        read_only_fields = fields
