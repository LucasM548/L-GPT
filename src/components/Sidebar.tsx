"use client";

import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
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

export interface SidebarHandle {
    toggle: () => void;
}

const Sidebar = forwardRef<SidebarHandle, SidebarProps>(function Sidebar({
    visitorId,
    activeConversationId,
    onSelectConversation,
    onNewConversation,
}, ref) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useImperativeHandle(ref, () => ({
        toggle: () => setIsOpen((prev) => !prev),
    }));

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
                const aTime = a.lastUpdatedAt?.toMillis?.() || 0;
                const bTime = b.lastUpdatedAt?.toMillis?.() || 0;
                return bTime - aTime;
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
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/50 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed md:relative inset-y-0 left-0 z-30 w-72 bg-[#171717] border-r border-white/5
                    transform transition-transform duration-300 ease-in-out flex flex-col
                    ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                    }`}
            >
                {/* Header */}
                <div className="p-4 border-b border-white/5">
                    <button
                        onClick={() => { onNewConversation(); setIsOpen(false); }}
                        className="w-full flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nouvelle conversation
                    </button>
                </div>

                {/* Conversation list */}
                <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
                    {conversations.map((conv) => (
                        <button
                            key={conv.id}
                            onClick={() => {
                                onSelectConversation(conv.id);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors active:scale-[0.98] ${activeConversationId === conv.id
                                ? "bg-white/10"
                                : "hover:bg-white/5"
                                }`}
                        >
                            <svg className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-200 truncate">
                                        {conv.lastMessage || "Nouvelle conversation"}
                                    </span>
                                </div>
                                <span className="text-[11px] text-gray-600 mt-0.5 block">
                                    {formatDate(conv.lastUpdatedAt)}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Branding */}
                <div className="p-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-gray-500">
                        <div className="w-6 h-6 rounded-lg overflow-hidden">
                            <img src="/logo-small.png" alt="L-GPT" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs">L-GPT</span>
                    </div>
                </div>
            </aside>
        </>
    );
});

export default Sidebar;
