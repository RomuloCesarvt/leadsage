"""Concede (ou remove) o papel de admin de uma conta.

Quem tem role="admin" nao gasta creditos: `credit_system.py` devolve 9999
e nao debita nada. E o mecanismo que ja existia no sistema para o dono
testar sem consumir saldo.

A conta e localizada pelo e-mail via Firebase Auth — o uid nunca e
digitado a mao, para nao correr o risco de promover a conta errada.

Uso:
    cd backend
    python scripts/set_admin.py rohcesar401@gmail.com
    python scripts/set_admin.py rohcesar401@gmail.com --remover
    python scripts/set_admin.py --listar

Precisa de FIREBASE_SERVICE_ACCOUNT_JSON no ambiente (ou no .env da raiz).
"""
import argparse
import json
import os
import sys

from dotenv import load_dotenv

# .env da raiz do repositorio
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

import firebase_admin
from firebase_admin import auth, credentials, firestore


def conectar():
    raw = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "")
    if not raw:
        sys.exit(
            "FIREBASE_SERVICE_ACCOUNT_JSON nao encontrada.\n"
            "Defina a variavel de ambiente ou coloque-a no .env da raiz."
        )
    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate(json.loads(raw)))
    return firestore.client()


def listar(db):
    print(f"{'e-mail':38} {'role':8} {'creditos':>9}  uid")
    for user in auth.list_users().iterate_all():
        doc = db.collection("users").document(user.uid).get()
        data = doc.to_dict() if doc.exists else {}
        role = data.get("role", "(sem documento)")
        creditos = data.get("credits", "-")
        marca = "  <= ADMIN" if role == "admin" else ""
        print(f"{user.email or '(sem e-mail)':38} {role:8} {str(creditos):>9}  {user.uid}{marca}")


def definir(db, email: str, remover: bool):
    try:
        user = auth.get_user_by_email(email)
    except auth.UserNotFoundError:
        sys.exit(f"Nenhuma conta com o e-mail {email}.")

    ref = db.collection("users").document(user.uid)
    antes = ref.get().to_dict() or {}
    novo_papel = "user" if remover else "admin"

    print(f"conta : {email}  (uid {user.uid})")
    print(f"antes : role={antes.get('role', '(sem documento)')} creditos={antes.get('credits', '-')}")

    # merge=True preserva o resto do documento (perfil, integracoes...)
    ref.set({"role": novo_papel}, merge=True)

    depois = ref.get().to_dict() or {}
    print(f"depois: role={depois.get('role')} creditos={depois.get('credits', '-')}")
    if novo_papel == "admin":
        print("\nPronto: essa conta passa a ter creditos ilimitados (9999) e nao debita nada.")
    else:
        print("\nPapel de admin removido: a conta volta a consumir creditos normalmente.")


def main():
    parser = argparse.ArgumentParser(description="Define o papel de admin de uma conta.")
    parser.add_argument("email", nargs="?", help="e-mail da conta")
    parser.add_argument("--remover", action="store_true", help="rebaixa de admin para user")
    parser.add_argument("--listar", action="store_true", help="so lista as contas e seus papeis")
    args = parser.parse_args()

    db = conectar()

    if args.listar or not args.email:
        listar(db)
        if not args.email:
            print("\nInforme um e-mail para promover a admin.")
        return

    definir(db, args.email, args.remover)


if __name__ == "__main__":
    main()
