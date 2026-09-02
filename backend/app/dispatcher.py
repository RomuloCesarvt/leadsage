import uuid
import aiosmtplib
from email.message import EmailMessage
from datetime import datetime
from app.models import DispatchRequest, DispatchResponse
from app.config import settings

class OutreachDispatcher:
    @staticmethod
    async def dispatch_message(req: DispatchRequest, current_credits: int) -> tuple[DispatchResponse, int]:
        dispatch_cost = 2
        if current_credits < dispatch_cost:
            raise ValueError("Créditos insuficientes para realizar o disparo automatizado.")

        remaining = current_credits - dispatch_cost
        dispatch_id = f"disp_{uuid.uuid4().hex[:10]}"
        now_iso = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Send Real Email if channel is email
        if req.channel == "email":
            try:
                message = EmailMessage()
                message["From"] = settings.FROM_EMAIL or "no-reply@leadsage.ai"
                message["To"] = req.lead_email
                message["Subject"] = req.subject or "Contato Prospecção"
                message.set_content(req.body)
                
                # Setup SMTP
                smtp_host = settings.SMTP_HOST
                smtp_port = settings.SMTP_PORT
                smtp_user = settings.SMTP_USER
                smtp_pass = settings.SMTP_PASS
                
                if smtp_user and smtp_pass:
                    await aiosmtplib.send(
                        message,
                        hostname=smtp_host,
                        port=smtp_port,
                        start_tls=True,
                        username=smtp_user,
                        password=smtp_pass
                    )
                    status_text = "Enviado via SMTP (Sucesso)"
                else:
                    # Se não houver credencial configurada, ainda simula para não quebrar.
                    status_text = "Simulado (Credenciais SMTP ausentes)"
            except Exception as e:
                status_text = f"Erro no Envio: {str(e)}"
        elif req.channel == "instagram_direct":
            status_text = "Enviado via Instagram Direct Bot (Simulado)"
        elif req.channel == "linkedin_msg":
            status_text = "Enviado via InMail LinkedIn API (Simulado)"
        else:
            status_text = "Enviado via Webhook Integration (Simulado)"

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
