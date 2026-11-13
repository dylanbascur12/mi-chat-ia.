"use client";

import { useEffect, useRef, useState } from "react";

const LIMITE_DIARIO = 20; // mensajes gratis por día (luego será el plan de pago)
const VACIO = { name: "", personality: "", style: "", story: "", first: "" };

const hoy = () => new Date().toISOString().slice(0, 10);

export default function Home() {
  const [personajes, setPersonajes] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [activo, setActivo] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [usados, setUsados] = useState(0);
  const [error, setError] = useState("");
  const finRef = useRef(null);

  // Cargar datos guardados en el navegador (más adelante: Supabase).
  useEffect(() => {
    try {
      setPersonajes(JSON.parse(localStorage.getItem("personajes") || "[]"));
      const u = JSON.parse(localStorage.getItem("uso") || "{}");
      setUsados(u.dia === hoy() ? u.n : 0);
    } catch {}
  }, []);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando]);

  function guardarPersonajes(lista) {
    setPersonajes(lista);
    try { localStorage.setItem("personajes", JSON.stringify(lista)); } catch {}
  }

  function crear(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.personality.trim()) return;
    guardarPersonajes([...personajes, { ...form, id: Date.now() }]);
    setForm(VACIO);
  }

  function borrar(id) {
    guardarPersonajes(personajes.filter((p) => p.id !== id));
  }

  function abrir(p) {
    setActivo(p);
    setError("");
    setMensajes(p.first ? [{ role: "assistant", content: p.first }] : []);
  }

  async function enviar(e) {
    e.preventDefault();
    const t = texto.trim();
    if (!t || cargando) return;
    if (usados >= LIMITE_DIARIO) {
      setError("Llegaste al límite gratis de hoy. Con el plan Plus no tendrás límite.");
      return;
    }
    const nuevos = [...mensajes, { role: "user", content: t }];
    setMensajes(nuevos);
    setTexto("");
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ character: activo, messages: nuevos }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setMensajes([...nuevos, { role: "assistant", content: data.reply }]);
      const n = usados + 1;
      setUsados(n);
      try { localStorage.setItem("uso", JSON.stringify({ dia: hoy(), n })); } catch {}
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  // ---------- Vista de chat ----------
  if (activo) {
    return (
      <main className="chat">
        <header className="chat-top">
          <button className="btn-texto" onClick={() => setActivo(null)}>Volver</button>
          <div>
            <strong>{activo.name}</strong>
            <small>{LIMITE_DIARIO - usados} mensajes gratis hoy</small>
          </div>
        </header>

        <section className="chat-msgs" aria-live="polite">
          {mensajes.map((m, i) => (
            <p key={i} className={m.role === "user" ? "burbuja yo" : "burbuja ella"}>
              {m.content}
            </p>
          ))}
          {cargando && <p className="burbuja ella pensando">Escribiendo…</p>}
          {error && <p className="error">{error}</p>}
          <div ref={finRef} />
        </section>

        <form className="chat-form" onSubmit={enviar}>
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={`Escríbele a ${activo.name}`}
            maxLength={500}
          />
          <button className="btn" disabled={cargando}>Enviar</button>
        </form>
      </main>
    );
  }

  // ---------- Vista de personajes ----------
  return (
    <main className="home">
      <h1>Crea un personaje y habla con él</h1>
      <p className="sub">Tú defines cómo piensa y cómo habla. La IA hace el resto.</p>

      <form className="card" onSubmit={crear}>
        <label>Nombre
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Kaito" required />
        </label>
        <label>Personalidad
          <textarea value={form.personality} onChange={(e) => setForm({ ...form, personality: e.target.value })} placeholder="Ej: Espadachín orgulloso, serio, pero leal con sus amigos." rows={3} required />
        </label>
        <label>Forma de hablar
          <input value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })} placeholder="Ej: frases cortas, sarcástico" />
        </label>
        <label>Historia o contexto
          <textarea value={form.story} onChange={(e) => setForm({ ...form, story: e.target.value })} placeholder="Ej: Vive en una aldea en las montañas y entrena cada mañana." rows={2} />
        </label>
        <label>Primer mensaje
          <input value={form.first} onChange={(e) => setForm({ ...form, first: e.target.value })} placeholder="Ej: *te mira de reojo* ¿Quién eres tú?" />
        </label>
        <button className="btn">Crear personaje</button>
      </form>

      <h2>Tus personajes</h2>
      {personajes.length === 0 && <p className="sub">Todavía no creaste ninguno. Empieza con el formulario de arriba.</p>}
      <ul className="lista">
        {personajes.map((p) => (
          <li key={p.id} className="card item">
            <div>
              <strong>{p.name}</strong>
              <p>{p.personality}</p>
            </div>
            <div className="acciones">
              <button className="btn" onClick={() => abrir(p)}>Chatear</button>
              <button className="btn-texto" onClick={() => borrar(p.id)}>Borrar</button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
