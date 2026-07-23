-- Candinho Company · sincronização de histórico pós-V38
--
-- Esta migration originalmente agrupava o fechamento operacional em um único arquivo.
-- Em produção, o conteúdo foi aplicado em quatro migrations transacionais menores,
-- registradas logo abaixo na sequência cronológica.
--
-- Mantemos este arquivo como no-op para preservar o histórico do commit original
-- e evitar que a mesma alteração estrutural seja executada duas vezes em ambientes novos.
select 1;
