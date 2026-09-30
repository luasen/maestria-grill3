import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../services/db';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { 
  Search, 
  Download, 
  MessageSquare, 
  Bike, 
  Send, 
  Check, 
  CheckCheck, 
  AlertCircle,
  Inbox,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'cliente' | 'motoboy' | 'admin' | 'superadmin';
  text: string;
  createdAt: string;
  readBy: string[];
}

export default function AdminChatDashboard() {
  const { orders } = useApp();
  const { user, profile } = useAuth();
  
  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  
  // Real-time Chat States for the selected order
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isOrderDelivered, setIsOrderDelivered] = useState(false);
  
  // Unread badge map for all chats
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter orders to only get those with chats
  const chatOrders = orders.filter(
    (order) => order.tipoPedido === 'entrega' && order.motoboyId
  );

  // Check unread counts
  const refreshUnreadCounts = async () => {
    if (!user) return;
    const counts: Record<string, number> = {};
    for (const order of chatOrders) {
      try {
        const msgs = await dbService.getOrderMessages(order.id);
        let count = 0;
        for (const m of msgs) {
          const readBy = m.readBy || [];
          if (m.senderId !== user.uid && !readBy.includes(user.uid)) {
            count++;
          }
        }
        counts[order.id] = count;
      } catch {}
    }
    setUnreadCounts(counts);
  };

  useEffect(() => {
    refreshUnreadCounts();
    const interval = setInterval(refreshUnreadCounts, 15000);
    return () => clearInterval(interval);
  }, [chatOrders.length, user]);

  // Load messages for selected order
  const loadSelectedMessages = async () => {
    if (!selectedOrder || !user) {
      setMessages([]);
      return;
    }

    try {
      const msgs = await dbService.getOrderMessages(selectedOrder.id);
      setMessages(msgs);
      setIsOrderDelivered(selectedOrder.status === 'delivered' || selectedOrder.statusEntrega === 'entregue');
      await dbService.markOrderMessagesAsRead(selectedOrder.id, user.uid);
      setUnreadCounts(prev => ({ ...prev, [selectedOrder.id]: 0 }));
    } catch (e) {
      console.warn('Error loading chat messages:', e);
    }
  };

  useEffect(() => {
    loadSelectedMessages();

    let channel: any = null;
    if (isSupabaseConfigured && selectedOrder) {
      try {
        channel = supabase
          .channel(`admin_chat_room_${selectedOrder.id}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'order_messages', filter: `order_id=eq.${selectedOrder.id}` },
            () => {
              loadSelectedMessages();
            }
          )
          .subscribe();
      } catch {}
    }

    const interval = setInterval(() => {
      if (selectedOrder) {
        loadSelectedMessages();
      }
    }, 4000);

    return () => {
      if (channel) supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [selectedOrder, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filter conversations
  const filteredConversations = chatOrders.filter((order) => {
    const matchesSearch = 
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.motoboyName && order.motoboyName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (startDate || endDate) {
      const orderTime = new Date(order.horarioPedido || order.createdAt).getTime();
      if (startDate) {
        const start = new Date(startDate).getTime();
        if (orderTime < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate).setHours(23, 59, 59, 999);
        if (orderTime > end) return false;
      }
    }

    return matchesSearch;
  });

  const handleSendAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || isSending || isOrderDelivered || !selectedOrder) return;

    setIsSending(true);
    const textToSend = newMessage.trim();
    setNewMessage('');

    try {
      const sent = await dbService.sendOrderMessage({
        orderId: selectedOrder.id,
        senderId: user.uid,
        senderName: profile?.name || 'Suporte Maestria Grill',
        senderRole: profile?.role || 'admin',
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

  const handleExportChat = (orderToExport: any, chatMessages: ChatMessage[]) => {
    if (chatMessages.length === 0) return;

    let content = `==================================================\n`;
    content += `RELATÓRIO DE CONVERSA - CHAT DO PEDIDO\n`;
    content += `Pedido ID: ${orderToExport.id.toUpperCase()}\n`;
    content += `Data do Pedido: ${new Date(orderToExport.horarioPedido || orderToExport.createdAt).toLocaleString()}\n`;
    content += `Cliente: ${orderToExport.customerName}\n`;
    content += `Status do Pedido: ${orderToExport.status === 'delivered' ? 'ENTREGUE' : 'EM TRÂNSITO'}\n`;
    content += `Exportado em: ${new Date().toLocaleString()}\n`;
    content += `==================================================\n\n`;

    chatMessages.forEach((msg) => {
      const time = new Date(msg.createdAt).toLocaleString();
      const roleUpper = msg.senderRole.toUpperCase();
      content += `[${time}] ${msg.senderName} (${roleUpper}): ${msg.text}\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `conversa_${orderToExport.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden min-h-[500px] flex flex-col md:flex-row">
      
      {/* 1. LEFT PANE: Conversation list */}
      <div className="w-full md:w-80 border-r border-gray-100 flex flex-col bg-gray-50/20">
        
        {/* Header and Search Filters */}
        <div className="p-4 border-b border-gray-100 flex flex-col gap-3 bg-white">
          <div className="flex items-center justify-between">
            <h4 className="font-sans text-sm font-black text-gray-900 flex items-center gap-1.5">
              <MessageSquare className="h-5 w-5 text-orange-600" />
              Central de Chats
            </h4>
            <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-lg font-black uppercase">
              {filteredConversations.length} Ativos
            </span>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por pedido ou cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold outline-none focus:border-orange-500 focus:bg-white transition"
            />
          </div>

          {/* Period Filter */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] font-black uppercase text-gray-400">De (Início)</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-100 rounded-xl px-2.5 py-1 text-[10px] font-semibold bg-gray-50 outline-none focus:border-orange-500"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] font-black uppercase text-gray-400">Até (Fim)</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-100 rounded-xl px-2.5 py-1 text-[10px] font-semibold bg-gray-50 outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto max-h-[400px] md:max-h-[500px]">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
              <Inbox className="h-8 w-8 mb-2 text-gray-300" />
              <h5 className="text-xs font-bold">Nenhum chat encontrado</h5>
              <p className="text-[10px] text-gray-400 max-w-[180px] mt-1 font-semibold leading-relaxed">
                Tente alterar os termos de busca ou filtros de período.
              </p>
            </div>
          ) : (
            filteredConversations.map((order) => {
              const isSelected = selectedOrder?.id === order.id;
              const unread = unreadCounts[order.id] || 0;
              const delivered = order.status === 'delivered' || order.statusEntrega === 'entregue';

              return (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`w-full p-4 border-b border-gray-100 flex flex-col gap-1 text-left transition relative ${
                    isSelected 
                      ? 'bg-orange-500/5 border-l-4 border-l-orange-600' 
                      : 'hover:bg-gray-100/50 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start gap-1">
                    <span className="text-[11px] font-black text-gray-950 uppercase tracking-wider">
                      {order.customerName}
                    </span>
                    <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-500/5">
                      {order.id.slice(-6).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold">
                    <Bike className="h-3 w-3 shrink-0" />
                    <span className="truncate">Entrega: {order.motoboyName || 'Motoboy'}</span>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-50">
                    <span className="text-[9px] text-gray-400 font-bold">
                      {new Date(order.horarioPedido || order.createdAt).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}
                    </span>
                    
                    <div className="flex items-center gap-1.5">
                      {delivered ? (
                        <span className="text-[8px] font-extrabold uppercase bg-gray-100 text-gray-500 px-1.5 py-0.2 rounded-md">
                          Finalizado
                        </span>
                      ) : (
                        <span className="text-[8px] font-extrabold uppercase bg-emerald-50 text-emerald-600 px-1.5 py-0.2 rounded-md animate-pulse">
                          Ativo
                        </span>
                      )}

                      {unread > 0 && (
                        <span className="h-5 w-5 bg-rose-600 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-md animate-bounce">
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 2. RIGHT PANE: Chat conversation */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedOrder ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-600">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-gray-900 leading-tight">
                    Chat Pedido #{selectedOrder.id.slice(-6).toUpperCase()}
                  </h4>
                  <p className="text-[10px] font-bold text-gray-400">
                    Cliente: {selectedOrder.customerName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleExportChat(selectedOrder, messages)}
                disabled={messages.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-[10px] font-bold transition disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" />
                Exportar Histórico
              </button>
            </div>

            {/* Delivered Notice Banner */}
            {isOrderDelivered && (
              <div className="bg-amber-50 border-b border-amber-200/60 px-4 py-2 flex items-center gap-2 text-amber-800 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Pedido finalizado. O chat está no modo histórico.</span>
              </div>
            )}

            {/* Messages body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/40 max-h-[380px]">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                  <p className="text-xs font-bold text-gray-500">Nenhuma mensagem neste pedido ainda.</p>
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
                        <span className="text-[8px] font-extrabold uppercase bg-gray-100 text-gray-600 px-1 py-0.5 rounded">
                          {msg.senderRole}
                        </span>
                      </div>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
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

            {/* Admin Input form */}
            {!isOrderDelivered ? (
              <form onSubmit={handleSendAdminMessage} className="p-3 border-t border-gray-100 bg-white flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Responder como suporte..."
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
              <div className="p-3 border-t border-gray-100 bg-gray-50 text-center text-xs text-gray-400">
                Chat encerrado para este pedido.
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
            <MessageSquare className="h-12 w-12 text-gray-200 mb-3" />
            <h5 className="text-sm font-bold text-gray-600">Selecione uma conversa</h5>
            <p className="text-xs text-gray-400 max-w-xs mt-1">
              Escolha um dos pedidos na lista lateral para visualizar e responder o chat em tempo real.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
