import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

export default function TaskDialog({ open, onClose, listId, task, onSave, boardCreator, userEmail }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    students: [],
    due_date: '',
    labels: '',
    priority: 'medium'
  });
  const [users, setUsers] = useState([]);
  const [classStudents, setClassStudents] = useState([]);

  useEffect(() => {
    if (open) {
      loadUsers();
      if (task) {
        setFormData({
          title: task.title,
          description: task.description || '',
          assigned_to: task.assigned_to || '',
          students: task.students || [],
          due_date: task.due_date ? task.due_date.split('T')[0] : '',
          labels: task.labels?.join(', ') || '',
          priority: task.priority || 'medium'
        });
      } else {
        setFormData({
          title: '',
          description: '',
          assigned_to: '',
          students: [],
          due_date: '',
          labels: '',
          priority: 'medium'
        });
      }
    }
  }, [open, task]);

  const loadUsers = async () => {
    try {
      // Obter o board_id da lista atual
      const lists = await base44.entities.BoardList.list();
      const currentList = lists.find(l => l.id === listId);
      
      if (!currentList) {
        setUsers([]);
        return;
      }
      
      // Carregar membros do quadro
      const boardMembers = await base44.entities.BoardMember.filter({ board_id: currentList.board_id });
      
      if (boardMembers.length === 0) {
        setUsers([]);
        return;
      }
      
      // Criar objetos de usuário a partir dos membros
      const memberUsers = boardMembers.map(member => ({
        id: member.user_email,
        email: member.user_email,
        full_name: member.user_name
      }));
      
      setUsers(memberUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const labelsArray = formData.labels
        .split(',')
        .map(l => l.trim())
        .filter(l => l);

      const data = {
        list_id: listId,
        title: formData.title,
        description: formData.description || null,
        assigned_to: formData.assigned_to || null,
        students: formData.students,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
        labels: labelsArray,
        priority: formData.priority
      };

      if (task) {
        await base44.entities.BoardTask.update(task.id, data);
      } else {
        await base44.entities.BoardTask.create(data);
      }

      onSave();
      onClose();
    } catch (error) {
      alert('Erro ao salvar tarefa: ' + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label>Título *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label>Prioridade</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data de Vencimento</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Atribuir Membros do Quadro</Label>
            <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto bg-slate-50">
              {users.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-2">
                  Nenhum membro no quadro. Adicione membros primeiro no botão "Membros".
                </p>
              ) : (
                users.map(u => (
                  <div key={u.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`student-${u.id}`}
                      checked={formData.students.includes(u.email)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, students: [...formData.students, u.email] });
                        } else {
                          setFormData({ ...formData, students: formData.students.filter(s => s !== u.email) });
                        }
                      }}
                      className="w-4 h-4 text-[#1e3a5f] border-gray-300 rounded focus:ring-[#1e3a5f]"
                    />
                    <label htmlFor={`student-${u.id}`} className="text-sm cursor-pointer flex-1">
                      {u.full_name}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <Label>Labels (separadas por vírgula)</Label>
            <Input
              value={formData.labels}
              onChange={(e) => setFormData({ ...formData, labels: e.target.value })}
              placeholder="bug, feature, urgente"
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2d4a6f]">
              {task ? 'Atualizar' : 'Criar Tarefa'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}