import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 font-sans">
      {/* Background Decorativo */}
      <div className="absolute top-0 -z-10 h-full w-full bg-slate-950">
        <div className="absolute bottom-auto left-auto right-0 top-0 h-[500px] w-[500px] -translate-x-[30%] translate-y-[20%] rounded-full bg-[rgba(173,109,244,0.5)] opacity-50 blur-[80px]"></div>
      </div>

      <div className="max-w-2xl w-full bg-white/5 backdrop-blur-xl border border-white/10 p-12 rounded-3xl shadow-2xl flex flex-col items-center">
        
        <h1 className="text-5xl font-extrabold mb-8 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
          Tauri + React
        </h1>

        {/* Logos con animación */}
        <div className="flex gap-8 mb-10">
          <a href="https://vite.dev" target="_blank" className="hover:scale-110 transition-transform duration-300">
            <img src="/vite.svg" className="h-16 w-16 drop-shadow-[0_0_15px_rgba(100,108,255,0.8)]" alt="Vite logo" />
          </a>
          <a href="https://tauri.app" target="_blank" className="hover:scale-110 transition-transform duration-300">
            <img src="/tauri.svg" className="h-16 w-16 drop-shadow-[0_0_15px_rgba(36,199,235,0.8)]" alt="Tauri logo" />
          </a>
          <a href="https://react.dev" target="_blank" className="hover:scale-110 transition-transform duration-300">
            <img src={reactLogo} className="h-16 w-16 drop-shadow-[0_0_15px_rgba(97,218,251,0.8)] animate-[spin_20s_linear_infinite]" alt="React logo" />
          </a>
        </div>

        <p className="text-slate-400 mb-8 text-center text-lg italic">
          Ready to build something <span className="text-cyan-400 font-semibold">legendary</span>.
        </p>

        {/* Formulario Estilizado */}
        <form
          className="w-full flex flex-col sm:flex-row gap-4 mb-8"
          onSubmit={(e) => {
            e.preventDefault();
            greet();
          }}
        >
          <input
            id="greet-input"
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-6 py-4 outline-none focus:ring-2 focus:ring-purple-500 transition-all text-white placeholder:text-slate-500"
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder="Enter your hero name..."
          />
          <button 
            type="submit"
            className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 px-8 py-4 rounded-xl font-bold uppercase tracking-wider shadow-lg active:scale-95 transition-all"
          >
            Greet
          </button>
        </form>

        {/* Mensaje de Respuesta */}
        {greetMsg && (
          <div className="w-full p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-center font-medium animate-pulse">
            {greetMsg}
          </div>
        )}
      </div>
    </main>
  );
}

export default App;