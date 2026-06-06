import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Trash2, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

export default function MembersDialog({ open, onClose, boardId, onUpdate }) {
  const [members, setMembers] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [loading, setLoading] = useState(true);
  const [lists, setLists] = useState([]);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, boardId]);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      const allMembers = await base44.entities.BoardMember.filter({ board_id: boardId });
      
      // Carregar listas do quadro
      const boardLists = await base44.entities.BoardList.filter({ board_id: boardId });
      const sortedLists = boardLists.sort((a, b) => (a.order || 0) - (b.order || 0));
      setLists(sortedLists);
      
      // Carregar alunos da mesma turma
      const allClassStudents = await base44.entities.ClassStudent.list();
      const userClassStudents = allClassStudents.filter(cs => cs.student_email === currentUser.email);
      const classIds = userClassStudents.map(cs => cs.class_id);
      
      let studentsInClass = [];
      if (classIds.length > 0) {
        studentsInClass = allClassStudents.filter(cs => classIds.includes(cs.class_id));
      }
      
      // Criar objetos de usuário a partir dos dados de ClassStudent
      const uniqueEmails = [...new Set(studentsInClass.map(s => s.student_email))];
      const allUsers = uniqueEmails.map(email => {
        const student = studentsInClass.find(s => s.student_email === email);
        return {
          id: student.user_id,
          email: email,
          full_name: student.student_name
        };
      });
      
      setMembers(allMembers);
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUser) return;
    
    try {
      const user = users.find(u => u.email === selectedUser);
      await base44.entities.BoardMember.create({
        board_id: boardId,
        user_email: user.email,
        user_name: user.full_name,
        role: 'member'
      });
      setSelectedUser('');
      loadData();
      onUpdate();
    } catch (error) {
      alert('Erro ao adicionar membro: ' + error.message);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Deseja remover este membro do quadro?')) return;
    
    try {
      await base44.entities.BoardMember.delete(memberId);
      loadData();
      onUpdate();
    } catch (error) {
      alert('Erro ao remover membro: ' + error.message);
    }
  };

  const availableUsers = users.filter(u => !members.find(m => m.user_email === u.email));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Membros do Quadro</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Add Member */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um aluno" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map(u => (
                    <SelectItem key={u.id} value={u.email}>
                      {u.full_name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddMember} disabled={!selectedUser}>
              <UserPlus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>

          {/* Board Lists Info */}
          {lists.length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Listas do Quadro:</h4>
                <div className="flex flex-wrap gap-2">
                  {lists.map(list => (
                    <div key={list.id} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {list.name}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  Os membros adicionados terão acesso a todas estas listas
                </p>
              </CardContent>
            </Card>
          )}

          {/* Members List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {loading ? (
              <p className="text-center text-slate-500 py-8">Carregando...</p>
            ) : members.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <User className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500">Nenhum membro adicionado ainda.</p>
                </CardContent>
              </Card>
            ) : (
              members.map(member => (
                <Card key={member.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">{member.user_name}</p>
                          <p className="text-sm text-slate-500">{member.user_email}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}