begin;

alter table public.fitness_variants
  add column if not exists image_url text;

comment on column public.fitness_variants.image_url is
  'Imagem específica da variante; importada do legado AppSheet quando disponível.';

with image_map(sku, image_url) as (
  values
    ('PROD-00001', '/fitness-products/PROD-00001.Foto.175647.jpg'),
    ('PROD-00002', '/fitness-products/PROD-00002.Foto.183200.jpg'),
    ('PROD-00003', '/fitness-products/PROD-00003.Foto.175927.jpg'),
    ('PROD-00004', '/fitness-products/PROD-00004.Foto.180639.jpg'),
    ('PROD-00005', '/fitness-products/PROD-00005.Foto.180838.jpg'),
    ('PROD-00006', '/fitness-products/PROD-00006.Foto.182608.jpg'),
    ('PROD-00007', '/fitness-products/PROD-00007.Foto.183656.jpg'),
    ('PROD-00008', '/fitness-products/PROD-00008.Foto.182431.jpg'),
    ('PROD-00009', '/fitness-products/PROD-00009.Foto.183447.jpg'),
    ('PROD-00010', '/fitness-products/PROD-00010.Foto.182600.jpg'),
    ('PROD-00011', '/fitness-products/PROD-00011.Foto.183852.jpg'),
    ('PROD-00012', '/fitness-products/PROD-00012.Foto.183012.jpg'),
    ('PROD-00013', '/fitness-products/PROD-00013.Foto.015016.jpg'),
    ('PROD-00014', '/fitness-products/PROD-00014.Foto.015025.jpg'),
    ('PROD-00015', '/fitness-products/PROD-00015.Foto.015032.jpg'),
    ('PROD-00016', '/fitness-products/PROD-00016.Foto.015220.jpg'),
    ('PROD-00017', '/fitness-products/PROD-00017.Foto.014021.jpg'),
    ('PROD-00018', '/fitness-products/PROD-00018.Foto.013852.jpg'),
    ('PROD-00019', '/fitness-products/PROD-00019.Foto.013837.jpg'),
    ('PROD-00020', '/fitness-products/PROD-00020.Foto.013953.jpg'),
    ('PROD-00021', '/fitness-products/PROD-00021.Foto.014038.jpg'),
    ('PROD-00022', '/fitness-products/PROD-00022.Foto.014056.jpg'),
    ('PROD-00023', '/fitness-products/PROD-00023.Foto.014048.jpg'),
    ('PROD-00024', '/fitness-products/PROD-00024.Foto.113022.jpg'),
    ('PROD-00025', '/fitness-products/PROD-00025.Foto.233114.jpg'),
    ('PROD-00026', '/fitness-products/PROD-00026.Foto.171252.jpg'),
    ('PROD-00027', '/fitness-products/PROD-00027.Foto.171345.jpg'),
    ('PROD-00028', '/fitness-products/PROD-00028.Foto.180421.jpg'),
    ('PROD-00029', '/fitness-products/PROD-00029.Foto.180426.jpg'),
    ('PROD-00030', '/fitness-products/PROD-00030.Foto.180304.jpg'),
    ('PROD-00031', '/fitness-products/PROD-00031.Foto.204657.jpg'),
    ('PROD-00032', '/fitness-products/PROD-00032.Foto.204713.jpg'),
    ('PROD-00033', '/fitness-products/PROD-00033.Foto.174456.jpg'),
    ('PROD-00034', '/fitness-products/PROD-00034.Foto.171002.jpg'),
    ('PROD-00035', '/fitness-products/PROD-00035.Foto.171230.jpg'),
    ('PROD-00036', '/fitness-products/PROD-00036.Foto.171239.jpg'),
    ('PROD-00037', '/fitness-products/PROD-00011.Foto.183852.jpg'),
    ('PROD-00038', '/fitness-products/PROD-00038.Foto.171534.jpg'),
    ('PROD-00039', '/fitness-products/PROD-00008.Foto.182431.jpg'),
    ('PROD-00040', '/fitness-products/PROD-00040.Foto.173001.jpg'),
    ('PROD-00041', '/fitness-products/PROD-00041.Foto.175839.jpg'),
    ('PROD-00042', '/fitness-products/PROD-00042.Foto.172620.jpg'),
    ('PROD-00043', '/fitness-products/PROD-00043.Foto.175007.jpg'),
    ('PROD-00044', '/fitness-products/PROD-00044.Foto.175001.jpg'),
    ('PROD-00045', '/fitness-products/PROD-00045.Foto.175222.jpg'),
    ('PROD-00046', '/fitness-products/PROD-00046.Foto.175232.jpg'),
    ('PROD_10538', '/fitness-products/PROD_10538.Foto.191213.jpg'),
    ('PROD_38264', '/fitness-products/PROD_38264.Foto.191144.jpg'),
    ('PROD_21672', '/fitness-products/PROD_21672.Foto.191157.jpg'),
    ('PROD-00047', '/fitness-products/PROD-00047.Foto.114123.jpg'),
    ('PROD-00048', '/fitness-products/PROD-00048.Foto.114114.jpg'),
    ('PROD_31401', '/fitness-products/PROD_31401.Foto.154421.jpg'),
    ('PROD_40103', '/fitness-products/PROD_40103.Foto.205349.jpg'),
    ('PROD_62510', '/fitness-products/PROD_62510.Foto.205341.jpg'),
    ('PROD_85458', '/fitness-products/PROD_85458.Foto.001953.jpg'),
    ('PROD_68278', '/fitness-products/PROD_68278.Foto.001947.jpg'),
    ('PROD_35804', '/fitness-products/PROD_35804.Foto.001932.jpg'),
    ('PROD_61018', '/fitness-products/PROD_61018.Foto.001941.jpg'),
    ('PROD_94901', '/fitness-products/PROD_94901.Foto.002007.jpg'),
    ('PROD_36592', '/fitness-products/PROD_36592.Foto.001920.jpg'),
    ('PROD_23381', '/fitness-products/PROD_23381.Foto.001959.jpg'),
    ('PROD_69395', '/fitness-products/PROD_69395.Foto.001927.jpg')
)
update public.fitness_variants v
set
  image_url = m.image_url,
  updated_at = now()
from image_map m
where v.sku = m.sku;

with preferred_variant as (
  select distinct on (v.product_id)
    v.product_id,
    v.image_url
  from public.fitness_variants v
  where v.active = true
    and nullif(btrim(coalesce(v.image_url, '')), '') is not null
  order by
    v.product_id,
    case when coalesce(v.size, '') in ('M','P','G') then 0 else 1 end,
    v.sku
)
update public.fitness_products p
set
  image_url = pv.image_url,
  updated_at = now()
from preferred_variant pv
where p.id = pv.product_id;

commit;
