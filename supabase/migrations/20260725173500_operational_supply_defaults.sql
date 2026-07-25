create or replace function public.operational_supply_apply_sensible_defaults()
returns trigger language plpgsql as $$
begin
  if new.usage_stage='sale_delivery_manual' and lower(coalesce(new.name,'')) like '%etiqueta%' then
    new.usage_stage:='inventory_receipt';
    new.receipt_quantity_per_product_unit:=case when new.receipt_quantity_per_product_unit>0 then new.receipt_quantity_per_product_unit else 1 end;
    new.delivery_suggestion_mode:='none';
    new.delivery_default_quantity:=0;
    new.delivery_capacity_product_units:=null;
  end if;
  return new;
end;
$$;
drop trigger if exists operational_supply_sensible_defaults on public.operational_supplies;
create trigger operational_supply_sensible_defaults before insert on public.operational_supplies for each row execute function public.operational_supply_apply_sensible_defaults();
