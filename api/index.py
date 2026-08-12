import sys
import os

# Adiciona o diretório raiz ao PYTHONPATH para o Vercel conseguir achar o pacote backend
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from backend.app.main import app
