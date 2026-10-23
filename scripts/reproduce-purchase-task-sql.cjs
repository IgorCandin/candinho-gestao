/* Counterexample in isolated PostgreSQL; deliberately documents an unfixed task synchronizer. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {PGlite}=require(process.env.PGLITE_MODULE||path.resolve('.codex-tmp/sql-harness/node_modules/@electric-sql/pglite'));
async function main(){const db=new PGlite();try{
 await db.exec(`create schema auth;create role anon;create role authenticated;
 create function auth.uid() returns uuid language sql as $$select '00000000-0000-4000-8000-000000000001'::uuid$$;
 create table sales(id uuid primary key,customer_id uuid,record_type text,general_status text,delivery_status text,created_by uuid);
 create table customers(id uuid primary key,name text);create table products(id uuid primary key,name text);create table product_flavors(id uuid primary key,name text);
 create table stock_reservations(id uuid primary key,sale_id uuid,product_id uuid,flavor_id uuid,status text,quantity_requested int,quantity_reserved int);
 create table operational_tasks(id uuid primary key default gen_random_uuid(),sale_id uuid,title text,category text,due_at timestamptz,status text,priority text,customer_id uuid,notes text,operation_scope text,created_by uuid,created_at timestamptz default now(),completed_at timestamptz,cancelled_at timestamptz);
 create table purchase_orders(id uuid primary key,status text);
 create table purchase_order_items(purchase_order_id uuid,product_id uuid,flavor_id uuid,quantity_ordered int,quantity_received int);
 insert into sales values('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000020','sale','active','pending','00000000-0000-4000-8000-000000000001');
 insert into customers values('00000000-0000-4000-8000-000000000020','Fixture');insert into products values('00000000-0000-4000-8000-000000000030','Fixture');
 insert into purchase_orders values('00000000-0000-4000-8000-000000000040','pending');
 insert into purchase_order_items values('00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-000000000030',null,2,0);
 insert into stock_reservations values('00000000-0000-4000-8000-000000000050','00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000030',null,'awaiting_stock',1,0);`);
 const source=fs.readFileSync('supabase/migrations/20261016183046_sync_company_commercial_contacts_conversion_and_purchase_tasks.sql','utf8');
 await db.exec(source.slice(source.indexOf('create or replace function public.sync_sale_purchase_task_v1'),source.indexOf('create or replace function public.sync_sale_purchase_task_trigger_v1')));
 await db.query('select sync_sale_purchase_task_v1($1)',['00000000-0000-4000-8000-000000000010']);
 const tasks=(await db.query('select title,status from operational_tasks')).rows;
 assert.equal(tasks.length,1);assert.match(tasks[0].title,/Comprar com urgência/);
 console.log('REPRODUCED: automatic purchase task created despite 2 incoming units for 1 missing unit; synchronizer ignores purchase orders. No real database touched.');
 }finally{await db.close()}}
main().catch(e=>{console.error(e.message);process.exitCode=1});
