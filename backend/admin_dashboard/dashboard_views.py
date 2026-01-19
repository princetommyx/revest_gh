from django.views.generic import TemplateView
from django.contrib.auth.mixins import UserPassesTestMixin

class AdminDashboardView(UserPassesTestMixin, TemplateView):
    """
    Serves the Bootstrap admin dashboard HTML.
    Only accessible to staff users (admin).
    """
    template_name = 'index.html'  # Will be served from staticfiles
    
    def test_func(self):
        # Only allow staff/admin users
        return self.request.user.is_authenticated and (self.request.user.is_staff or self.request.user.is_superuser)
    
    def handle_no_permission(self):
        # Redirect to API login page if not admin
        from django.shortcuts import redirect
        return redirect('/dashboard/login.html')
