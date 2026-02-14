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
    visitorName?: string;
}

export default function ChatArea({ conversationId, visitorName }: ChatAreaProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [adminTyping, setAdminTyping] = useState(false);
    const [hasAdminReplied, setHasAdminReplied] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Listen to messages
    useEffect(() => {
        if (!conversationId) {
            setMessages([]);
            setHasAdminReplied(false);
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
            // Check if admin has ever replied in this conversation
            setHasAdminReplied(msgs.some((m) => m.sender === "admin"));
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

    // Welcome screen (no conversation selected)
    if (!conversationId) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center px-4">
                <div className="mb-4 sm:mb-8">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 mx-auto mb-3 sm:mb-4">
                        <span className="text-xl sm:text-2xl font-bold text-white">L</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-white text-center">
                        <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">Bonjour, {visitorName || "Visiteur"}</span>
                    </h1>
                    <p className="text-gray-500 text-xs sm:text-sm text-center mt-1.5 sm:mt-2">
                        Comment puis-je vous aider aujourd&apos;hui ?
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3 max-w-2xl w-full">
                    {[
                        { emoji: "💡", text: "Expliquez-moi un concept complexe" },
                        { emoji: "✍️", text: "Aidez-moi à rédiger un texte" },
                        { emoji: "🧠", text: "Analysez des données" },
                        { emoji: "🚀", text: "Donnez-moi des idées de projets" },
                    ].map((suggestion, i) => (
                        <button
                            key={i}
                            className={`group flex items-start gap-2 sm:gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:p-4 text-left text-xs sm:text-sm text-gray-400 hover:bg-white/5 hover:border-white/20 transition-all active:scale-[0.97] ${i >= 2 ? "hidden sm:flex" : ""}`}
                        >
                            <span className="text-base sm:text-lg">{suggestion.emoji}</span>
                            <span className="group-hover:text-gray-300 transition-colors leading-tight">
                                {suggestion.text}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Determine if we should show the waiting indicator
    // Show it when: there are visitor messages, admin is not typing, and admin hasn't replied yet to the last message
    const lastMessage = messages[messages.length - 1];
    const showWaiting =
        messages.length > 0 &&
        !adminTyping &&
        lastMessage?.sender === "visitor";

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

                {/* Waiting indicator — visitor sent a message, admin hasn't replied yet and isn't typing */}
                {showWaiting && !hasAdminReplied && (
                    <div className="flex gap-3 animate-message-in">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600/40 to-indigo-600/40 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-white/60">L</span>
                        </div>
                        <div className="flex items-center gap-2 text-amber-400/80 text-sm">
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs">Votre message a été reçu. Vous êtes en file d&apos;attente, une réponse arrive bientôt !</span>
                        </div>
                    </div>
                )}

                {/* Waiting indicator — admin already replied before, but last message is from visitor */}
                {showWaiting && hasAdminReplied && (
                    <div className="flex gap-3 animate-message-in">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600/40 to-indigo-600/40 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-white/60">L</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <svg className="w-4 h-4 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span className="text-xs">L-GPT analyse votre message...</span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>
        </div>
    );
}
