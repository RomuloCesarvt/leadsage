import uuid
from datetime import datetime
from app.models import DispatchRequest, DispatchResponse

class OutreachDispatcher:
    @staticmethod
    def dispatch_message(req: DispatchRequest, current_credits: int) -> tuple[DispatchResponse, int]:
        dispatch_cost = 2
        if current_credits < dispatch_cost:
            raise ValueError("Créditos insuficientes para realizar o disparo automatizado.")

        remaining = current_credits - dispatch_cost
        dispatch_id = f"disp_{uuid.uuid4().hex[:10]}"
        now_iso = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Channel specific simulation details
        if req.channel == "email":
            status_text = "Enviado via SMTP / Snov.io API"
        elif req.channel == "instagram_direct":
            status_text = "Enviado via Instagram Direct Bot"
        elif req.channel == "linkedin_msg":
            status_text = "Enviado via InMail LinkedIn API"
        else:
            status_text = "Enviado via Webhook Integration"

        preview = f"[{req.channel.upper()}] Para: {req.lead_email} | Assunto: {req.subject or 'Contato Prospecção'}"

        response = DispatchResponse(
            dispatch_id=dispatch_id,
            lead_id=req.lead_id,
            channel=req.channel,
            status=status_text,
            delivered_at=now_iso,
            credits_consumed=dispatch_cost,
            remaining_credits=remaining,
            message_preview=preview
        )

        return response, remaining
