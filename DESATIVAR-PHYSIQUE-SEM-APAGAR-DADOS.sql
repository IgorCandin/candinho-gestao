-- Rollback operacional seguro: desativa a Physique sem apagar atletas, avaliações, fotos ou fichas.
-- Use apenas se quiser voltar temporariamente ao estado visual de "operação em preparação".
update public.ui_feature_flags
set enabled=false,
    description='Candinho Physique Athletes: operação temporariamente desativada; dados preservados.',
    updated_at=now()
where key='physique_enabled';
