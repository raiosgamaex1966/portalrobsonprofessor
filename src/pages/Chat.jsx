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
    try {
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
    } catch (error) {
      console.error('Error loading chat data:', error);
      toast.error('Erro ao carregar o chat: ' + (error.message || 'Erro na conexão com o servidor.'));
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!selectedRoom) return;
    try {
      const roomMessages = await base44.entities.ChatMessage.filter(
        { room_id: selectedRoom.id },
        'created_date'
      );
      setMessages(roomMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Erro ao carregar mensagens.');
    }
  };

  const markAsRead = async () => {
    if (!selectedRoom || !user) return;
    try {
      await base44.entities.ChatRoom.update(selectedRoom.id, {
        unread_count_student: 0
      });
    } catch (error) {
      console.warn('Error marking messages as read:', error);
    }
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
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Salas Sidebar */}
          <Card className="lg:col-span-1 h-[600px] overflow-y-auto">
            <CardHeader className="border-b p-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-[#1e3a5f]" />
                Canais de Conversa
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {rooms.length === 0 ? (
                <p className="text-center py-8 text-slate-500 text-sm">Nenhuma conversa ativada</p>
              ) : (
                rooms.map((room) => {
                  const isSelected = selectedRoom?.id === room.id;
                  return (
                    <div
                      key={room.id}
                      onClick={() => setSelectedRoom(room)}
                      className={`p-3 rounded-xl cursor-pointer transition-all border ${
                        isSelected 
                          ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' 
                          : 'bg-white hover:bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                        <span className="font-bold text-xs sm:text-sm truncate">
                          {room.is_group ? room.student_name : 'Dúvidas com Professor'}
                        </span>
                        {room.is_group && (
                          <Badge className="bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[9px] py-0 px-1.5 rounded-full font-semibold">
                            Grupo
                          </Badge>
                        )}
                      </div>
                      <p className={`text-xs truncate ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>
                        {room.last_message || 'Clique para ver a conversa'}
                      </p>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Área do Chat */}
          <Card className="lg:col-span-2 h-[600px] flex flex-col">
            <CardContent className="flex-1 flex flex-col p-0 h-full">
              {selectedRoom ? (
                <>
                  <div className="border-b p-4 bg-[#1e3a5f]/5 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-base text-slate-800">
                        {selectedRoom.is_group ? selectedRoom.student_name : 'Conversa Direta com Professor'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {selectedRoom.is_group ? 'Canal de debate público' : 'Mensagens diretas privadas'}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[420px]">
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
                            <div className={`max-w-[75%] ${isOwn ? 'bg-[#1e3a5f] text-white' : 'bg-slate-100 text-slate-800'} rounded-2xl px-4 py-2.5 shadow-sm`}>
                              {!isOwn && (
                                <p className="text-[10px] font-bold text-amber-600 mb-0.5">
                                  {msg.sender_name}
                                </p>
                              )}
                              <p className="text-sm leading-relaxed">{msg.message}</p>
                              <p className={`text-[9px] mt-1 text-right ${isOwn ? 'text-blue-200' : 'text-slate-400'}`}>
                                {format(new Date(msg.created_date), 'HH:mm', { locale: ptBR })}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Área de Input */}
                  <div className="border-t p-4 mt-auto">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        className="flex-1 rounded-xl"
                      />
                      <Button type="submit" disabled={!newMessage.trim()} className="bg-[#1e3a5f] hover:bg-[#2d4a6f] rounded-xl px-4">
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