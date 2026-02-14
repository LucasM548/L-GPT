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
    getDoc,
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
    onBack?: () => void;
}

export default function AdminChatView({ conversationId, onBack }: AdminChatViewProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [visitorName, setVisitorName] = useState("Visiteur");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch visitor name for the chat header
    useEffect(() => {
        const fetchConv = async () => {
            try {
                const snap = await getDoc(doc(db, "conversations", conversationId));
                if (snap.exists()) {
                    setVisitorName(snap.data().visitorName || "Visiteur");
                }
            } catch { /* ignore */ }
        };
        fetchConv();
    }, [conversationId]);

    // Handle mobile keyboard resize via visualViewport API
    useEffect(() => {
        const viewport = window.visualViewport;
        if (!viewport) return;

        const handleResize = () => {
            if (containerRef.current) {
                containerRef.current.style.height = `${viewport.height}px`;
            }
        };

        viewport.addEventListener("resize", handleResize);
        viewport.addEventListener("scroll", handleResize);

        return () => {
            viewport.removeEventListener("resize", handleResize);
            viewport.removeEventListener("scroll", handleResize);
        };
    }, []);

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
        setTyping(true);

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

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
        <div ref={containerRef} className="flex-1 flex flex-col h-full">
            {/* Mobile chat header with back button */}
            <div className="md:hidden flex items-center gap-3 px-3 py-2.5 border-b border-white/5 bg-[#171717] shrink-0">
                <button
                    onClick={onBack}
                    className="p-1.5 -ml-1 rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors"
                    aria-label="Retour"
                >
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="flex items-center gap-2 min-w-0">
                    <span className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-xs text-white font-semibold shrink-0">
                        {visitorName.charAt(0)?.toUpperCase() || "V"}
                    </span>
                    <span className="text-sm font-medium text-white truncate">{visitorName}</span>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex gap-2 sm:gap-3 ${msg.sender === "admin" ? "justify-end" : "justify-start"
                                }`}
                        >
                            {msg.sender === "visitor" && (
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-[10px] sm:text-xs font-bold text-white">
                                        {visitorName.charAt(0)?.toUpperCase() || "V"}
                                    </span>
                                </div>
                            )}
                            <div
                                className={`max-w-[80%] sm:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 ${msg.sender === "admin"
                                    ? "bg-purple-600/20 border border-purple-500/30 text-purple-100"
                                    : "bg-[#2a2a2a] text-gray-200"
                                    }`}
                            >
                                <p className="text-[13px] sm:text-sm leading-relaxed whitespace-pre-wrap">
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
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden shrink-0 mt-0.5 shadow-sm shadow-purple-500/20">
                                    <img src="/logo-small.png" alt="L-GPT" className="w-full h-full object-cover" />
                                </div>
                            )}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Reply input */}
            <div className="border-t border-white/5 px-2 sm:px-4 py-2 sm:py-4 safe-bottom shrink-0">
                <div className="max-w-3xl mx-auto flex items-end rounded-2xl bg-[#2a2a2a] border border-white/10 focus-within:border-purple-500/30 transition-colors">
                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => handleTextChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Répondre au visiteur..."
                        rows={1}
                        className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm px-3 sm:px-4 py-3 outline-none resize-none max-h-[200px] custom-scrollbar"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!text.trim() || sending}
                        className="m-1.5 sm:m-2 p-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
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
