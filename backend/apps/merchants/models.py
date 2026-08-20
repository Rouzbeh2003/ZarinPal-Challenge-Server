from django.conf import settings
from django.db import models


class Merchant(models.Model):
    merchant_key = models.CharField(max_length=64, unique=True)
    category_id = models.CharField(max_length=32, blank=True)
    category_title = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return self.merchant_key


class MerchantMembership(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name="memberships")
    is_admin = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "merchant"], name="unique_user_merchant")
        ]
