"use client";

import { useEffect, useState } from "react";
import {
    collection,
    query,
    where,
    onSnapshot,
    Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Conversation {
    id: string;
    visitorName: string;
    lastMessage: string;
    lastUpdatedAt: Timestamp;
    createdAt: Timestamp;
}

interface SidebarProps {
    visitorId: string;
    activeConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onNewConversation: () => void;
}

export default function Sidebar({
    visitorId,
    activeConversationId,
    onSelectConversation,
    onNewConversation,
}: SidebarProps) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!visitorId) return;

        const q = query(
            collection(db, "conversations"),
            where("visitorId", "==", visitorId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const convs: Conversation[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Conversation[];
            // Sort client-side (most recent first) to avoid composite index requirement
            convs.sort((a, b) => {
                const timeA = a.lastUpdatedAt?.toMillis?.() ?? 0;
                const timeB = b.lastUpdatedAt?.toMillis?.() ?? 0;
                return timeB - timeA;
            });
            setConversations(convs);
        });

        return () => unsubscribe();
    }, [visitorId]);

    const formatDate = (timestamp: Timestamp) => {
        if (!timestamp) return "";
        const date = timestamp.toDate();
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return "Aujourd'hui";
        if (days === 1) return "Hier";
        if (days < 7) return `Il y a ${days} jours`;
        return date.toLocaleDateString("fr-FR");
    };

    return (
        <>
            {/* Mobile toggle */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed top-4 left-4 z-30 md:hidden p-2 rounded-lg bg-[#171717] border border-white/10 text-gray-400 hover:text-white transition-colors"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/50 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed md:relative z-20 h-full w-72 bg-[#171717] border-r border-white/5 flex flex-col transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                    }`}
            >
                {/* Header */}
                <div className="p-4 border-b border-white/5">
                    <button
                        onClick={onNewConversation}
                        className="w-full flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nouvelle conversation
                    </button>
                </div>

                {/* Conversation list */}
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
                    {conversations.map((conv) => (
                        <button
                            key={conv.id}
                            onClick={() => {
                                onSelectConversation(conv.id);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left rounded-lg px-3 py-3 group transition-colors ${activeConversationId === conv.id
                                ? "bg-white/10 text-white"
                                : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 shrink-0 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                                <span className="text-sm truncate">
                                    {conv.lastMessage || "Nouvelle conversation"}
                                </span>
                            </div>
                            <span className="text-xs text-gray-600 ml-6 mt-0.5 block">
                                {formatDate(conv.lastUpdatedAt)}
                            </span>
                        </button>
                    ))}

                    {conversations.length === 0 && (
                        <div className="text-center text-gray-600 text-sm py-8">
                            Aucune conversation
                        </div>
                    )}
                </div>

                {/* Branding */}
                <div className="p-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-gray-500">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white">L</span>
                        </div>
                        <span className="text-xs">L-GPT</span>
                    </div>
                </div>
            </aside>
        </>
    );
}
