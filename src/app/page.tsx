"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";
import MessageInput from "@/components/MessageInput";
import LoginModal from "@/components/LoginModal";

function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("l-gpt-visitor-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("l-gpt-visitor-id", id);
  }
  return id;
}

function getSavedPseudo(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("l-gpt-pseudo");
}

function savePseudo(pseudo: string) {
  localStorage.setItem("l-gpt-pseudo", pseudo);
}

function getSavedConversationId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("l-gpt-active-conv");
}

function saveConversationId(id: string | null) {
  if (id) {
    localStorage.setItem("l-gpt-active-conv", id);
  } else {
    localStorage.removeItem("l-gpt-active-conv");
  }
}

export default function Home() {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();
  const [visitorId, setVisitorId] = useState("");
  const [pseudo, setPseudo] = useState<string | null>(null);
  const [pseudoInput, setPseudoInput] = useState("");
  const [showPseudoModal, setShowPseudoModal] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  // Init visitor ID, pseudo, and last conversation
  useEffect(() => {
    setVisitorId(getOrCreateVisitorId());
    const saved = getSavedPseudo();
    if (saved) {
      setPseudo(saved);
    } else {
      setShowPseudoModal(true);
    }
    const savedConv = getSavedConversationId();
    if (savedConv) {
      setActiveConversationId(savedConv);
    }
  }, []);

  // Persist active conversation to localStorage
  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    saveConversationId(id);
  };

  const handleConversationCreated = (id: string) => {
    setActiveConversationId(id);
    saveConversationId(id);
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    saveConversationId(null);
  };

  // Redirect admin
  useEffect(() => {
    if (!loading && isAdmin) {
      router.push("/admin");
    }
  }, [isAdmin, loading, router]);

  const handlePseudoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = pseudoInput.trim();
    if (!trimmed) return;
    savePseudo(trimmed);
    setPseudo(trimmed);
    setShowPseudoModal(false);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#212121]">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center animate-pulse">
          <span className="text-lg font-bold text-white">L</span>
        </div>
      </div>
    );
  }

  if (isAdmin) return null;

  // Pseudo modal (first visit)
  if (showPseudoModal) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#212121] px-4">
        <div className="w-full max-w-md rounded-2xl bg-[#2a2a2a] border border-white/10 p-8 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="text-xl font-bold text-white">L</span>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-white text-center mb-2">
            Bienvenue sur L-GPT
          </h2>
          <p className="text-gray-400 text-sm text-center mb-6">
            Choisissez un pseudo pour commencer à discuter.
          </p>
          <form onSubmit={handlePseudoSubmit} className="space-y-4">
            <input
              type="text"
              value={pseudoInput}
              onChange={(e) => setPseudoInput(e.target.value)}
              className="w-full rounded-xl bg-[#1a1a1a] border border-white/10 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
              placeholder="Votre pseudo..."
              autoFocus
              required
              maxLength={30}
            />
            <button
              type="submit"
              disabled={!pseudoInput.trim()}
              className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-white font-medium hover:from-purple-500 hover:to-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Commencer
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        visitorId={visitorId}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />

      {/* Main chat area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2 ml-12 md:ml-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-sm shadow-purple-500/20">
              <span className="text-xs font-bold text-white">L</span>
            </div>
            <h1 className="text-sm font-semibold text-white">L-GPT</h1>
          </div>
          <div className="text-xs text-gray-600">
            Model: L-GPT v1
          </div>
        </header>

        {/* Chat */}
        <ChatArea conversationId={activeConversationId} visitorName={pseudo || "Visiteur"} />

        {/* Input */}
        <MessageInput
          conversationId={activeConversationId}
          visitorId={visitorId}
          visitorName={pseudo || "Visiteur"}
          onConversationCreated={handleConversationCreated}
        />
      </main>

      {/* Login button */}
      <button
        onClick={() => setLoginOpen(true)}
        className="fixed bottom-4 right-4 z-10 text-[11px] text-gray-600 hover:text-gray-400 transition-colors opacity-50 hover:opacity-100"
      >
        Se connecter
      </button>

      {/* Login modal */}
      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
