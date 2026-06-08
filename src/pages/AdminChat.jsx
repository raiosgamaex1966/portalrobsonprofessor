import React, { useState, useEffect, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { MessageSquare, Send, ArrowLeft, Plus, Users, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function AdminChat() {
  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Group chat states
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);

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
    try {
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
      if (allRooms.length > 0 && !selectedRoom) {
        setSelectedRoom(allRooms[0]);
      }

      // Load students list for group creation
      const usersList = await base44.entities.User.list();
      setAllUsers((usersList || []).filter(u => u.role === 'user'));
    } catch (error) {
      console.error('Error loading admin chat data:', error);
      toast.error('Erro ao carregar dados do chat.');
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
    }
  };

  const markAsRead = async () => {
    if (!selectedRoom || !user) return;
    try {
      await base44.entities.ChatRoom.update(selectedRoom.id, {
        unread_count_teacher: 0
      });
      setRooms(rooms.map(r => r.id === selectedRoom.id ? { ...r, unread_count_teacher: 0 } : r));
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

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Informe o nome do grupo.');
      return;
    }
    if (selectedMembers.length === 0) {
      toast.error('Selecione pelo menos um aluno para o grupo.');
      return;
    }

    try {
      setLoading(true);
      // 1. Criar sala de grupo
      const newRoom = await base44.entities.ChatRoom.create({
        title: groupName.trim(),
        is_group: true
      });

      // 2. Vincular alunos selecionados como membros
      await Promise.all(selectedMembers.map(userId => 
        base44.entities.ChatRoomMember.create({
          room_id: newRoom.id,
          user_id: userId
        })
      ));

      // 3. Vincular professor como membro
      await base44.entities.ChatRoomMember.create({
        room_id: newRoom.id,
        user_id: user.id
      });

      toast.success('Grupo de chat criado com sucesso!');
      setShowCreateGroup(false);
      setGroupName('');
      setSelectedMembers([]);
      await loadData();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao criar o grupo.');
      setLoading(false);
    }
  };

  const toggleMemberSelection = (userId) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== userId));
    } else {
      setSelectedMembers([...selectedMembers, userId]);
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
          <Card className="lg:col-span-1 h-[600px] flex flex-col">
            <CardHeader className="border-b p-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-[#1e3a5f]" />
                Conversas
              </CardTitle>
              <Button 
                onClick={() => setShowCreateGroup(true)}
                size="sm"
                className="bg-[#1e3a5f] hover:bg-[#2d4a6f] text-xs px-2.5 h-8 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Novo Grupo
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-2 flex-1 overflow-y-auto">
              {rooms.length === 0 ? (
                <p className="text-center py-8 text-slate-500 text-sm">Nenhuma conversa ainda</p>
              ) : (
                rooms.map((room) => {
                  const isSelected = selectedRoom?.id === room.id;
                  return (
                    <div
                      key={room.id}
                      onClick={() => setSelectedRoom(room)}
                      className={`p-3 rounded-xl cursor-pointer border transition-all ${
                        isSelected 
                          ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' 
                          : 'bg-white hover:bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                        <p className="font-bold text-xs sm:text-sm truncate">{room.student_name}</p>
                        <div className="flex items-center gap-1.5">
                          {room.is_group && (
                            <Badge className="bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[9px] py-0 px-1.5 rounded-full font-semibold">
                              Grupo
                            </Badge>
                          )}
                          {room.unread_count_teacher > 0 && (
                            <Badge className="bg-red-500 text-white text-[10px] h-5 min-w-5 flex items-center justify-center rounded-full">
                              {room.unread_count_teacher}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className={`text-xs truncate ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>
                        {room.last_message || 'Nova conversa'}
                      </p>
                      {room.last_message_at && (
                        <p className={`text-[10px] mt-1 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                          {format(new Date(room.last_message_at), "dd/MM HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2 h-[600px] flex flex-col">
            <CardContent className="flex-1 flex flex-col p-0 h-full">
              {selectedRoom ? (
                <>
                  <div className="border-b p-4 bg-[#1e3a5f]/5 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-base text-slate-800">{selectedRoom.student_name}</h3>
                      <p className="text-xs text-slate-500">
                        {selectedRoom.is_group ? 'Chat de Grupo' : selectedRoom.student_email}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[420px]">
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

      {/* Modal Criar Grupo */}
      <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Grupo de Chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <Label htmlFor="grp-name">Nome do Grupo</Label>
              <Input
                id="grp-name"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="Ex: Grupo Radiologia 2026"
                className="mt-1.5"
              />
            </div>
            
            <div>
              <Label className="mb-2 block">Selecionar Alunos Participantes</Label>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-slate-50/50">
                {allUsers.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">Nenhum aluno cadastrado no sistema.</p>
                ) : (
                  allUsers.map((u) => {
                    const isSelected = selectedMembers.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleMemberSelection(u.id)}
                        className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors text-sm font-semibold ${
                          isSelected ? 'bg-blue-50 border border-blue-200 text-blue-700' : 'hover:bg-slate-100 border border-transparent text-slate-700'
                        }`}
                      >
                        <div>
                          <p>{u.full_name}</p>
                          <p className="text-[10px] text-slate-400 font-normal">{u.email}</p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Button variant="outline" onClick={() => setShowCreateGroup(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button onClick={handleCreateGroup} className="bg-[#1e3a5f] hover:bg-[#2d4a6f] rounded-xl">
                Criar Grupo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}