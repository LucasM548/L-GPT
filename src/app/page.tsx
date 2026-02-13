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

export default function Home() {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();
  const [visitorId, setVisitorId] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    setVisitorId(getOrCreateVisitorId());
  }, []);

  useEffect(() => {
    if (!loading && isAdmin) {
      router.push("/admin");
    }
  }, [isAdmin, loading, router]);

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

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        visitorId={visitorId}
        activeConversationId={activeConversationId}
        onSelectConversation={(id) => setActiveConversationId(id)}
        onNewConversation={() => setActiveConversationId(null)}
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
        <ChatArea conversationId={activeConversationId} />

        {/* Input */}
        <MessageInput
          conversationId={activeConversationId}
          visitorId={visitorId}
          onConversationCreated={(id) => setActiveConversationId(id)}
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
