import os
import json
import firebase_admin
from firebase_admin import credentials, auth, firestore
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

def init_firebase():
    """Initialize Firebase Admin SDK.
    
    Supports 3 modes (in order of priority):
    1. FIREBASE_SERVICE_ACCOUNT_JSON env var (JSON string) — ideal for Render/Railway
    2. GOOGLE_APPLICATION_CREDENTIALS env var (file path) — Google Cloud default
    3. No credentials (limited functionality for local dev)
    """
    if not firebase_admin._apps:
        # Mode 1: JSON string in env var (best for cloud hosting)
        sa_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "")
        if sa_json:
            try:
                sa_dict = json.loads(sa_json)
                cred = credentials.Certificate(sa_dict)
                firebase_admin.initialize_app(cred)
                print("Firebase Admin inicializado via FIREBASE_SERVICE_ACCOUNT_JSON")
                return
            except Exception as e:
                print(f"Erro ao parsear FIREBASE_SERVICE_ACCOUNT_JSON: {e}")

        # Mode 2: File path via GOOGLE_APPLICATION_CREDENTIALS
        sa_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
        if sa_path and os.path.exists(sa_path):
            try:
                cred = credentials.Certificate(sa_path)
                firebase_admin.initialize_app(cred)
                print("Firebase Admin inicializado via GOOGLE_APPLICATION_CREDENTIALS")
                return
            except Exception as e:
                print(f"Erro ao usar GOOGLE_APPLICATION_CREDENTIALS: {e}")

        # Mode 3: Application Default Credentials (GCP environments)
        try:
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred)
            print("Firebase Admin inicializado via Application Default Credentials")
            return
        except Exception as e:
            print(f"Nenhuma credencial encontrada. Firebase rodara sem Firestore. Erro: {e}")
            try:
                firebase_admin.initialize_app()
            except:
                pass

db = None
try:
    init_firebase()
    db = firestore.client()
except Exception as e:
    print(f"Firestore client nao inicializado: {e}")

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

