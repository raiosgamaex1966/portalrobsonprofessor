import React, { useState, useEffect, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { MessageSquare, Send, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { motion } from 'framer-motion';

export default function AdminChat() {
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
      base44.auth.redirectToLogin(createPageUrl('Admin'));
      return;
    }

    const currentUser = await base44.auth.me();
    if (currentUser?.role !== 'admin') {
      window.location.href = createPageUrl('Home');
      return;
    }

    setUser(currentUser);

    const allRooms = await base44.entities.ChatRoom.list('-last_message_at');
    setRooms(allRooms);
    if (allRooms.length > 0) {
      setSelectedRoom(allRooms[0]);
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
      unread_count_teacher: 0
    });
    setRooms(rooms.map(r => r.id === selectedRoom.id ? { ...r, unread_count_teacher: 0 } : r));
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
        sender_role: 'teacher',
        message: newMessage,
        is_read: false
      });

      await base44.entities.ChatRoom.update(selectedRoom.id, {
        last_message: newMessage,
        last_message_at: new Date().toISOString(),
        unread_count_student: (selectedRoom.unread_count_student || 0) + 1,
        teacher_id: user.id,
        teacher_email: user.email,
        teacher_name: user.full_name
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
          <Link to={createPageUrl('Admin')} className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Painel
          </Link>
          <div className="flex items-center gap-3">
            <MessageSquare className="w-8 h-8" />
            <div>
              <h1 className="text-3xl font-bold">Chat com Alunos</h1>
              <p className="text-blue-100 mt-1">Responda às dúvidas dos alunos em tempo real</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Rooms List */}
          <Card className="lg:col-span-1 h-[600px] overflow-y-auto">
            <CardContent className="p-4 space-y-2">
              {rooms.length === 0 ? (
                <p className="text-center py-8 text-slate-500">Nenhuma conversa ainda</p>
              ) : (
                rooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedRoom?.id === room.id ? 'bg-[#1e3a5f] text-white' : 'bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-sm">{room.student_name}</p>
                      {room.unread_count_teacher > 0 && (
                        <Badge className="bg-red-500 text-white">{room.unread_count_teacher}</Badge>
                      )}
                    </div>
                    <p className={`text-xs truncate ${selectedRoom?.id === room.id ? 'text-blue-200' : 'text-slate-500'}`}>
                      {room.last_message}
                    </p>
                    {room.last_message_at && (
                      <p className={`text-xs mt-1 ${selectedRoom?.id === room.id ? 'text-blue-200' : 'text-slate-400'}`}>
                        {format(new Date(room.last_message_at), "dd/MM HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2 h-[600px] flex flex-col">
            <CardContent className="flex-1 flex flex-col p-0">
              {selectedRoom ? (
                <>
                  <div className="border-b p-4">
                    <h3 className="font-bold text-lg">{selectedRoom.student_name}</h3>
                    <p className="text-sm text-slate-500">{selectedRoom.student_email}</p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-500">Nenhuma mensagem ainda</p>
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
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-slate-500">Selecione uma conversa</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}