"use client";

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import {
    collection,
    addDoc,
    doc,
    setDoc,
    updateDoc,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface MessageInputProps {
    conversationId: string | null;
    visitorId: string;
    visitorName: string;
    onConversationCreated: (id: string) => void;
}

export interface MessageInputHandle {
    focus: () => void;
}

const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(function MessageInput({
    conversationId,
    visitorId,
    visitorName,
    onConversationCreated,
}, ref) {
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Expose focus method to parent
    useImperativeHandle(ref, () => ({
        focus: () => {
            textareaRef.current?.focus();
        },
    }));

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [text]);

    const handleSend = async () => {
        const trimmed = text.trim();
        if (!trimmed || sending) return;

        setSending(true);
        setText("");

        try {
            let convId = conversationId;

            // Create new conversation if needed
            if (!convId) {
                const convRef = doc(collection(db, "conversations"));
                convId = convRef.id;
                await setDoc(convRef, {
                    visitorId,
                    visitorName,
                    lastMessage: trimmed,
                    lastUpdatedAt: serverTimestamp(),
                    createdAt: serverTimestamp(),
                    adminTyping: false,
                });
                onConversationCreated(convId);
            } else {
                // Update conversation preview
                await updateDoc(doc(db, "conversations", convId), {
                    lastMessage: trimmed,
                    lastUpdatedAt: serverTimestamp(),
                });
            }

            // Add message
            await addDoc(collection(db, "conversations", convId, "messages"), {
                text: trimmed,
                sender: "visitor",
                createdAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("Error sending message:", error);
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
        <div className="border-t border-white/5 bg-[#212121] safe-bottom">
            <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2.5 sm:py-4">
                <div className="relative flex items-end rounded-2xl bg-[#2a2a2a] border border-white/10 focus-within:border-white/20 transition-colors">
                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Envoyer un message à L-GPT..."
                        rows={1}
                        className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm px-4 py-3.5 outline-none resize-none max-h-[200px] custom-scrollbar"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!text.trim() || sending}
                        className="m-2 p-2 rounded-xl bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
                <p className="hidden sm:block text-[11px] text-gray-600 text-center mt-2">
                    L-GPT peut faire des erreurs. Vérifiez les informations importantes.
                </p>
            </div>
        </div>
    );
});

export default MessageInput;
