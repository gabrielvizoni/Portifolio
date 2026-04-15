const fmt = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    v,
  );
const fmtD = (iso) => {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("pt-BR") +
    " " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
};

let transacoes = JSON.parse(localStorage.getItem("vzf_tx") || "[]");

function showPage(id, btn) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".nav-link")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById("page-" + id).classList.add("active");
  if (btn) btn.classList.add("active");
  if (id === "dashboard") {
    updateDash();
    loadMarket();
    setDashDate();
  }
}

function setDashDate() {
  const d = new Date();
  document.getElementById("dash-date").textContent = d.toLocaleDateString(
    "pt-BR",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  );
}

function updateDash(filter = "") {
  let list = [...transacoes].reverse();
  if (filter)
    list = list.filter(
      (t) =>
        t.desc.toLowerCase().includes(filter.toLowerCase()) ||
        (t.obs && t.obs.toLowerCase().includes(filter.toLowerCase())),
    );

  let r = 0,
    d = 0;
  transacoes.forEach((t) => {
    if (t.tipo.startsWith("receita")) r += t.val;
    else d += t.val;
  });

  document.getElementById("kpi-saldo").textContent = fmt(r - d);
  document.getElementById("kpi-receitas").textContent = fmt(r);
  document.getElementById("kpi-despesas").textContent = fmt(d);

  const saldoDelta = document.getElementById("kpi-saldo-delta");
  const saldo = r - d;
  saldoDelta.textContent = saldo >= 0 ? "↑ Positivo" : "↓ Negativo";
  saldoDelta.className =
    "kpi-delta " + (saldo >= 0 ? "delta-up" : "delta-down");

  document.getElementById("tx-count").textContent =
    transacoes.length + " lançamento" + (transacoes.length !== 1 ? "s" : "");
  document.getElementById("qs-count").textContent = transacoes.length;

  const receitas = transacoes.filter((t) => t.tipo.startsWith("receita"));
  const despesas = transacoes.filter((t) => !t.tipo.startsWith("receita"));
  const mrec = receitas.length
    ? receitas.reduce((a, b) => (b.val > a.val ? b : a))
    : null;
  const mdep = despesas.length
    ? despesas.reduce((a, b) => (b.val > a.val ? b : a))
    : null;
  document.getElementById("qs-maior-r").textContent = mrec
    ? fmt(mrec.val)
    : "—";
  document.getElementById("qs-maior-d").textContent = mdep
    ? fmt(mdep.val)
    : "—";

  const ul = document.getElementById("tx-list");
  const empty = document.getElementById("tx-empty");
  ul.innerHTML = "";
  if (!list.length) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  const catColors = {
    "receita-salario": "#3b82f6",
    "receita-servico": "#8b5cf6",
    "receita-rendimento": "#6366f1",
    "despesa-fixa": "#ef4444",
    "despesa-variavel": "#f97316",
    "despesa-imposto": "#dc2626",
  };
  const catNames = {
    "receita-salario": "Salário",
    "receita-servico": "Serviço",
    "receita-rendimento": "Rendimento",
    "despesa-fixa": "Fixa",
    "despesa-variavel": "Variável",
    "despesa-imposto": "Imposto",
  };

  list.forEach((t, i) => {
    const isR = t.tipo.startsWith("receita");
    const real = transacoes.findIndex((x) => x.id === t.id);
    const li = document.createElement("li");
    li.className = "tx-item";
    const col = catColors[t.tipo] || "#64748b";
    li.innerHTML = `
    <div class="tx-icon" style="background:${col}18;color:${col}">${isR ? "↑" : "↓"}</div>
    <div class="tx-info">
      <div class="tx-name">${t.desc}</div>
      <div class="tx-date">${catNames[t.tipo] || t.tipo}${t.data ? " · " + fmtD(t.data) : ""}</div>
      ${t.obs ? `<div class="tx-date">${t.obs}</div>` : ""}
    </div>
    <div style="display:flex;align-items:center;gap:.75rem">
      <span class="tx-amt ${isR ? "tx-pos" : "tx-neg"}">${isR ? "+" : "-"}${fmt(t.val)}</span>
      <button onclick="remover(${real})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1rem;line-height:1" title="Remover">✕</button>
    </div>`;
    ul.appendChild(li);
  });

  // gráfico de categorias
  const cats = {
    "despesa-fixa": 0,
    "despesa-variavel": 0,
    "despesa-imposto": 0,
  };
  despesas.forEach((t) => {
    if (cats[t.tipo] !== undefined) cats[t.tipo] += t.val;
  });
  const max = Math.max(...Object.values(cats), 1);
  const chart = document.getElementById("cat-chart");
  const labels = {
    "despesa-fixa": "Fixa",
    "despesa-variavel": "Variável",
    "despesa-imposto": "Imposto",
  };
  const cols2 = ["#ef4444", "#f97316", "#dc2626"];
  if (Object.values(cats).some((v) => v > 0)) {
    chart.innerHTML = Object.entries(cats)
      .map(
        ([k, v], i) => `
    <div class="bar-wrap">
      <div class="bar-fill" style="height:${Math.round((v / max) * 76)}px;background:${cols2[i]}"></div>
      <div class="bar-lbl">${labels[k]}</div>
    </div>`,
      )
      .join("");
  } else {
    chart.innerHTML =
      '<div style="font-size:0.78rem;color:var(--muted)">Adicione despesas para ver o gráfico.</div>';
  }
}

