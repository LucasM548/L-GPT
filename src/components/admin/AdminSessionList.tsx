"use client";

import { useEffect, useState } from "react";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Conversation {
    id: string;
    visitorId: string;
    visitorName: string;
    lastMessage: string;
    lastUpdatedAt: Timestamp;
    createdAt: Timestamp;
    adminTyping: boolean;
}

interface AdminSessionListProps {
    activeConversationId: string | null;
    onSelectConversation: (id: string) => void;
}

export default function AdminSessionList({
    activeConversationId,
    onSelectConversation,
}: AdminSessionListProps) {
    const [conversations, setConversations] = useState<Conversation[]>([]);

    useEffect(() => {
        const q = query(
            collection(db, "conversations"),
            orderBy("lastUpdatedAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const convs: Conversation[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Conversation[];
            setConversations(convs);
        });

        return () => unsubscribe();
    }, []);

    const formatTime = (timestamp: Timestamp) => {
        if (!timestamp) return "";
        const date = timestamp.toDate();
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "À l'instant";
        if (mins < 60) return `Il y a ${mins}m`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `Il y a ${hours}h`;
        return date.toLocaleDateString("fr-FR");
    };

    return (
        <div className="w-80 bg-[#171717] border-r border-white/5 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-white/5">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Sessions actives
                    <span className="text-gray-500 font-normal">({conversations.length})</span>
                </h2>
            </div>

            {/* Session list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {conversations.map((conv) => (
                    <button
                        key={conv.id}
                        onClick={() => onSelectConversation(conv.id)}
                        className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors ${activeConversationId === conv.id
                                ? "bg-white/10"
                                : "hover:bg-white/5"
                            }`}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-white flex items-center gap-2">
                                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-xs text-white font-semibold">
                                    {conv.visitorName?.charAt(0) || "V"}
                                </span>
                                {conv.visitorName || "Visiteur"}
                            </span>
                            <span className="text-[11px] text-gray-500">
                                {formatTime(conv.lastUpdatedAt)}
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 truncate ml-9">
                            {conv.lastMessage || "..."}
                        </p>
                    </button>
                ))}

                {conversations.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500 text-sm">Aucune session active</p>
                        <p className="text-gray-600 text-xs mt-1">
                            En attente de visiteurs...
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
