import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Trello, Plus, Edit, Trash2, ArrowLeft, Eye } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminBoards() {
  const [user, setUser] = useState(null);
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    background_color: '#1e3a5f',
    is_public: false,
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        window.location.replace(createPageUrl('Home'));
        return;
      }

      const currentUser = await base44.auth.me();
      if (!currentUser || currentUser.role !== 'admin') {
        window.location.replace(createPageUrl('Home'));
        return;
      }

      setUser(currentUser);
      await loadBoards();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBoards = async () => {
    const allBoards = await base44.entities.Board.list('-created_date');
    setBoards(allBoards);
  };

  const handleOpenDialog = (board = null) => {
    if (board) {
      setEditingBoard(board);
      setFormData({
        name: board.name,
        description: board.description || '',
        background_color: board.background_color || '#1e3a5f',
        is_public: board.is_public !== false,
        is_active: board.is_active !== false
      });
    } else {
      setEditingBoard(null);
      setFormData({
        name: '',
        description: '',
        background_color: '#1e3a5f',
        is_public: false,
        is_active: true
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBoard) {
        await base44.entities.Board.update(editingBoard.id, formData);
      } else {
        await base44.entities.Board.create(formData);
      }
      setDialogOpen(false);
      loadBoards();
    } catch (error) {
      alert('Erro ao salvar quadro: ' + error.message);
    }
  };

  const handleDelete = async (boardId) => {
    if (!confirm('Deseja realmente excluir este quadro e todas as suas listas/tarefas?')) return;
    
    try {
      const lists = await base44.entities.BoardList.filter({ board_id: boardId });
      for (const list of lists) {
        const tasks = await base44.entities.BoardTask.filter({ list_id: list.id });
        for (const task of tasks) {
          await base44.entities.BoardTask.delete(task.id);
        }
        await base44.entities.BoardList.delete(list.id);
      }
      await base44.entities.Board.delete(boardId);
      loadBoards();
    } catch (error) {
      alert('Erro ao excluir: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-slate-600">Acesso restrito a administradores.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <Link to={createPageUrl('Admin')} className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Painel
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Gerenciar Quadros</h1>
              <p className="text-blue-200">Quadros de tarefas estilo Trello</p>
            </div>
            <Button onClick={() => handleOpenDialog()} className="bg-[#d4a853] hover:bg-[#c49743] text-[#1e3a5f]">
              <Plus className="w-4 h-4 mr-2" />
              Novo Quadro
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {boards.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Trello className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">Nenhum quadro cadastrado ainda.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {boards.map((board, index) => (
              <motion.div
                key={board.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <div 
                    className="h-32 rounded-t-xl flex items-center justify-center"
                    style={{ backgroundColor: board.background_color || '#1e3a5f' }}
                  >
                    <Trello className="w-12 h-12 text-white/50" />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-lg">{board.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {board.description && (
                      <p className="text-sm text-slate-600 line-clamp-2">{board.description}</p>
                    )}
                    
                    <div className="flex gap-2 text-xs">
                      {board.is_public && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded">Público</span>
                      )}
                      {!board.is_active && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded">Inativo</span>
                      )}
                    </div>

                    <div className="flex gap-2 pt-3 border-t">
                      <Link to={createPageUrl('BoardView') + `?id=${board.id}`} className="flex-1">
                        <Button variant="outline" className="w-full" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          Abrir
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm" onClick={() => handleOpenDialog(board)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(board.id)} className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingBoard ? 'Editar Quadro' : 'Novo Quadro'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

            <div>
              <Label>Cor de Fundo</Label>
              <Input
                type="color"
                value={formData.background_color}
                onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
              />
              <Label htmlFor="is_public" className="cursor-pointer">
                Quadro público (visível para todos os alunos)
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Quadro ativo
              </Label>
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2d4a6f]">
                {editingBoard ? 'Atualizar' : 'Criar Quadro'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}