import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../services/db';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { 
  X, 
  Send, 
  MessageSquare, 
  User, 
  Bike, 
  ShieldCheck, 
  Clock, 
  Check, 
  CheckCheck,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OrderChatModalProps {
  orderId: string;
  orderNumber: string;
  customerName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'cliente' | 'motoboy' | 'admin' | 'superadmin';
  text: string;
  createdAt: string;
  readBy: string[];
}

export default function OrderChatModal({ orderId, orderNumber, customerName, isOpen, onClose }: OrderChatModalProps) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isOrderDelivered, setIsOrderDelivered] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Check order status
  useEffect(() => {
    if (!orderId || !isOpen) return;

    dbService.getOrders().then(orders => {
      const current = orders.find(o => o.id === orderId);
      if (current) {
        setIsOrderDelivered(current.status === 'delivered' || (current as any).statusEntrega === 'entregue');
      }
    });
  }, [orderId, isOpen]);

  // 2. Fetch messages & listen via Supabase Realtime
  const loadMessages = async () => {
    if (!orderId) return;
    try {
      const msgs = await dbService.getOrderMessages(orderId);
      setMessages(msgs);
      if (user) {
        dbService.markOrderMessagesAsRead(orderId, user.uid);
      }
    } catch (e) {
      console.warn('Error loading messages:', e);
    }
  };

  useEffect(() => {
    if (!isOpen || !orderId || !user) return;

    loadMessages();

    let channel: any = null;
    if (isSupabaseConfigured) {
      try {
        channel = supabase
          .channel(`order_chat_room_${orderId}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'order_messages', filter: `order_id=eq.${orderId}` },
            () => {
              loadMessages();
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Supabase chat realtime subscription error:', err);
      }
    }

    const interval = setInterval(loadMessages, 4000);

    return () => {
      if (channel) supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [isOpen, orderId, user]);

  // 3. Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || isSending || isOrderDelivered) return;

    setIsSending(true);
    const textToSend = newMessage.trim();
    setNewMessage('');

    try {
      const sent = await dbService.sendOrderMessage({
        orderId,
        senderId: user.uid,
        senderName: profile?.name || user.displayName || 'Usuário',
        senderRole: profile?.role || 'cliente',
        text: textToSend,
      });

      setMessages(prev => [...prev, sent]);
    } catch (error) {
      console.error("Error sending message:", error);
      setNewMessage(textToSend);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'superadmin':
        return <span className="text-[8px] font-extrabold uppercase bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-md tracking-wider">Super Admin</span>;
      case 'admin':
        return <span className="text-[8px] font-extrabold uppercase bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md tracking-wider">Suporte</span>;
      case 'motoboy':
        return <span className="text-[8px] font-extrabold uppercase bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md tracking-wider">Motoboy</span>;
      default:
        return <span className="text-[8px] font-extrabold uppercase bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-md tracking-wider">Cliente</span>;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm">
        {/* Backdrop close */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ y: '100%', opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0.8 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[85vh] sm:h-[620px] border border-gray-100 z-10"
        >
          {/* Header */}
          <div className="p-5 border-b border-gray-100 bg-white flex items-center justify-between shadow-sm relative z-10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-600 border border-orange-500/10">
                  <MessageSquare className="h-5 w-5" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-black text-gray-900 leading-tight">Chat do Pedido #{orderNumber}</h3>
                </div>
                <p className="text-[11px] font-medium text-gray-400 mt-0.5">Cliente: {customerName}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Delivered Notice Banner */}
          {isOrderDelivered && (
            <div className="bg-amber-50 border-b border-amber-200/60 px-4 py-2 flex items-center gap-2 text-amber-800 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>Este pedido foi finalizado. O chat está no modo somente leitura.</span>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/60">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-400 mb-2">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold text-gray-600">Nenhuma mensagem ainda</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Tire dúvidas sobre o pedido diretamente com a nossa equipe!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = user?.uid === msg.senderId;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[10px] font-bold text-gray-500">{msg.senderName}</span>
                      {getRoleBadge(msg.senderRole)}
                    </div>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                        isMe
                          ? 'bg-orange-600 text-white rounded-br-none'
                          : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                      <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${isMe ? 'text-orange-200' : 'text-gray-400'}`}>
                        <span>
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ''}
                        </span>
                        {isMe && (
                          msg.readBy && msg.readBy.length > 1 ? (
                            <CheckCheck className="h-3 w-3 text-white" />
                          ) : (
                            <Check className="h-3 w-3 text-orange-300" />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          {!isOrderDelivered ? (
            <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 bg-white flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1 rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-xs text-gray-800 outline-none focus:border-orange-500 focus:bg-white transition"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="h-11 w-11 rounded-2xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white flex items-center justify-center transition shadow-md shadow-orange-500/10 shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <div className="p-4 border-t border-gray-100 bg-gray-50 text-center text-xs text-gray-400">
              Chat encerrado para este pedido.
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
