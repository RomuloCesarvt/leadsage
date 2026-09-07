import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# O app empacotado (Capacitor) nao roda em https://<dominio>: o conteudo
# vem do proprio pacote, com esquema proprio. Android usa https://localhost,
# iOS usa capacitor://localhost, e ionic:// aparece em versoes mais antigas.
ORIGENS_NATIVAS = ("capacitor://localhost", "ionic://localhost", "https://localhost")


class Settings(BaseModel):
    APP_NAME: str = "LeadSage AI Prospecting Engine"
    API_PREFIX: str = "/api"
    ENV: str = os.getenv("ENV", "development")
    FIREBASE_CREDENTIALS_PATH: str = os.getenv("FIREBASE_CREDENTIALS_PATH", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GOOGLE_MAPS_API_KEY: str = os.getenv("GOOGLE_MAPS_API_KEY", "")
    DEFAULT_USER_CREDITS: int = 500

    # Sem Firestore o sistema nao tem onde contar credito. O padrao era
    # liberar ilimitado "para dev local" — mas e o mesmo codigo que roda
    # em producao, entao uma credencial errada num deploy transformava o
    # produto em gratuito, gastando a cota paga do Google Places em
    # silencio. Agora recusar e o padrao, e liberar exige dizer isso em
    # voz alta.
    CREDITO_SEM_BANCO: bool = os.getenv("LEADSAGE_CREDITO_SEM_BANCO", "") == "1"

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
        """Origens autorizadas a chamar a API.

        As origens nativas entram sempre que a lista e restrita: dentro do
        app empacotado o conteudo e servido de capacitor://localhost, e sem
        elas o app instalado tomaria erro de CORS em toda chamada — falha
        que so aparece no aparelho, nunca no navegador.

        Nao ha risco em liberar essas tres: nenhuma pagina web consegue ter
        esses esquemas como origem.
        """
        listadas = [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]
        return (listadas + list(ORIGENS_NATIVAS)) if listadas else []


settings = Settings()
