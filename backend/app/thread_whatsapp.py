"""A conversa inteira, como no próprio WhatsApp: o que o robô gravou + o que o WhatsApp mostra, juntos e sem repetir.

A conversa do robô só tem o que passou por ele (e o robô pode ter perdido falas: servidor fora, mensagem digitada no celular antes de existir
a pausa automática...). O espelho do WhatsApp tem o chat de verdade. Aqui os dois viram uma linha do tempo só:

- o WhatsApp manda no que aconteceu (e no horário); o que o robô sabe a mais é QUEM escreveu o que é nosso ("robô" ou "você");
- a mesma fala nunca aparece duas vezes (o WhatsApp e o registro do robô casam por texto, lado e horário próximo);
- o que o robô gravou e o WhatsApp ainda não trouxe (fala recém-enviada, abordagem antiga) continua na linha do tempo;
- repetições coladas (mesma fala do mesmo lado em poucos segundos, como o "você" que a tela e o celular registram) viram uma só.
"""
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

TOLERANCIA_S = 15 * 60          # o horário do registro do robô e o do WhatsApp podem diferir (fila, confirmação)
COLADAS_S = 120                 # a mesma fala do mesmo lado dentro de 2 minutos é a mesma fala


def _norm(texto: Any) -> str:
    return re.sub(r"\s+", " ", str(texto or "")).strip().lower()


def _epoch(valor: Any) -> Optional[float]:
    if valor in (None, ""):
        return None
    if isinstance(valor, (int, float)):
        return float(valor)
    try:
        s = str(valor).replace("Z", "+00:00")
        d = datetime.fromisoformat(s)
        return (d if d.tzinfo else d.replace(tzinfo=timezone.utc)).timestamp()
    except ValueError:
        return None


def _iso(epoch: Optional[float]) -> str:
    return datetime.fromtimestamp(epoch, timezone.utc).isoformat(timespec="seconds") if epoch else ""


def _lado(m: Dict[str, Any]) -> str:
    return "contato" if m.get("de") == "contato" else "nosso"


def juntar(guardadas: List[Dict[str, Any]], whatsapp: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """`guardadas`: as falas da conversa do robô (de: contato|robo|voce). `whatsapp`: o chat do espelho (minha, texto, quando, id)."""
    guardadas = [dict(m) for m in guardadas or [] if m.get("texto")]
    usadas = [False] * len(guardadas)
    saida: List[Dict[str, Any]] = []

    for w in sorted((x for x in whatsapp or [] if isinstance(x, dict) and str(x.get("texto") or "").strip()), key=lambda x: float(x.get("quando") or 0)):
        lado = "nosso" if w.get("minha") else "contato"
        texto, quando = _norm(w.get("texto")), _epoch(w.get("quando"))
        achada = None
        melhor = None
        for i, g in enumerate(guardadas):
            if usadas[i] or _lado(g) != lado:
                continue
            if g.get("meta_id") and w.get("id") and str(g["meta_id"]) == str(w["id"]):
                achada = i
                break
            if _norm(g.get("texto")) != texto:
                continue
            tg = _epoch(g.get("em"))
            dist = abs(tg - quando) if (tg is not None and quando is not None) else 0
            if dist <= TOLERANCIA_S and (melhor is None or dist < melhor[0]):
                melhor = (dist, i)
        if achada is None and melhor is not None:
            achada = melhor[1]
        if achada is not None:
            usadas[achada] = True
            g = guardadas[achada]
            saida.append({**g, "em": _iso(quando) or g.get("em", ""), "meta_id": g.get("meta_id") or w.get("id", ""), "no_whatsapp": True,
                          **({"status": w["status"]} if w.get("status") is not None else {})})
        else:
            # só o WhatsApp tem: uma fala nossa que o robô nunca viu foi escrita por uma pessoa (no celular)
            saida.append({"de": "voce" if w.get("minha") else "contato", "texto": str(w.get("texto") or "")[:2000], "em": _iso(quando),
                          "meta_id": str(w.get("id") or ""), "no_whatsapp": True, "origem": "whatsapp"})

    # o que o robô tem e o WhatsApp não trouxe (ainda): fica
    for i, g in enumerate(guardadas):
        if not usadas[i]:
            saida.append(g)

    def chave(m: Dict[str, Any]):
        t = _epoch(m.get("em"))
        return (t if t is not None else 0.0)

    saida.sort(key=chave)

    # repetições coladas do mesmo lado
    limpa: List[Dict[str, Any]] = []
    for m in saida:
        t = _epoch(m.get("em"))
        for anterior in reversed(limpa[-6:]):
            ta = _epoch(anterior.get("em"))
            if (_lado(anterior) == _lado(m) and _norm(anterior.get("texto")) == _norm(m.get("texto"))
                    and (t is None or ta is None or abs(t - ta) <= COLADAS_S)):
                # fica a que tem mais informação (a que o robô marcou como "robô" vence a "você" genérica)
                if anterior.get("de") == "voce" and m.get("de") == "robo":
                    anterior["de"] = "robo"
                anterior.setdefault("meta_id", m.get("meta_id"))
                break
        else:
            limpa.append(m)
    return limpa
