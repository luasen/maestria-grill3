import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../services/db';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { MessageSquare } from 'lucide-react';

interface ChatButtonWithBadgeProps {
  orderId: string;
  onClick: (e: React.MouseEvent) => void;
  variant?: 'outline' | 'filled';
  size?: 'sm' | 'md' | 'full' | 'icon';
}

export default function ChatButtonWithBadge({ orderId, onClick, variant = 'outline', size = 'md' }: ChatButtonWithBadgeProps) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !orderId) return;

    let isMounted = true;

    const checkUnread = async () => {
      try {
        const msgs = await dbService.getOrderMessages(orderId);
        if (!isMounted) return;
        let count = 0;
        for (const m of msgs) {
          const readBy = m.readBy || [];
          if (m.senderId !== user.uid && !readBy.includes(user.uid)) {
            count++;
          }
        }
        setUnreadCount(count);
      } catch {}
    };

    checkUnread();

    let channel: any = null;
    if (isSupabaseConfigured) {
      try {
        channel = supabase
          .channel(`order_badge_${orderId}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'order_messages', filter: `order_id=eq.${orderId}` },
            () => {
              checkUnread();
            }
          )
          .subscribe();
      } catch {}
    }

    const interval = setInterval(checkUnread, 15000);

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [orderId, user]);

  const buttonClasses = () => {
    const base = "relative flex items-center justify-center gap-2 rounded-xl font-bold transition active:scale-95";
    
    // Sizes
    let sizeClass = "h-9 px-3 text-xs";
    if (size === 'icon') sizeClass = "h-9 w-9 p-0 rounded-xl shrink-0";
    if (size === 'md') sizeClass = "h-11 px-4 text-xs";
    if (size === 'full') sizeClass = "w-full h-11 px-4 text-xs mt-3";

    // Variants
    let variantClass = "bg-orange-500/10 text-orange-600 border border-orange-500/10 hover:bg-orange-500/20";
    if (variant === 'filled') {
      variantClass = "bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-500/10";
    }

    return `${base} ${sizeClass} ${variantClass}`;
  };

  return (
    <button type="button" onClick={onClick} className={buttonClasses()}>
      <MessageSquare className="h-4.5 w-4.5" />
      {size !== 'icon' && (
        <span>
          {size === 'full' ? 'Conversar no Chat do Pedido' : 'Chat'}
        </span>
      )}
      
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white ring-2 ring-white animate-bounce shadow-md">
          {unreadCount}
        </span>
      )}
    </button>
  );
}
