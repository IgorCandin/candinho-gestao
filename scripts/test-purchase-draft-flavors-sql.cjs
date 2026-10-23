/* Isolated wrapper contract/atomicity test; existing product/order callees are fixture stubs. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {PGlite}=require(process.env.PGLITE_MODULE||path.resolve('.codex-tmp/sql-harness/node_modules/@electric-sql/pglite'));
async function main(){const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create function can_write() returns boolean language sql as $$select current_setting('test.write',true)='true'$$;
 create function can_write_fitness() returns boolean language sql as $$select false$$;
 create table products(id uuid primary key default gen_random_uuid(),name text unique);
 create table product_flavors(id uuid primary key default gen_random_uuid(),product_id uuid references products(id),name text,active boolean);
 create table orders(id uuid primary key default gen_random_uuid(),items jsonb);
 create function create_product_record_v2(p_name text,p_category text,p_cost_price numeric default 0,p_enable_flavors boolean default false,p_flavors jsonb default null,p_flavor_allocations jsonb default '[]') returns uuid language plpgsql as $$declare pid uuid;f jsonb;begin insert into products(name) values(p_name) returning id into pid;if p_enable_flavors then for f in select value from jsonb_array_elements(p_flavors) loop insert into product_flavors(product_id,name,active) values(pid,f->>'name',true);end loop;end if;return pid;end$$;
 create function create_product_record(p_name text,p_category text,p_cost_price numeric default 0) returns uuid language sql as $$select create_product_record_v2(p_name,p_category,p_cost_price)$$;
 create function create_purchase_order(uuid,date,uuid,jsonb,text) returns uuid language plpgsql as $$declare oid uuid;i jsonb;begin if current_setting('test.order_fail',true)='true' then raise exception 'fixture order failure';end if;for i in select value from jsonb_array_elements($4) loop if i->>'flavor_id' is not null and not exists(select 1 from product_flavors where id=(i->>'flavor_id')::uuid and product_id=(i->>'product_id')::uuid) then raise exception 'wrong flavor';end if;end loop;insert into orders(items) values($4) returning id into oid;return oid;end$$;
 create function reschedule_operational_event(text,uuid,timestamptz) returns void language plpgsql as $$begin if current_setting('test.schedule_fail',true)='true' then raise exception 'fixture date failure';end if;end$$;
 set test.write='true';`);
 const base=fs.readFileSync('supabase/migrations/20260915150000_company_purchase_order_provisional_products.sql','utf8').split('-- Cliente digitado')[0];await db.exec(base);
 const draft={draft_key:'stable',name:'Produto fixture',category:'Teste',flavors:['Morango','Limão']};
 const item=(name='Morango',product=draft)=>({product_id:'local-only',flavor_id:null,draft_flavor:name,draft_product:product,quantity:2,unit_cost:10});
 const call=(items,expected=null)=>db.query("select create_company_purchase_order_with_products_v1('supplements',null,null,current_date,$2,null,0,null,$1::jsonb,null) as id",[JSON.stringify(items),expected]);
 const result=await call([item()]);const old=(await db.query('select items from orders where id=$1',[result.rows[0].id])).rows[0].items;
 assert.equal(old[0].flavor_id,null);console.log('RED reproduced: old wrapper loses provisional flavor');
 await db.exec('truncate orders,product_flavors,products');
 await db.exec(fs.readFileSync('supabase/migrations/20261023171740_company_purchase_draft_flavors.sql','utf8'));
 const order=await call([item('Morango'),item('Limão')]);
 const rows=(await db.query('select items from orders where id=$1',[order.rows[0].id])).rows[0].items;
 assert.equal((await db.query('select count(*)::int as n from products')).rows[0].n,1);
 assert.equal(new Set(rows.map(r=>r.product_id)).size,1);assert.equal(new Set(rows.map(r=>r.flavor_id)).size,2);assert.ok(rows.every(r=>r.flavor_id&&!('draft_product' in r)&&!('draft_flavor' in r)));
 await db.exec('truncate orders,product_flavors,products');
 await call([item(null,{draft_key:'plain',name:'Sem sabor',category:'Teste'})]);
 assert.equal((await db.query('select count(*)::int as n from product_flavors')).rows[0].n,0);
 await db.exec('truncate orders,product_flavors,products');
 for(const items of [[item(),item()],[item('X')],[item('Morango',{...draft,flavors:['Morango',' morango ']})],[item('Morango',{...draft,flavors:['']})],[item('Morango'),item('Limão',{...draft,category:'Divergente'})]]){
  await assert.rejects(call(items));assert.equal((await db.query('select count(*)::int as n from products')).rows[0].n,0);
 }
 for(const setting of ['order_fail','schedule_fail']){await db.exec(`set test.${setting}='true'`);await assert.rejects(call([item()],'2099-01-01'));await db.exec(`set test.${setting}='false'`);assert.equal((await db.query('select count(*)::int as n from products')).rows[0].n,0);assert.equal((await db.query('select count(*)::int as n from orders')).rows[0].n,0);}
 await db.exec("set test.write='false'");await assert.rejects(call([item()]));await db.exec("set test.write='true'");
 await assert.rejects(call(Array.from({length:51},()=>item())));
 console.log('PASS: one draft/two flavors, no flavor, duplicate/invalid flavor, inconsistent drafts, rollback after product/order/schedule failure, permissions and item limit');
 }finally{await db.close()}}
main().catch(e=>{console.error(e.message);process.exitCode=1});
