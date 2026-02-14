"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AdminSessionList from "@/components/admin/AdminSessionList";
import AdminChatView from "@/components/admin/AdminChatView";

export default function AdminDashboard() {
    const { isAdmin, loading, logout } = useAuth();
    const router = useRouter();
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && !isAdmin) {
            router.push("/");
        }
    }, [isAdmin, loading, router]);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#212121]">
                <div className="w-10 h-10 rounded-2xl overflow-hidden animate-pulse">
                    <img src="/logo-small.png" alt="L-GPT" className="w-full h-full object-cover" />
                </div>
            </div>
        );
    }

    if (!isAdmin) return null;

    return (
        <div className="h-screen flex flex-col overflow-hidden">
            {/* Admin header */}
            <header className="flex items-center justify-between px-6 py-3 bg-[#171717] border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg overflow-hidden shadow-sm shadow-purple-500/20">
                        <img src="/logo-small.png" alt="L-GPT" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold text-white">L-GPT</h1>
                        <p className="text-[11px] text-gray-500">Receiver Dashboard</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-500 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        En ligne
                    </span>
                    <button
                        onClick={async () => {
                            await logout();
                            router.push("/");
                        }}
                        className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20"
                    >
                        Déconnexion
                    </button>
                </div>
            </header>

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Session list */}
                <AdminSessionList
                    activeConversationId={activeConversationId}
                    onSelectConversation={(id) => setActiveConversationId(id)}
                />

                {/* Chat view or placeholder */}
                {activeConversationId ? (
                    <AdminChatView conversationId={activeConversationId} />
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border border-purple-500/10 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-purple-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </div>
                            <h2 className="text-lg font-medium text-gray-400">
                                Sélectionnez une conversation
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Cliquez sur une session à gauche pour y répondre
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
