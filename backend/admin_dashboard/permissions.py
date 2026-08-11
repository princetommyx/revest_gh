from rest_framework import permissions


class IsAdminUser(permissions.BasePermission):
    """
    Permission class that only allows admin users (staff or superuser) to access.
    """
    message = 'You must be an admin to access this resource.'
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            (request.user.is_staff or request.user.is_superuser)
        )


class IsSuperAdmin(permissions.BasePermission):
    """
    Permission class for superuser-only actions.
    """
    message = 'You must be a superuser to perform this action.'
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.is_superuser
        )
