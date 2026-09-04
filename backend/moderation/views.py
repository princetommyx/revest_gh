import logging

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from rest_framework import permissions, status, views, viewsets, mixins
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view

from .models import BlockedUser, Report
from .serializers import (
    BlockedUserSerializer, BlockUserSerializer,
    ReportCreateSerializer, ReportSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)


@extend_schema(tags=['moderation'])
class BlockedUserViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """The accounts the current user has blocked."""
    serializer_class = BlockedUserSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return BlockedUser.objects.filter(
            blocker=self.request.user
        ).select_related('blocked')


@extend_schema(
    tags=['moderation'],
    summary="Block a user",
    request=BlockUserSerializer,
)
class BlockUserView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = BlockUserSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        target_id = serializer.validated_data['user_id']

        try:
            BlockedUser.objects.get_or_create(blocker=request.user, blocked_id=target_id)
        except IntegrityError:
            # Raced with a duplicate request; the block exists either way.
            pass

        logger.info(f"User {request.user.id} blocked user {target_id}")
        return Response({'status': 'success', 'message': 'User blocked.'})


@extend_schema(
    tags=['moderation'],
    summary="Unblock a user",
)
class UnblockUserView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, user_id):
        deleted, _ = BlockedUser.objects.filter(
            blocker=request.user, blocked_id=user_id
        ).delete()
        if not deleted:
            return Response(
                {'detail': 'That user is not blocked.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        logger.info(f"User {request.user.id} unblocked user {user_id}")
        return Response({'status': 'success', 'message': 'User unblocked.'})


@extend_schema(tags=['moderation'])
@extend_schema_view(
    create=extend_schema(summary="Report a user, listing or message"),
    list=extend_schema(summary="Reports you have filed"),
)
class ReportViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        # A reporter only ever sees their own reports - never anyone else's,
        # and never the moderator notes.
        return Report.objects.filter(reporter=self.request.user)

    def get_serializer_class(self):
        return ReportCreateSerializer if self.action == 'create' else ReportSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = serializer.save()

        logger.info(
            f"Report #{report.id} filed by user {request.user.id}: "
            f"{report.target_type} / {report.reason}"
        )
        return Response(
            {
                'status': 'success',
                'message': 'Thanks for reporting. Our team will review this.',
                'report': ReportSerializer(report).data,
            },
            status=status.HTTP_201_CREATED,
        )