function salvarLancamento() {
  const desc = document.getElementById("f-desc").value.trim();
  const val = parseFloat(document.getElementById("f-valor").value);
  const tipo = document.getElementById("f-tipo").value;
  const obs = document.getElementById("f-obs").value.trim();
  if (!desc || !val) return;
  transacoes.push({
    id: Date.now(),
    desc,
    val,
    tipo,
    obs,
    data: new Date().toISOString(),
  });
  localStorage.setItem("vzf_tx", JSON.stringify(transacoes));
  updateDash();
  document.getElementById("f-desc").value = "";
  document.getElementById("f-valor").value = "";
  document.getElementById("f-obs").value = "";
  const fb = document.getElementById("f-feedback");
  fb.style.display = "block";
  setTimeout(() => {
    fb.style.display = "none";
    document.getElementById("formModal").style.display = "none";
  }, 1500);
}

function remover(idx) {
  transacoes.splice(idx, 1);
  localStorage.setItem("vzf_tx", JSON.stringify(transacoes));
  updateDash(document.getElementById("busca").value);
}

document
  .getElementById("busca")
  .addEventListener("input", (e) => updateDash(e.target.value));

async function loadMarket() {
  const ul = document.getElementById("mkt-list");
  ul.innerHTML =
    '<li style="font-size:0.8rem;color:var(--muted)">Carregando cotações...</li>';
  try {
    const r = await fetch(
      "https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL",
    );
    const d = await r.json();
    const now = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    document.getElementById("mkt-time").textContent = "Atualizado " + now;
    const items = [
      {
        sym: "USD",
        name: "Dólar americano",
        val: +d.USDBRL.bid,
        pct: +d.USDBRL.pctChange,
      },
      {
        sym: "EUR",
        name: "Euro",
        val: +d.EURBRL.bid,
        pct: +d.EURBRL.pctChange,
      },
      {
        sym: "BTC",
        name: "Bitcoin",
        val: +d.BTCBRL.bid,
        pct: +d.BTCBRL.pctChange,
      },
    ];
    ul.innerHTML = items
      .map(
        (i) => `
    <li class="market-item">
      <div><div class="mkt-sym">${i.sym}</div><div class="mkt-name">${i.name}</div></div>
      <div style="text-align:right">
        <div class="mkt-val">${i.sym === "BTC" ? "R$ " + i.val.toLocaleString("pt-BR") : "R$ " + i.val.toFixed(2)}</div>
        <div class="mkt-chg ${i.pct >= 0 ? "chg-up" : "chg-down"}">${i.pct >= 0 ? "+" : ""}${i.pct.toFixed(2)}%</div>
      </div>
    </li>`,
      )
      .join("");
  } catch (e) {
    ul.innerHTML =
      '<li style="font-size:0.78rem;color:var(--danger)">Erro ao carregar cotações.</li>';
  }
}

function enviarWpp() {
  const nome = document.getElementById("c-nome").value.trim();
  const assunto = document.getElementById("c-assunto").value;
  const msg = document.getElementById("c-msg").value.trim();
  if (!nome || !msg) return;
  const texto = `Olá! Sou ${nome}. Assunto: ${assunto}. ${msg}`;
  window.open(
    `https://wa.me/5544999304702?text=${encodeURIComponent(texto)}`,
    "_blank",
  );
  const fb = document.getElementById("c-feedback");
  fb.style.display = "block";
  setTimeout(() => (fb.style.display = "none"), 4000);
}

updateDash();

/*DARK MODE - NAO MECHER PELO AMOR DE DEUS*/
function toggleTema() {
  const isDark = document.body.classList.toggle("dark-theme");
  const btnTema = document.getElementById("btn-tema");

  if (isDark) {
    btnTema.textContent = "☀️";
    localStorage.setItem("vzf_tema", "dark");
  } else {
    btnTema.textContent = "🌙";
    localStorage.setItem("vzf_tema", "light");
  }
}

function carregarTema() {
  const temaSalvo = localStorage.getItem("vzf_tema");
  const btnTema = document.getElementById("btn-tema");

  if (temaSalvo === "dark") {
    document.body.classList.add("dark-theme");
    if (btnTema) btnTema.textContent = "☀️";
  }
}
carregarTema();
