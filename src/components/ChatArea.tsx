"use client";

import { useEffect, useRef, useState } from "react";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Message {
    id: string;
    text: string;
    sender: "visitor" | "admin";
    createdAt: Timestamp;
}

interface ChatAreaProps {
    conversationId: string | null;
}

export default function ChatArea({ conversationId }: ChatAreaProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [adminTyping, setAdminTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Listen to messages
    useEffect(() => {
        if (!conversationId) {
            setMessages([]);
            return;
        }

        const q = query(
            collection(db, "conversations", conversationId, "messages"),
            orderBy("createdAt", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs: Message[] = snapshot.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            })) as Message[];
            setMessages(msgs);
        });

        return () => unsubscribe();
    }, [conversationId]);

    // Listen to typing indicator
    useEffect(() => {
        if (!conversationId) return;

        const unsubscribe = onSnapshot(
            doc(db, "conversations", conversationId),
            (snapshot) => {
                const data = snapshot.data();
                setAdminTyping(data?.adminTyping ?? false);
            }
        );

        return () => unsubscribe();
    }, [conversationId]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, adminTyping]);

    // Welcome screen
    if (!conversationId || messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center px-4">
                <div className="mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 mx-auto mb-4">
                        <span className="text-2xl font-bold text-white">L</span>
                    </div>
                    <h1 className="text-2xl font-semibold text-white text-center">
                        Comment puis-je vous aider ?
                    </h1>
                    <p className="text-gray-500 text-sm text-center mt-2">
                        Posez-moi n&apos;importe quelle question.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
                    {[
                        { emoji: "💡", text: "Expliquez-moi un concept complexe" },
                        { emoji: "✍️", text: "Aidez-moi à rédiger un texte" },
                        { emoji: "🧠", text: "Analysez des données" },
                        { emoji: "🚀", text: "Donnez-moi des idées de projets" },
                    ].map((suggestion, i) => (
                        <button
                            key={i}
                            className="group flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left text-sm text-gray-400 hover:bg-white/5 hover:border-white/20 transition-all"
                        >
                            <span className="text-lg">{suggestion.emoji}</span>
                            <span className="group-hover:text-gray-300 transition-colors">
                                {suggestion.text}
                            </span>
                        </button>
                    ))}
                </div>

                {messages.length > 0 && null}
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex gap-3 ${msg.sender === "visitor" ? "justify-end" : "justify-start"
                            } animate-message-in`}
                    >
                        {msg.sender === "admin" && (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-purple-500/20">
                                <span className="text-xs font-bold text-white">L</span>
                            </div>
                        )}
                        <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.sender === "visitor"
                                    ? "bg-[#2a2a2a] text-white"
                                    : "bg-transparent text-gray-200"
                                }`}
                        >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {msg.text}
                            </p>
                        </div>
                    </div>
                ))}

                {/* Typing indicator */}
                {adminTyping && (
                    <div className="flex gap-3 animate-message-in">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-purple-500/20">
                            <span className="text-xs font-bold text-white">L</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0ms]" />
                                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:150ms]" />
                                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:300ms]" />
                            </div>
                            <span className="text-gray-500 text-xs">L-GPT est en train d&apos;écrire...</span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>
        </div>
    );
}
