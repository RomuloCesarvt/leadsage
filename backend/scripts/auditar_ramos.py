"""Auditoria dos ramos: o conteúdo do site, as fotos e o ramo contam a mesma história?

Para cada ramo do catálogo cruza duas coisas que moram em lugares diferentes:
  * o conteúdo que o site recebe (frontend, conteudo-nichos.ts: textos, serviços, perguntas);
  * o perfil de fotos que o banco de imagens busca (backend, banco_imagens.py + curadoria_imagens.py).

Foi o que faltava para pegar casos como "nutricionista com foto de médico e texto de clínica médica". Não usa rede nem IA.

    python scripts/auditar_ramos.py              # relatório
    python scripts/auditar_ramos.py --lista      # inclui o ramo de cada conteúdo (para conferir a olho)
    python scripts/auditar_ramos.py --md saida.md

Sai com código 1 quando há ramo com foto fora do assunto do conteúdo.
"""
import argparse
import collections
import json
import re
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "backend"))

from app.banco_imagens import TERMOS_GENERICOS, perfil_para  # noqa: E402

CATALOGO = RAIZ / "backend" / "nichos_catalogo.json"

# O que as fotos buscadas (termos em inglês) precisam ter a ver com o conteúdo que o site recebe.
ASSUNTO_DAS_FOTOS = {
    "padaria": r"bakery|bread|pastry|coffee|cake|dessert|chocolate|croissant|cafe|tea",
    "restaurante": r"restaurant|food|pizza|burger|chef|dinner|sushi|steak|barbecue|meal|lunch|bar|beer|wine|pub|ice cream|smoothie|fries|grill|kitchen|juice|dessert|cocktail",
    "saude-medica": r"doctor|medical|clinic|health|hospital|stethoscope|patient|nurse|elderly|care|laboratory|pharmacy|medicine|wheelchair|hearing",
    "odonto": r"dent|teeth|smile|tooth",
    "psicologia": r"therap|meditation|calm|psycholog|cozy|plant|mindful|counsel|wellness|journal|hearing|speech",
    "estetica": r"spa|skin|beauty|hair|salon|barber|nail|makeup|massage|cosmetic|facial|eyebrow|piercing|tattoo|perfume|wellness|dermat",
    "academia": r"gym|fitness|workout|training|yoga|sport|swimming|pool|martial|boxing|dojo|dance|ballet|running|tennis|soccer|court|bicycle|cycling|skate|surf|fishing|climb|stretch|weight",
    "advocacia": r"business|office|contract|law|handshake|meeting|document|notary|paperwork|desk|consult",
    "contabilidade": r"account|finance|tax|calculator|office|laptop|business|money|bank|insurance|credit|document|desk|invest",
    "imobiliaria": r"house|real estate|home|apartment|living|building|office|property|condo|coworking|warehouse|interior",
    "oficina": r"car|mechanic|garage|engine|auto|tire|repair|motor|vehicle|wheel|parking|tow|polish|wash|body|detail|drive",
    "pet": r"dog|cat|pet|puppy|vet|animal|groom|kennel|aquarium",
    "loja-moda": r"fashion|cloth|boutique|store|shoe|handbag|jewelry|watch|eyeglass|glasses|perfume|toy|book|stationery|gift|fabric|furniture|electronics|smartphone|computer|market|shop|craft|antique|baby|kids",
    "construcao": r"construct|architect|renovat|interior|build|tool|paint|tile|carpentr|wood|steel|crane|engineer|blueprint|solar|electrician|plumb|garden|pool|concrete|lumber|hardware|furniture|workshop|excavat|machinery|demolition|brick",
    "servicos-residenciais": r"laptop|computer|clean|electric|plumb|tool|repair|garden|pest|lock|laundry|sewing|tailor|maid|washing|key|technician|antenna|workshop|moving|delivery|water|gas|print|sign|document|security|alarm|camera|nanny|reception|network|fiber",
    "educacao": r"class|student|study|school|learn|kids|language|music|art|theater|guitar|university|course|driving|pilot|lesson|children",
    "eventos": r"theat|event|party|wedding|catering|photograph|concert|dj|venue|decor|camera|studio|video|microphone|recording|night|live|waiter|gaming|newspaper|writer|musician|painting|sculpt|handmade",
    "turismo": r"hotel|travel|resort|beach|cabin|vacation|tour|adventure|room|rental|agency|tourism|outdoor|fishing|horse|boat",
    "agro": r"farm|tractor|agricultur|cattle|field|grain|horse|drone|silo|saddle|garden|tools",
    "varejo": r"store|shop|market|grocery|retail|product|supermarket|vegetable|butcher|fresh|produce|health food|herb|vitamin|tobacco|knife|boat|warehouse|online shopping|packaging|tools|toy|baby|book|gift|fabric|electronics|furniture|laundry|flower|florist|bouquet|candle|memorial|community|church|volunteer",
    "tecnologia-marketing": r"laptop|code|software|creative|marketing|team|office|network|data|server|fiber|telecom|security|camera|alarm|surveillance|developer|brainstorm|consult|presentation|business|video|recording|camera|microphone|photo|tools|printing|screen|graphic|repair|electronics|computer",
    "concessionaria": r"car|automobile|dealership|motorcycle|vehicle|bike|parking|tow|rental|insurance|bank|money|financial",
    "credito": r"money|bank|credit|financial|insurance|payment|shopping|store|advisor|card",
    "industria": r"factory|industrial|machinery|metal|production|foundry|garment|sewing|scrap|warehouse|kitchen|packaging|recycl",
    "logistica": r"truck|logistics|warehouse|cargo|moving|delivery|shipping|parking|tow|car|taxi|courier|container|forklift|bus",
    "seguranca": r"security|guard|alarm|surveillance|camera|lock|safe|fire|detective|reception|facility",
    "comunidade": r"community|church|volunteer|people|together|charity|association",
    "seguros": r"insurance|financial|advisor|money|bank|investment|car dealership|used cars|credit|office|business",
}

