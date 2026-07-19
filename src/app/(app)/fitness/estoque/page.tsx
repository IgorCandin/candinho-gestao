import { PageHeader } from "@/components/page-header";
import { FitnessConversionForm } from "@/components/fitness-conversion-form";
import { getCurrentUserAccess, getFitnessStock } from "@/lib/data";
import { formatCurrency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function Page(){
  const [access,stock]=await Promise.all([getCurrentUserAccess(),getFitnessStock()]);
  const salesMode=access.role==="sales";
  const supabase=await createClient();
  const {data:consignedRows}=await supabase
    .from("fitness_stock_operational")
    .select("variant_id,consigned_quantity");
  const consignedByVariant=new Map(
    (consignedRows??[]).map((row:any)=>[String(row.variant_id),Number(row.consigned_quantity??0)]),
  );

  return <>
    <PageHeader
      eyebrow="Candinho Fitness"
      title="Estoque"
      description={
        salesMode
          ?"Consulta de disponibilidade, peças em prova e produtos a caminho."
          :"Saldo físico, reservado, em prova, disponível, a caminho e necessidade de reposição."
      }
    />
    {salesMode&&
      <div className="sales-profile-note">
        <strong>Perfil Vendas</strong>
        <span>Custos e ações de ajuste estão ocultos.</span>
      </div>
    }
    <article className="panel">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Produto</th><th>Tamanho</th><th>Cor</th><th>Físico</th>
              <th>Reservado</th><th>Em prova</th><th>Disponível</th><th>A caminho</th>
              <th>Mínimo</th>{!salesMode&&<th>Custo</th>}<th>Status</th>{!salesMode&&<th>Ação</th>}
            </tr>
          </thead>
          <tbody>
            {stock.map((v)=>{
              const consigned=consignedByVariant.get(v.variant_id)??0;
              return <tr key={v.variant_id}>
                <td>{v.product_name}</td><td>{v.size}</td><td>{v.color}</td>
                <td>{v.physical_quantity}</td><td>{v.reserved_quantity}</td>
                <td>{consigned>0?<strong>{consigned}</strong>:0}</td>
                <td>{v.available_quantity}</td><td>{v.incoming_quantity}</td><td>{v.minimum_stock}</td>
                {!salesMode&&<td>{formatCurrency(v.stock_cost_value)}</td>}
                <td>{consigned>0&&v.available_quantity===0?"em prova":v.operational_status}</td>
                {!salesMode&&<td><a className="table-link" href={`/fitness/estoque/${v.variant_id}`}>Ajustar</a></td>}
              </tr>
            })}
            {stock.length===0&&<tr><td colSpan={salesMode?10:12}>Nenhuma variação cadastrada.</td></tr>}
          </tbody>
        </table>
      </div>
    </article>
    {!salesMode&&access.canWriteFitness&&<FitnessConversionForm stock={stock}/>}
  </>;
}
