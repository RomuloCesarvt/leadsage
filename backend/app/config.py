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

    # "1": os dados (perfil, creditos, funil, conversas, sites) ficam no banco SQL
    # (DATABASE_URL, por exemplo o Supabase) e o Firestore nao e usado. O login
    # continua sendo o do Firebase.
    FIRESTORE_DESLIGADO: bool = os.getenv("FIRESTORE_DESLIGADO", "") == "1"

    # E-mails com creditos ilimitados, separados por virgula.
    # O papel "admin" no Firestore continua valendo, mas some se o
    # documento do usuario for recriado (check_and_deduct_credits recria
    # com role="user"). Esta lista nao se perde.
    ADMIN_EMAILS: str = os.getenv("ADMIN_EMAILS", "")
    # Contas que usam o sistema sem ver a area de assinatura e compra de creditos.
    HIDE_SUBSCRIPTION_EMAILS: str = os.getenv("HIDE_SUBSCRIPTION_EMAILS", "")

    # Pagamentos. Enquanto PAYMENT_PROVIDER estiver vazio, a compra fica
    # indisponivel — o que e melhor do que conceder credito sem cobrar.
    PAYMENT_PROVIDER: str = os.getenv("PAYMENT_PROVIDER", "")
    PAYMENT_WEBHOOK_SECRET: str = os.getenv("PAYMENT_WEBHOOK_SECRET", "")
    MERCADOPAGO_TOKEN: str = os.getenv("MERCADOPAGO_TOKEN", "")
    # Para onde o comprador volta e onde o MP avisa o pagamento
    APP_URL: str = os.getenv("APP_URL", "https://leadsageofc.vercel.app")

    # App da Meta do LeadSage. Com ele, o cliente conecta pagina,
    # Instagram e WhatsApp com um clique ("Conectar com Facebook"), sem
    # criar app proprio — como no ManyChat. Vazio: so o modo manual.
    META_APP_ID: str = os.getenv("META_APP_ID", "")
    META_APP_SECRET: str = os.getenv("META_APP_SECRET", "")
    META_VERIFY_TOKEN: str = os.getenv("META_VERIFY_TOKEN", "")
    # Configuracao do Embedded Signup do WhatsApp (Facebook Login for
    # Business). Sem ela, o botao do WhatsApp nao aparece.
    META_WA_CONFIG_ID: str = os.getenv("META_WA_CONFIG_ID", "")
    # Configuracao do "Login do Facebook para Empresas" (Messenger e Instagram).
    # Apps do tipo Empresa nao aceitam `scope` na URL: as permissoes vem dela.
    META_LOGIN_CONFIG_ID: str = os.getenv("META_LOGIN_CONFIG_ID", "")

    # Banco de imagens dos sites. Sem chave, usa Openverse/StockSnap
    # (gratuito, ate 960 px); com chave gratuita do Pexels, alta resolucao.
    PEXELS_API_KEY: str = os.getenv("PEXELS_API_KEY", "")

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
    def sem_assinatura_emails(self) -> set:
        return {e.strip().lower() for e in self.HIDE_SUBSCRIPTION_EMAILS.split(",") if e.strip()}

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
