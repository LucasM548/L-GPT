"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    doc,
    updateDoc,
    serverTimestamp,
    Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Message {
    id: string;
    text: string;
    sender: "visitor" | "admin";
    createdAt: Timestamp;
}

interface AdminChatViewProps {
    conversationId: string;
}

export default function AdminChatView({ conversationId }: AdminChatViewProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Listen to messages
    useEffect(() => {
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

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [text]);

    // Typing indicator management
    const setTyping = useCallback(
        async (isTyping: boolean) => {
            try {
                await updateDoc(doc(db, "conversations", conversationId), {
                    adminTyping: isTyping,
                });
            } catch (e) {
                console.error("Failed to update typing status:", e);
            }
        },
        [conversationId]
    );

    const handleTextChange = (value: string) => {
        setText(value);

        // Set typing to true
        setTyping(true);

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set typing to false after 2 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
            setTyping(false);
        }, 2000);
    };

    // Cleanup typing timeout on unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            // Reset typing when leaving the conversation
            updateDoc(doc(db, "conversations", conversationId), {
                adminTyping: false,
            }).catch(() => { });
        };
    }, [conversationId]);

    const handleSend = async () => {
        const trimmed = text.trim();
        if (!trimmed || sending) return;

        setSending(true);
        setText("");

        // Clear typing timeout and set typing to false
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        try {
            await Promise.all([
                addDoc(collection(db, "conversations", conversationId, "messages"), {
                    text: trimmed,
                    sender: "admin",
                    createdAt: serverTimestamp(),
                }),
                updateDoc(doc(db, "conversations", conversationId), {
                    lastMessage: trimmed,
                    lastUpdatedAt: serverTimestamp(),
                    adminTyping: false,
                }),
            ]);
        } catch (error) {
            console.error("Error sending reply:", error);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex gap-3 ${msg.sender === "admin" ? "justify-end" : "justify-start"
                                }`}
                        >
                            {msg.sender === "visitor" && (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-xs font-bold text-white">V</span>
                                </div>
                            )}
                            <div
                                className={`max-w-[75%] rounded-2xl px-4 py-3 ${msg.sender === "admin"
                                    ? "bg-purple-600/20 border border-purple-500/30 text-purple-100"
                                    : "bg-[#2a2a2a] text-gray-200"
                                    }`}
                            >
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                    {msg.text}
                                </p>
                                <span className="text-[10px] text-gray-500 mt-1 block">
                                    {msg.createdAt?.toDate?.()
                                        ? msg.createdAt.toDate().toLocaleTimeString("fr-FR", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })
                                        : "..."}
                                </span>
                            </div>
                            {msg.sender === "admin" && (
                                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 mt-0.5 shadow-sm shadow-purple-500/20">
                                    <img src="/logo-small.png" alt="L-GPT" className="w-full h-full object-cover" />
                                </div>
                            )}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Reply input */}
            <div className="border-t border-white/5 p-4">
                <div className="max-w-3xl mx-auto flex items-end rounded-2xl bg-[#2a2a2a] border border-white/10 focus-within:border-purple-500/30 transition-colors">
                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => handleTextChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Répondre au visiteur..."
                        rows={1}
                        className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm px-4 py-3.5 outline-none resize-none max-h-[200px] custom-scrollbar"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!text.trim() || sending}
                        className="m-2 p-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 10l7-7m0 0l7 7m-7-7v18"
                            />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
