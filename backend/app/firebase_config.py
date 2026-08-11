import os
import firebase_admin
from firebase_admin import credentials, auth, firestore
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

# Initialize Firebase Admin
# Expects GOOGLE_APPLICATION_CREDENTIALS in env for default service account, 
# or a specific dict/path. For Vercel/Render, we usually use an env var with a JSON string or path.
def init_firebase():
    if not firebase_admin._apps:
        try:
            # Em produção, usaremos as variáveis de ambiente
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred)
        except Exception as e:
            # Fallback para desenvolvimento local se não tiver credencial
            print(f"Aviso: Firebase Admin falhou ao inicializar com AppDefault. Erro: {e}")
            try:
                # Tenta inicializar sem credenciais (só vai funcionar pra verificar token localmente sem Firestore)
                firebase_admin.initialize_app()
            except:
                pass

db = None
try:
    init_firebase()
    db = firestore.client()
except:
    pass

async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """FastAPI Dependency to verify Firebase JWT Token"""
    token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid or expired token: {str(e)}")

async def get_current_user(token: dict = Depends(verify_token)):
    """Returns the user dictionary from the decoded token"""
    return token
