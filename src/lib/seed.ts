import { supabase } from "@/integrations/supabase/client";

export async function seedExampleIfEmpty() {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return;
  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) return;

  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const past = new Date(today);
  past.setDate(today.getDate() - 8);
  const soon = new Date(today);
  soon.setDate(today.getDate() + 12);

  const { data: project, error: pErr } = await supabase
    .from("projects")
    .insert({ name: "B5000572", client: "Kamesq", user_id: user.user.id })
    .select()
    .single();
  if (pErr || !project) return;

  await supabase.from("equipments").insert([
    {
      project_id: project.id,
      user_id: user.user.id,
      equipamento:
        "Condensador evaporativo S-GTECH CE S 0804-08.0I/02J.A - 821CESAA",
      posicao: "TAG-01",
      valor_unitario: 185400,
      quantidade: 1,
      data_producao: iso(past),
      status_producao: "OK",
      data_embarque: iso(past),
      status_embarque: "Não expedido",
    },
    {
      project_id: project.id,
      user_id: user.user.id,
      equipamento:
        "Condensador evaporativo S-GTECH CE S 1206-10.5I/03J.B - 822CESBB",
      posicao: "TAG-02",
      valor_unitario: 212750.5,
      quantidade: 2,
      data_producao: iso(today),
      status_producao: "OK",
      data_embarque: iso(today),
      status_embarque: "Não expedido",
    },
    {
      project_id: project.id,
      user_id: user.user.id,
      equipamento:
        "Painel de comando elétrico CCM - 480V - Quadro principal 823PCMAA",
      posicao: "TAG-03",
      valor_unitario: 96320,
      quantidade: 1,
      data_producao: iso(soon),
      status_producao: "NOK",
      data_embarque: iso(soon),
      status_embarque: "Não expedido",
    },
  ]);
}
