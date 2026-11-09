

def test_o_espaco_da_empresa_tambem_pode_guardar_a_sessao_do_whatsapp():
    from app import nuvem_auth
    assert nuvem_auth.uid_valido("AbC123_-xyz") and nuvem_auth.uid_valido("AbC123_-xyz~empresa")
    assert not nuvem_auth.uid_valido("../x") and not nuvem_auth.uid_valido("a/b") and not nuvem_auth.uid_valido("")
