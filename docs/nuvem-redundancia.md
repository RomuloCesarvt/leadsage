# WhatsApp na nuvem que não cai: vários serviços gratuitos, um só atende

O WhatsApp só aceita **uma conexão por número**. Por isso o LeadSage usa uma **concessão com prazo** (banco SQL):

- Cada serviço da nuvem pede a concessão do usuário antes de ligar o número e **renova a cada 30 s**.
- Se o serviço some (hospedagem fora do ar, deploy, queda), a concessão vence em até 2 minutos e **outro serviço assume sozinho**.
- Quem desliga normalmente (deploy) **devolve** a concessão e o outro assume na hora.
- Os números ficam conectados: a sessão está guardada (cifrada) no banco, então o serviço que assume não pede QR de novo.

Isso também acaba com o erro 440 ("conflict") que aparecia quando dois serviços ligavam o mesmo número durante um deploy.

## Serviços

1. **Render** (principal, já no ar). Dorme após 15 min sem visita; um agendador no Supabase (pg_cron) visita a cada 4 minutos.
2. **Reserva gratuita (recomendado): Hugging Face Spaces**, sem cartão. Passo a passo:
   1. Crie uma conta em huggingface.co.
   2. *New Space* → nome `leadsage-nuvem-reserva`, SDK **Docker**, hardware **CPU basic (free)**, visibilidade **Public** ou Private.
   3. Em *Files*, envie os dois arquivos de `nuvem/hospedagens/huggingface/` (`Dockerfile` e `README.md`).
   4. Em *Settings → Variables and secrets*, crie os **secrets** `WORKER_SECRET` (o mesmo valor do Render/Vercel) e `LEADSAGE_URL` = `https://leadsageofc.vercel.app`.
   5. Quando o Space subir, abra a URL dele (algo como `https://SEU-USUARIO-leadsage-nuvem-reserva.hf.space/`): deve mostrar `{"ok":true,...}`.
   6. Passe a URL para o LeadSage manter o Space acordado (um segundo agendador no Supabase).

Qualquer outro lugar que rode o `nuvem/Dockerfile` também serve como reserva (basta os mesmos dois segredos).
