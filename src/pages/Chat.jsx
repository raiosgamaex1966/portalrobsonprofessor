import React, { useState, useEffect, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { MessageSquare, Send, ArrowLeft, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

export default function Chat() {
  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      loadMessages();
      markAsRead();

      // Subscribe to real-time messages
      const unsubscribe = base44.entities.ChatMessage.subscribe((event) => {
        if (event.type === 'create' && event.data.room_id === selectedRoom.id) {
          setMessages(prev => [...prev, event.data]);
          scrollToBottom();
          if (event.data.sender_id !== user.id) {
            markAsRead();
          }
        }
      });

      return unsubscribe;
    }
  }, [selectedRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadData = async () => {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      base44.auth.redirectToLogin();
      return;
    }

    const currentUser = await base44.auth.me();
    setUser(currentUser);

    // Load or create chat rooms
    const userRooms = await base44.entities.ChatRoom.filter({ student_email: currentUser.email });
    
    if (userRooms.length === 0) {
      // Create a new room with the teacher
      const newRoom = await base44.entities.ChatRoom.create({
        student_id: currentUser.id,
        student_email: currentUser.email,
        student_name: currentUser.full_name,
        last_message: 'Nova conversa',
        last_message_at: new Date().toISOString()
      });
      setRooms([newRoom]);
      setSelectedRoom(newRoom);
    } else {
      setRooms(userRooms);
      setSelectedRoom(userRooms[0]);
    }

    setLoading(false);
  };

  const loadMessages = async () => {
    if (!selectedRoom) return;
    const roomMessages = await base44.entities.ChatMessage.filter(
      { room_id: selectedRoom.id },
      'created_date'
    );
    setMessages(roomMessages);
  };

  const markAsRead = async () => {
    if (!selectedRoom || !user) return;
    await base44.entities.ChatRoom.update(selectedRoom.id, {
      unread_count_student: 0
    });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom) return;

    try {
      await base44.entities.ChatMessage.create({
        room_id: selectedRoom.id,
        sender_id: user.id,
        sender_email: user.email,
        sender_name: user.full_name,
        sender_role: 'student',
        message: newMessage,
        is_read: false
      });

      await base44.entities.ChatRoom.update(selectedRoom.id, {
        last_message: newMessage,
        last_message_at: new Date().toISOString(),
        unread_count_teacher: (selectedRoom.unread_count_teacher || 0) + 1
      });

      setNewMessage('');
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-8 h-8" />
            <div>
              <h1 className="text-3xl font-bold">Chat com Professor</h1>
              <p className="text-blue-100 mt-1">Tire suas dúvidas em tempo real</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Conversa com Professor
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">Nenhuma mensagem ainda. Envie a primeira!</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isOwn = msg.sender_id === user.id;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${isOwn ? 'bg-[#1e3a5f] text-white' : 'bg-slate-100 text-slate-800'} rounded-lg p-3`}>
                        <p className="text-sm font-medium mb-1">{msg.sender_name}</p>
                        <p className="text-sm">{msg.message}</p>
                        <p className={`text-xs mt-1 ${isOwn ? 'text-blue-200' : 'text-slate-500'}`}>
                          {format(new Date(msg.created_date), 'HH:mm', { locale: ptBR })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t p-4">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="flex-1"
                />
                <Button type="submit" disabled={!newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}