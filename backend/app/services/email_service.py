"""
Email service — wraps EmailProvider with template rendering.
Route handlers call EmailService, not the provider directly.
"""
import logging
from typing import Optional

from app.providers.email import EmailProvider
from app.repositories.audit_repository import AuditRepository
from app.models.audit import AuditLogCreate, AuditAction

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self, provider: EmailProvider, audit_repo: AuditRepository, default_from: str):
        self._provider = provider
        self._audit = audit_repo
        self._from = default_from

    async def send_request_acknowledgement(
        self, to: str, applicant_name: str, reference: str
    ) -> bool:
        subject = f"Your support request has been received — {reference}"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #051d38;">Swan Turbines Foundation</h2>
          <p>Dear {applicant_name},</p>
          <p>Thank you for reaching out to us. We have received your support request and our team will review it shortly.</p>
          <p><strong>Your Request Reference:</strong> <code style="background:#f0f4ff;padding:4px 8px;border-radius:4px;">{reference}</code></p>
          <p>Please save this reference number. You may need it if you contact us about your request.</p>
          <p>We typically review requests within 3–5 business days.</p>
          <br>
          <p>Warm regards,<br><strong>Swan Turbines Foundation</strong></p>
        </div>
        """
        success = await self._provider.send(to=to, subject=subject, html=html)
        await self._audit.log(AuditLogCreate(
            action=AuditAction.EMAIL_SENT if success else AuditAction.EMAIL_FAILED,
            result="success" if success else "failure",
            metadata={"type": "request_acknowledgement", "reference": reference, "to": to},
        ))
        return success

    async def send_admin_new_request_notification(
        self, admin_email: str, reference: str, support_type: str, urgency: str
    ) -> bool:
        subject = f"[New Request] {reference} — {urgency.upper()}"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #051d38;">New Help Request Received</h2>
          <table style="border-collapse:collapse;width:100%;">
            <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Reference</strong></td><td style="padding:8px;border:1px solid #ddd;">{reference}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Support Type</strong></td><td style="padding:8px;border:1px solid #ddd;">{support_type}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Urgency</strong></td><td style="padding:8px;border:1px solid #ddd;">{urgency}</td></tr>
          </table>
          <p>Log in to the admin panel to review this request.</p>
        </div>
        """
        success = await self._provider.send(to=admin_email, subject=subject, html=html)
        return success

    async def send_status_change_notification(
        self, to: str, applicant_name: str, reference: str, new_status: str, admin_note: Optional[str] = None
    ) -> bool:
        subject = f"Update on your request {reference}"
        note_html = f"<p><em>Note from our team:</em> {admin_note}</p>" if admin_note else ""
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #051d38;">Swan Turbines Foundation</h2>
          <p>Dear {applicant_name},</p>
          <p>The status of your request <strong>{reference}</strong> has been updated.</p>
          <p><strong>New Status:</strong> {new_status.replace("_", " ").title()}</p>
          {note_html}
          <p>Thank you for reaching out to us.</p>
          <br>
          <p>Warm regards,<br><strong>Swan Turbines Foundation</strong></p>
        </div>
        """
        success = await self._provider.send(to=to, subject=subject, html=html)
        return success

    async def send_contact_notification(
        self, admin_email: str, submitter_name: str, submitter_email: str, message: str
    ) -> bool:
        subject = f"New Contact Form Submission from {submitter_name}"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #051d38;">New Contact Submission</h2>
          <p><strong>From:</strong> {submitter_name} ({submitter_email})</p>
          <p><strong>Message:</strong></p>
          <blockquote style="border-left:4px solid #0066ff;padding-left:16px;margin:8px 0;">{message}</blockquote>
        </div>
        """
        return await self._provider.send(to=admin_email, subject=subject, html=html)

    async def send_custom_to_applicant(
        self, to: str, subject: str, message_html: str, sender_name: str
    ) -> bool:
        """Admin-initiated custom email to an applicant."""
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #051d38;">Swan Turbines Foundation</h2>
          {message_html}
          <br>
          <p>Sent by: <strong>{sender_name}</strong><br>Swan Turbines Foundation</p>
        </div>
        """
        success = await self._provider.send(to=to, subject=subject, html=html)
        await self._audit.log(AuditLogCreate(
            action=AuditAction.EMAIL_SENT if success else AuditAction.EMAIL_FAILED,
            result="success" if success else "failure",
            metadata={"type": "admin_to_applicant", "to": to, "subject": subject},
        ))
        return success
