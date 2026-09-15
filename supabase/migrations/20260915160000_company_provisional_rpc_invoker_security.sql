-- As funções chamam RPCs já autorizadas e não precisam elevar privilégio.
alter function public.create_company_purchase_order_with_products_v1(text,uuid,text,date,date,uuid,numeric,text,jsonb,text) security invoker;
alter function public.save_company_quote_with_customer_v1(jsonb,jsonb) security invoker;
