from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsHRorReadOnly(BasePermission):
    """
    - Anyone authenticated can READ (GET)
    - Only HR users can CREATE / UPDATE / DELETE
    """

    def has_permission(self, request, view):
        # Allow read-only requests
        if request.method in SAFE_METHODS:
            return True

        # Only HR can modify
        return request.user.is_authenticated and request.user.is_hr