# amplo de propósito: uma loja ou uma escola de qualquer coisa pode ter foto do que vende ou ensina; só a foto de consulta médica denuncia erro
CONTEUDO_AMPLO = {"varejo", "educacao"}

# foto especializada que o conteúdo do site não descreve, mas está certa (ramo -> motivo)
ACEITOS = {
    "Psiquiatras": "saúde mental: o conteúdo é de clínica médica, a foto é de terapia",
    "Fábricas de ração": "conteúdo pet, foto da fábrica",
    "Pousadas pet friendly": "conteúdo pet, foto de hospedagem",
    "Gráficas industriais": "conteúdo de serviços, foto da produção",
    "Impermeabilização": "serviço de obra com foto de obra",
    "Engenharia de segurança": "conteúdo de segurança, foto de engenharia",
    "Associações esportivas": "conteúdo de entidade, foto de esporte",
}
# o que denuncia "consulta médica" na foto (clínica/hospital sozinhos servem a dentista, farmácia, estética...)
MEDICA = re.compile(r"doctor|stethoscope|patient|physician|medical clinic|medical exam", re.I)


def conteudo_de_cada_ramo(ramos):
    entrada = CATALOGO
    r = subprocess.run(["npx", "tsx", "qa/ramos-conteudo.ts", str(entrada)], cwd=RAIZ / "frontend", capture_output=True, text=True,
                       shell=sys.platform == "win32", encoding="utf-8")
    if r.returncode != 0:
        sys.exit("não consegui ler o conteúdo dos ramos (frontend):\n" + (r.stderr or r.stdout)[-800:])
    return json.loads(r.stdout)


def auditar():
    ramos = json.loads(CATALOGO.read_text(encoding="utf-8"))
    conteudo = conteudo_de_cada_ramo(ramos)
    linhas = []
    for ramo in ramos:
        c = conteudo[ramo]
        p = perfil_para(ramo)
        termos = [t.lower() for t in p["termos"]]
        junto = " ".join(termos)
        achados = []
        if c["id"] == "generico":
            achados.append("conteudo_generico")
        else:
            esperado = ASSUNTO_DAS_FOTOS.get(c["id"])
            if esperado and c["id"] not in CONTEUDO_AMPLO and ramo not in ACEITOS and not re.search(esperado, junto):
                achados.append("foto_fora_do_assunto")
            if MEDICA.search(junto) and c["id"] != "saude-medica":
                achados.append("foto_medica_em_ramo_nao_medico")
        if termos[:len(TERMOS_GENERICOS)] == [t.lower() for t in TERMOS_GENERICOS] or termos[-len(TERMOS_GENERICOS):] == [t.lower() for t in TERMOS_GENERICOS]:
            achados.append("foto_generica")
        linhas.append({"ramo": ramo, "conteudo": c["id"], "termos": p["termos"][:4], "curadoria": bool(p.get("bons")), "achados": achados})
    return linhas


def relatorio(linhas, lista=False):
    out = []
    por_conteudo = collections.defaultdict(list)
    for l in linhas:
        por_conteudo[l["conteudo"]].append(l)
    out.append(f"# Auditoria dos ramos ({len(linhas)} ramos)\n")
    out.append("## Quantos ramos caem em cada conteúdo\n")
    for cid, ls in sorted(por_conteudo.items(), key=lambda x: -len(x[1])):
        out.append(f"- {cid}: {len(ls)}")
    for tipo, titulo in (("foto_medica_em_ramo_nao_medico", "Foto de médico/clínica em ramo que não é médico"),
                         ("foto_fora_do_assunto", "Foto fora do assunto do conteúdo do site"),
                         ("conteudo_generico", "Ramos sem conteúdo próprio (caem no genérico)"),
                         ("foto_generica", "Ramos sem termos de foto próprios (banco genérico)")):
        achados = [l for l in linhas if tipo in l["achados"]]
        out.append(f"\n## {titulo}: {len(achados)}\n")
        for l in achados:
            out.append(f"- {l['ramo']}  [{l['conteudo']}]  fotos: {', '.join(l['termos'])}")
    if lista:
        out.append("\n## Ramo por conteúdo (para conferir a olho)\n")
        for cid, ls in sorted(por_conteudo.items()):
            out.append(f"\n### {cid} ({len(ls)})\n" + "; ".join(l["ramo"] for l in ls))
    return "\n".join(out)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--lista", action="store_true")
    ap.add_argument("--md")
    a = ap.parse_args()
    linhas = auditar()
    texto = relatorio(linhas, a.lista)
    if a.md:
        Path(a.md).write_text(texto, encoding="utf-8")
    sys.stdout.reconfigure(encoding="utf-8")
    print(texto)
    sys.exit(1 if any({"foto_fora_do_assunto", "foto_medica_em_ramo_nao_medico"} & set(l["achados"]) for l in linhas) else 0)
