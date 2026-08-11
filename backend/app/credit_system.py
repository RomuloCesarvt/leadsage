from typing import Dict, Any, List, Optional
from datetime import datetime
from app.firebase_config import db

async def check_and_deduct_credits(uid: str, amount: int) -> Optional[int]:
    """
    Checks if user has enough credits and deducts them.
    If the user role is 'admin', bypasses deduction and returns 9999.
    Returns the new balance or None if insufficient credits.
    """
    if db is None:
        # Fallback para dev local sem Firestore
        return 9999

    user_ref = db.collection('users').document(uid)
    user_doc = user_ref.get()

    if not user_doc.exists:
        # Criar documento mock se não existir
        user_ref.set({
            "role": "user",
            "credits": 50,
            "createdAt": datetime.now().isoformat()
        })
        user_data = {"role": "user", "credits": 50}
    else:
        user_data = user_doc.to_dict()

    if user_data.get("role") == "admin":
        return 9999 # Infinitos para admin

    current_credits = user_data.get("credits", 0)
    if current_credits < amount:
        return None

    new_credits = current_credits - amount
    user_ref.update({"credits": new_credits})

    # Gravar histórico
    db.collection('users').document(uid).collection('history').add({
        "description": f"Gasto de {amount} créditos",
        "amount": -amount,
        "type": "debit",
        "timestamp": datetime.now().isoformat()
    })

    return new_credits

async def get_user_balance(uid: str) -> Dict[str, Any]:
    if db is None:
        return {"credits": 9999, "history": []}

    user_ref = db.collection('users').document(uid)
    user_doc = user_ref.get()
    
    credits = 0
    if user_doc.exists:
        data = user_doc.to_dict()
        credits = 9999 if data.get("role") == "admin" else data.get("credits", 0)

    history_ref = user_ref.collection('history').order_by('timestamp', direction='DESCENDING').limit(20)
    history_docs = history_ref.stream()
    history = [doc.to_dict() for doc in history_docs]

    return {"credits": credits, "history": history}

async def add_credits(uid: str, amount: int, reason: str = "Recarga de Créditos (Pix/Cartão)") -> int:
    if db is None:
        return 9999
        
    user_ref = db.collection('users').document(uid)
    user_doc = user_ref.get()
    
    if user_doc.exists:
        current = user_doc.to_dict().get("credits", 0)
        new_credits = current + amount
        user_ref.update({"credits": new_credits})
    else:
        new_credits = amount
        user_ref.set({"role": "user", "credits": new_credits})

    db.collection('users').document(uid).collection('history').add({
        "description": reason,
        "amount": +amount,
        "type": "credit",
        "timestamp": datetime.now().isoformat()
    })

    return new_credits
