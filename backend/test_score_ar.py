from app import score_ar


def lead(**k):
    base = {"niche": "Clínicas", "role": "", "company": "Clínica Sol", "place_types": ["doctor"], "whatsapp": True, "phone": "5514999999999",
            "rating_count": 120, "reviews_sample": [], "opening_hours_week": ["seg"], "website": ""}
    return {**base, **k}


def test_calor_nas_avaliacoes_pesa_mais_e_aparece_nos_motivos():
    sem = score_ar.pontuar(lead())
    com = score_ar.pontuar(lead(reviews_sample=[{"text": "Lugar muito abafado, o ar condicionado não gela"}]))
    assert com[0] > sem[0] + 20 and any("defeito" in m for m in com[1])


def test_falta_de_site_nao_conta_e_segmento_conta():
    assert score_ar.pontuar(lead(website="https://x.com"))[0] == score_ar.pontuar(lead(website=""))[0]
    clinica = score_ar.pontuar(lead())[0]
    igreja = score_ar.pontuar(lead(niche="Igreja", company="Igreja Boa", place_types=["church"]))[0]
    assert clinica > igreja


def test_sem_contato_e_fechado_caem():
    assert score_ar.pontuar(lead(phone="", whatsapp=False))[0] < score_ar.pontuar(lead())[0]
    assert score_ar.pontuar(lead(business_status="CLOSED_PERMANENTLY"))[0] < 40
    assert 1 <= score_ar.pontuar(lead(reviews_sample=[{"text": "calor, ar quebrado"}], rating_count=500))[0] <= 99
