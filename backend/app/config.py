import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    APP_NAME: str = "LeadSage AI Prospecting Engine"
    API_PREFIX: str = "/api"
    ENV: str = os.getenv("ENV", "development")
    FIREBASE_CREDENTIALS_PATH: str = os.getenv("FIREBASE_CREDENTIALS_PATH", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GOOGLE_MAPS_API_KEY: str = os.getenv("GOOGLE_MAPS_API_KEY", "")
    DEFAULT_USER_CREDITS: int = 500

    # E-mails com creditos ilimitados, separados por virgula.
    # O papel "admin" no Firestore continua valendo, mas some se o
    # documento do usuario for recriado (check_and_deduct_credits recria
    # com role="user"). Esta lista nao se perde.
    ADMIN_EMAILS: str = os.getenv("ADMIN_EMAILS", "")

    # Pagamentos. Enquanto PAYMENT_PROVIDER estiver vazio, a compra fica
    # indisponivel — o que e melhor do que conceder credito sem cobrar.
    PAYMENT_PROVIDER: str = os.getenv("PAYMENT_PROVIDER", "")
    PAYMENT_WEBHOOK_SECRET: str = os.getenv("PAYMENT_WEBHOOK_SECRET", "")
    MERCADOPAGO_TOKEN: str = os.getenv("MERCADOPAGO_TOKEN", "")
    # Para onde o comprador volta e onde o MP avisa o pagamento
    APP_URL: str = os.getenv("APP_URL", "https://leadsageofc.vercel.app")

    # Origens autorizadas do frontend, separadas por virgula.
    # Vazio mantem o comportamento permissivo antigo para nao quebrar
    # o dev local sem configuracao.
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "")
    
    # SMTP Settings
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASS: str = os.getenv("SMTP_PASS", "")
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", "")

    @property
    def admin_emails(self) -> set:
        return {e.strip().lower() for e in self.ADMIN_EMAILS.split(",") if e.strip()}

    @property
    def allowed_origins(self) -> list:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]


settings = Settings()
